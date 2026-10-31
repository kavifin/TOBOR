async function request(url, options = {}) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error('Could not reach TOBOR. Check your internet connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`)
  return data
}

// Where uploads go is decided by the server: straight to Vercel Blob when it is deployed there,
// otherwise to the server itself. Either way an upload returns a ref the other calls pass along.
let uploadsMode = null
const uploadsKind = () =>
  (uploadsMode ??= request('/api/config')
    .then((c) => c.uploads ?? 'local')
    .catch((err) => {
      uploadsMode = null
      throw err
    }))

async function uploadFile(file, kind, { adminKey } = {}) {
  if ((await uploadsKind()) === 'blob') {
    const { upload } = await import('@vercel/blob/client')
    const name = file.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'file'
    try {
      const blob = await upload(`${kind}/${name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/blob',
        clientPayload: JSON.stringify({ kind, type: file.type, key: adminKey }),
        multipart: file.size > 8 * 1024 * 1024,
      })
      return blob.url
    } catch (err) {
      throw new Error(String(err.message || 'The upload failed. Try again.').replace(/^Vercel Blob: /, ''))
    }
  }
  const fd = new FormData()
  fd.append('file', file)
  const res = await request(`/api/files/${kind}`, { method: 'POST', body: fd, headers: adminKey ? { 'x-admin-key': adminKey } : {} })
  return res.ref
}

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

export const api = {
  config: () => request('/api/config'),
  uploadFile,
  sendPhotoRequest: (body) => request('/api/requests', json('POST', body)),
  uploadModel: async (file) => request('/api/models/inspect', json('POST', { ref: await uploadFile(file, 'models') })),
  placeOrder: (body) => request('/api/orders', json('POST', body)),
  startPayment: (id) => request(`/api/pay/${id}`, { method: 'POST' }),
  verifyPayment: (id, body) => request(`/api/pay/${id}/verify`, json('POST', body)),
  track: (id, phone) => request(`/api/track/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`),
  requestChanges: (id, phone, message) => request(`/api/track/${encodeURIComponent(id)}/changes`, json('POST', { phone, message })),
  enquiry: (body) => request('/api/enquiries', json('POST', body)),
  admin: {
    summary: (key) => request('/api/admin/summary', { headers: { 'x-admin-key': key } }),
    quote: (key, id, body) => request(`/api/admin/${id}/quote`, json('POST', body, { 'x-admin-key': key })),
    status: (key, id, body) => request(`/api/admin/${id}/status`, json('POST', body, { 'x-admin-key': key })),
  },
}
