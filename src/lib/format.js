const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const money = (n) => inr.format(Math.round(n || 0))
export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
// An id for items in a form list. Not crypto.randomUUID(): browsers only allow that on HTTPS or
// localhost, and phones testing over the Wi-Fi address (the QR code in development) use plain HTTP.
let seq = 0
export const localId = () => `${Date.now().toString(36)}-${(seq += 1)}`
export const fileSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
