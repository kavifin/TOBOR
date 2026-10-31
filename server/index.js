import 'dotenv/config'
import express from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import crypto from 'node:crypto'
import { store } from './store.js'
import { notifyCustomer } from './notify.js'
import { createPayment, verifyPayment, paymentsLive } from './payments.js'
import { stlVolumeCm3 } from './stl.js'
import { sendEnquiryEmails, mailLive, mailProvider } from './mail.js'
import { productById } from '../shared/products.js'
import { estimatePart, orderTotals, byId, MATERIALS, COLORS, QUALITIES, SHIPPING, PAYMENT_METHODS } from '../shared/pricing.js'

const isProd = process.env.NODE_ENV === 'production'
// In development Vite owns PORT (5173) and proxies /api here; in production this server serves everything.
const PORT = Number(process.env.API_PORT || (isProd && process.env.PORT) || 5174)
const ADMIN_KEY = process.env.ADMIN_KEY || (isProd ? null : 'tobor-admin')
const UPLOADS = path.resolve('server/uploads')
for (const dir of ['photos', 'models', 'samples']) fs.mkdirSync(path.join(UPLOADS, dir), { recursive: true })

const app = express()
app.use(express.json({ limit: '1mb' }))

// ---------- uploads ----------
const IMAGE_TYPES = /^image\/(jpeg|png|webp|heic|heif)$/
const MODEL_EXT = /\.(stl|obj|3mf|step|stp)$/i
const storageFor = (dir) =>
  multer.diskStorage({
    destination: path.join(UPLOADS, dir),
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname).toLowerCase()),
  })
const photoUpload = multer({
  storage: storageFor('photos'),
  limits: { fileSize: 15 * 1024 * 1024, files: 6 },
  fileFilter: (_req, f, cb) => cb(IMAGE_TYPES.test(f.mimetype) ? null : new Error('Photos must be JPG, PNG, WEBP or HEIC.'), true),
})
const modelUpload = (dir) =>
  multer({
    storage: storageFor(dir),
    limits: { fileSize: 100 * 1024 * 1024, files: 1 },
    fileFilter: (_req, f, cb) => cb(MODEL_EXT.test(f.originalname) ? null : new Error('Model files must be STL, OBJ, 3MF or STEP.'), true),
  })

// ---------- helpers ----------
const now = () => new Date().toISOString()
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max)
const phoneOk = (p) => /^\+?\d{10,13}$/.test(p.replace(/[\s-]/g, ''))
const fail = (res, status, message) => res.status(status).json({ error: message })

function lanUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL
  // Skip virtual adapters (WSL, Hyper-V, Docker, VirtualBox) so phones get the real Wi-Fi/LAN address.
  const ip = Object.entries(os.networkInterfaces())
    .filter(([name]) => !/vethernet|wsl|docker|virtualbox|vmware|loopback/i.test(name))
    .flatMap(([, list]) => list)
    .find((i) => i?.family === 'IPv4' && !i.internal)?.address
  return ip ? `http://${ip}:${isProd ? PORT : 5173}` : null
}

function publicView(r) {
  return {
    id: r.id,
    type: r.type,
    status: r.status,
    createdAt: r.createdAt,
    history: r.history,
    firstName: r.customer?.name?.split(' ')[0],
    items: r.items,
    totals: r.totals,
    details: r.details,
    quote: r.quote,
    shipment: r.shipment,
    payment: r.payment && { method: r.payment.method, status: r.payment.status },
  }
}

async function setStatus(record, status, extra = {}) {
  record.history.push({ status, at: now(), ...(extra.note ? { note: extra.note } : {}) })
  await store.update(record, { status, ...extra.patch })
  if (!extra.silent) await notifyCustomer(record, status)
}

// ---------- public API ----------
app.get('/api/config', (_req, res) => res.json({ paymentsLive, lanUrl: lanUrl() }))

app.post('/api/requests', photoUpload.array('photos', 6), async (req, res) => {
  const b = req.body
  const customer = { name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120) }
  if (!customer.name) return fail(res, 400, 'Add your name so we know who to reply to.')
  if (!phoneOk(customer.phone)) return fail(res, 400, 'Enter a 10-digit mobile number with WhatsApp.')
  if (!req.files?.length) return fail(res, 400, 'Add at least one photo of the object.')
  const record = {
    id: store.nextId('request'),
    type: 'photo',
    status: 'received',
    createdAt: now(),
    customer,
    details: {
      notes: clean(b.notes, 2000),
      size: clean(b.size, 80),
      qty: Math.max(1, Math.min(10000, parseInt(b.qty) || 1)),
      material: byId(MATERIALS, b.material)?.name ?? 'Not sure',
      source: b.source === 'qr' ? 'Phone (QR)' : 'Website',
    },
    photos: req.files.map((f) => f.filename),
    history: [{ status: 'received', at: now() }],
  }
  await store.insert('requests', record)
  await notifyCustomer(record, 'received')
  res.status(201).json({ id: record.id })
})

app.post('/api/uploads/model', modelUpload('models').single('model'), (req, res) => {
  if (!req.file) return fail(res, 400, 'Choose a model file to upload.')
  const isStl = /\.stl$/i.test(req.file.filename)
  res.status(201).json({ fileId: req.file.filename, volumeCm3: isStl ? stlVolumeCm3(req.file.path) : null })
})

function resolveLine(item) {
  const qty = Math.max(1, Math.min(1000, parseInt(item.qty) || 1))
  if (item.kind === 'product') {
    const p = productById(item.productId)
    if (!p) throw new Error('One of the products in your cart is no longer available.')
    const color = p.colors.includes(item.color) ? item.color : p.color
    return { kind: 'product', productId: p.id, name: p.name, color: byId(COLORS, color).name, qty, unitPrice: p.price }
  }
  if (item.kind === 'print') {
    const fileId = clean(item.fileId, 80)
    const filePath = path.join(UPLOADS, 'models', path.basename(fileId))
    if (!fileId || !fs.existsSync(filePath)) throw new Error('A custom print file is missing. Upload it again from the quote page.')
    const verified = /\.stl$/i.test(fileId) ? stlVolumeCm3(filePath) : null
    const volumeCm3 = verified ?? Math.max(0.5, Number(item.volumeCm3) || 0)
    const cfg = {
      material: byId(MATERIALS, item.material)?.id ?? 'pla-plus',
      quality: byId(QUALITIES, item.quality)?.id ?? 'standard',
      infill: Math.max(10, Math.min(100, parseInt(item.infill) || 20)),
    }
    const est = estimatePart({ volumeCm3, ...cfg, qty })
    return {
      kind: 'print', fileId, name: clean(item.name, 120), qty, volumeCm3: Math.round(volumeCm3 * 10) / 10,
      material: byId(MATERIALS, cfg.material).name, quality: byId(QUALITIES, cfg.quality).name, infill: cfg.infill,
      color: byId(COLORS, item.color)?.name ?? 'Black',
      unitPrice: est.unit, needsReview: !verified,
    }
  }
  throw new Error('Unknown cart item.')
}

app.post('/api/orders', async (req, res) => {
  const { items = [], customer = {}, address = {}, shipping, payment } = req.body
  if (!items.length) return fail(res, 400, 'Your cart is empty.')
  let lines
  try {
    lines = items.slice(0, 50).map(resolveLine)
  } catch (err) {
    return fail(res, 400, err.message)
  }
  const c = { name: clean(customer.name, 80), phone: clean(customer.phone, 20), email: clean(customer.email, 120) }
  const a = { line1: clean(address.line1, 200), line2: clean(address.line2, 200), city: clean(address.city, 80), state: clean(address.state, 80), pin: clean(address.pin, 6) }
  if (!c.name || !phoneOk(c.phone)) return fail(res, 400, 'Add your name and a 10-digit mobile number.')
  if (!a.line1 || !a.city || !a.state || !/^\d{6}$/.test(a.pin)) return fail(res, 400, 'Complete the delivery address with a 6-digit PIN code.')
  const ship = byId(SHIPPING, shipping)?.id ?? 'standard'
  const pay = byId(PAYMENT_METHODS, payment)?.id ?? 'upi'
  const totals = orderTotals(lines, ship, pay)
  const cod = pay === 'cod'
  const record = {
    id: store.nextId('order'),
    type: 'order',
    status: cod ? 'paid' : 'placed',
    createdAt: now(),
    customer: c,
    address: a,
    items: lines,
    shipping: ship,
    totals,
    payment: { method: pay, status: cod ? 'cash on delivery' : 'pending' },
    history: [{ status: cod ? 'paid' : 'placed', at: now(), ...(cod ? { note: 'Cash on delivery' } : {}) }],
  }
  await store.insert('orders', record)
  if (cod) await notifyCustomer(record, 'paid')
  res.status(201).json({ id: record.id, total: totals.total, needsPayment: !cod })
})

app.post('/api/pay/:id', async (req, res) => {
  const r = store.findAny(req.params.id)
  if (!r) return fail(res, 404, 'We could not find that order.')
  const amount = r.type === 'order' ? (r.status === 'placed' ? r.totals.total : null) : r.status === 'quoted' ? r.quote?.amount : null
  if (!amount) return fail(res, 409, 'This order does not need a payment right now.')
  try {
    const p = await createPayment(r, amount)
    await store.update(r, { payment: { ...(r.payment ?? { method: 'online' }), status: 'pending', providerOrderId: p.providerOrderId } })
    res.json({ ...p, name: r.customer.name, email: r.customer.email, phone: r.customer.phone })
  } catch (err) {
    fail(res, 502, err.message)
  }
})

app.post('/api/pay/:id/verify', async (req, res) => {
  const r = store.findAny(req.params.id)
  if (!r || r.payment?.providerOrderId !== req.body.providerOrderId) return fail(res, 400, 'Payment details do not match this order.')
  if (!verifyPayment(req.body)) return fail(res, 400, 'We could not confirm this payment. If money left your account, message us on WhatsApp.')
  const amount = r.type === 'order' ? r.totals.total : r.quote.amount
  await setStatus(r, 'paid', { patch: { payment: { ...r.payment, status: 'paid', paymentId: clean(req.body.paymentId, 80), amount, paidAt: now() } } })
  res.json({ ok: true })
})

function findForCustomer(req, res) {
  const r = store.findAny(clean(req.params.id, 20).toUpperCase())
  const last4 = clean(req.query.phone ?? req.body?.phone, 20).replace(/\D/g, '').slice(-4)
  if (!r || last4.length < 4 || !r.customer.phone.replace(/\D/g, '').endsWith(last4)) {
    fail(res, 404, 'No order matches that ID and phone number. Check both and try again.')
    return null
  }
  return r
}

app.get('/api/track/:id', (req, res) => {
  const r = findForCustomer(req, res)
  if (r) res.json(publicView(r))
})

app.post('/api/track/:id/changes', async (req, res) => {
  const r = findForCustomer(req, res)
  if (!r) return
  if (r.status !== 'quoted') return fail(res, 409, 'Changes can only be requested while a quote is waiting for approval.')
  const message = clean(req.body.message, 2000)
  if (!message) return fail(res, 400, 'Tell us what to change in the sample.')
  await setStatus(r, 'modelling', { note: `Changes requested: ${message}`, silent: true })
  res.json(publicView(r))
})

// A few enquiries per visitor per 10 minutes is plenty; this keeps the inbox safe from floods.
const enquiryHits = new Map()
function tooManyEnquiries(ip) {
  const cutoff = Date.now() - 10 * 60 * 1000
  const hits = (enquiryHits.get(ip) ?? []).filter((t) => t > cutoff)
  hits.push(Date.now())
  enquiryHits.set(ip, hits)
  return hits.length > 5
}

app.post('/api/enquiries', async (req, res) => {
  // `company` is a hidden field only bots fill in: pretend it worked and drop it
  if (clean(req.body.company, 100)) return res.status(201).json({ ok: true, emailed: false })
  if (tooManyEnquiries(req.ip)) return fail(res, 429, 'You’ve sent a few messages already. Please wait a few minutes, or reach us on WhatsApp.')
  const e = {
    id: crypto.randomUUID().slice(0, 8),
    name: clean(req.body.name, 80),
    email: clean(req.body.email, 120).toLowerCase(),
    phone: clean(req.body.phone, 20),
    topic: clean(req.body.topic, 60) || 'Something else',
    message: clean(req.body.message, 2000),
    createdAt: now(),
  }
  if (!e.name || !e.message) return fail(res, 400, 'Add your name and your message.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.email)) return fail(res, 400, 'Enter a valid email address so we can reply.')
  if (e.phone && !phoneOk(e.phone)) return fail(res, 400, 'Check the phone number, or leave it empty.')
  await store.insert('enquiries', e)
  const mail = await sendEnquiryEmails(e)
  await store.update(e, { mail })
  res.status(201).json({ ok: true, emailed: mail.customer === 'sent' })
})

app.use('/files/samples', express.static(path.join(UPLOADS, 'samples'), { maxAge: '1d' }))

// ---------- team dashboard API ----------
const admin = express.Router()
admin.use((req, res, next) => {
  if (!ADMIN_KEY) return fail(res, 503, 'Set ADMIN_KEY in .env to enable the team dashboard.')
  const key = req.get('x-admin-key') ?? req.query.key
  if (!key || key.length !== ADMIN_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))) return fail(res, 401, 'Wrong team key.')
  next()
})
admin.get('/summary', (_req, res) => res.json({ ...store.data, counters: undefined }))
admin.get('/file/:folder/:name', (req, res) => {
  if (!['photos', 'models', 'samples'].includes(req.params.folder)) return fail(res, 404, 'Not found')
  res.sendFile(path.join(UPLOADS, req.params.folder, path.basename(req.params.name)))
})
admin.post('/:id/quote', modelUpload('samples').single('sample'), async (req, res) => {
  const r = store.find('requests', req.params.id)
  if (!r) return fail(res, 404, 'Request not found.')
  const amount = parseInt(req.body.amount)
  if (!(amount > 0)) return fail(res, 400, 'Enter the quote amount in rupees.')
  const quote = { amount, note: clean(req.body.note, 1000), sampleUrl: req.file ? `/files/samples/${req.file.filename}` : r.quote?.sampleUrl ?? null, sentAt: now() }
  await setStatus(r, 'quoted', { patch: { quote } })
  res.json(r)
})
admin.post('/:id/status', async (req, res) => {
  const r = store.findAny(req.params.id)
  if (!r) return fail(res, 404, 'Not found.')
  const status = clean(req.body.status, 20)
  const allowed = ['modelling', 'paid', 'printing', 'printed', 'shipped', 'delivered']
  if (!allowed.includes(status)) return fail(res, 400, 'Unknown status.')
  const patch = status === 'shipped' ? { shipment: { courier: clean(req.body.courier, 60) || 'Courier partner', awb: clean(req.body.awb, 40), trackingUrl: clean(req.body.trackingUrl, 300) } } : {}
  await setStatus(r, status, { patch, silent: status === 'modelling' })
  res.json(r)
})
app.use('/api/admin', admin)

app.use('/api', (_req, res) => fail(res, 404, 'Unknown API route.'))

// Multer and other errors → readable JSON
app.use((err, _req, res, _next) => {
  const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large. Photos up to 15 MB, models up to 100 MB.' : err.message || 'Something went wrong.'
  fail(res, 400, message)
})

// ---------- production: serve the built site ----------
const dist = path.resolve('dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '7d', index: false }))
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`TOBOR API on http://localhost:${PORT}`)
  if (!isProd && !process.env.ADMIN_KEY) console.log('Team dashboard key (dev default): tobor-admin — set ADMIN_KEY in .env')
  if (!paymentsLive) console.log('Payments in TEST MODE — add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to go live')
  console.log(mailLive ? `Enquiry emails send via ${mailProvider}` : 'Enquiry emails are LOGGED, not sent — add BREVO_API_KEY to .env to send them')
})
