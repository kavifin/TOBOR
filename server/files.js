// Uploaded files: customer photos, 3D model files and the team's sample models.
// With BLOB_READ_WRITE_TOKEN set (Vercel Blob), the browser uploads straight to a private Blob store, which
// gets past Vercel's 4.5 MB request limit; the server stores the file's URL and is the only one that can read it. Without it, files go to
// server/uploads on this computer. Either way a record keeps a "ref": a Blob URL, or a local file name.
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import multer from 'multer'

export const filesKind = process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local'
const UPLOADS = path.resolve('server/uploads')
const MB = 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MODEL_EXT = /\.(stl|obj|3mf|step|stp)$/i

export const KINDS = {
  photos: { max: 15 * MB, ok: (name, type) => IMAGE_TYPES.includes(type), error: 'Photos must be JPG, PNG, WEBP or HEIC.' },
  models: { max: 100 * MB, ok: (name) => MODEL_EXT.test(name), error: 'Model files must be STL, OBJ, 3MF or STEP.' },
  samples: { max: 100 * MB, ok: (name) => MODEL_EXT.test(name), error: 'Model files must be STL, OBJ, 3MF or STEP.' },
}

const isBlobUrl = (ref) => {
  try {
    const u = new URL(ref)
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}
const localPath = (kind, ref) => path.join(UPLOADS, kind, path.basename(String(ref)))

/** Is this a Blob URL in the given folder (photos/, models/ or samples/)? */
export const blobIn = (kind, ref) => isBlobUrl(ref) && new URL(ref).pathname.startsWith(`/${kind}/`)

const getBlob = async (ref) => {
  const { get } = await import('@vercel/blob')
  try {
    const r = await get(ref, { access: 'private' })
    return r?.statusCode === 200 ? r : null
  } catch (err) {
    console.error('[blob] could not read', ref, err.message)
    return null
  }
}

/** Streams a private Blob file to the browser, through this server. */
export async function sendBlob(res, ref) {
  const r = isBlobUrl(ref) ? await getBlob(ref) : null
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.set({ 'content-type': r.blob.contentType, 'cache-control': 'private, max-age=3600' })
  Readable.fromWeb(r.stream).pipe(res)
}

/** Does this ref point at a file we stored? */
export const refOk = (kind, ref) => (isBlobUrl(ref) ? true : Boolean(ref) && !/^https?:/i.test(ref) && fs.existsSync(localPath(kind, ref)))

/** The file's bytes, from Blob storage or the local folder. */
export async function readRef(kind, ref) {
  if (isBlobUrl(ref)) {
    const r = await getBlob(ref)
    if (!r) throw Object.assign(new Error('A file is missing. Upload it again.'), { status: 400 })
    return Buffer.from(await new Response(r.stream).arrayBuffer())
  }
  if (!refOk(kind, ref)) throw new Error('A file is missing. Upload it again.')
  return fs.promises.readFile(localPath(kind, ref))
}

/** A URL the browser can open for a sample model: private Blob files are served through this server. */
export const sampleUrl = (ref) => (isBlobUrl(ref) ? `/files/sample?u=${encodeURIComponent(ref)}` : `/files/samples/${path.basename(ref)}`)

/** Local mode: multipart upload of one file into server/uploads/<kind>. */
export function localUpload(kind) {
  if (process.env.VERCEL) throw Object.assign(new Error('Uploads are not set up: connect a Vercel Blob store to this project.'), { status: 503 })
  const rule = KINDS[kind]
  const dir = path.join(UPLOADS, kind)
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir)),
      filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
    }),
    limits: { fileSize: rule.max, files: 1 },
    fileFilter: (_req, f, cb) => cb(rule.ok(f.originalname, f.mimetype) ? null : Object.assign(new Error(rule.error), { status: 400 }), true),
  }).single('file')
}

/** Local mode: serve a stored file. */
export const localFile = (kind, ref) => localPath(kind, ref)
export const samplesDir = path.join(UPLOADS, 'samples')

/** Blob mode: hand the browser a short-lived token for one upload, after checking what it is. */
export async function blobToken(req, { isAdmin }) {
  const { handleUpload } = await import('@vercel/blob/client')
  return handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      const { kind, type } = JSON.parse(clientPayload || '{}')
      const rule = KINDS[kind]
      if (!rule || !pathname.startsWith(`${kind}/`)) throw new Error('Unknown upload.')
      if (kind === 'samples' && !isAdmin(req, JSON.parse(clientPayload).key)) throw new Error('Wrong team key.')
      if (!rule.ok(pathname, type)) throw new Error(rule.error)
      return { maximumSizeInBytes: rule.max, addRandomSuffix: true, ...(kind === 'photos' ? { allowedContentTypes: IMAGE_TYPES } : {}) }
    },
    onUploadCompleted: async () => {},
  })
}
