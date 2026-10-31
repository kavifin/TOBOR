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

const json = (method, body, headers = {}) => ({
  method,
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

export const api = {
  config: () => request('/api/config'),
  sendPhotoRequest: (formData) => request('/api/requests', { method: 'POST', body: formData }),
  uploadModel: (file) => {
    const fd = new FormData()
    fd.append('model', file)
    return request('/api/uploads/model', { method: 'POST', body: fd })
  },
  placeOrder: (body) => request('/api/orders', json('POST', body)),
  startPayment: (id) => request(`/api/pay/${id}`, { method: 'POST' }),
  verifyPayment: (id, body) => request(`/api/pay/${id}/verify`, json('POST', body)),
  track: (id, phone) => request(`/api/track/${encodeURIComponent(id)}?phone=${encodeURIComponent(phone)}`),
  requestChanges: (id, phone, message) => request(`/api/track/${encodeURIComponent(id)}/changes`, json('POST', { phone, message })),
  enquiry: (body) => request('/api/enquiries', json('POST', body)),
  admin: {
    summary: (key) => request('/api/admin/summary', { headers: { 'x-admin-key': key } }),
    quote: (key, id, fd) => request(`/api/admin/${id}/quote`, { method: 'POST', body: fd, headers: { 'x-admin-key': key } }),
    status: (key, id, body) => request(`/api/admin/${id}/status`, json('POST', body, { 'x-admin-key': key })),
  },
}
