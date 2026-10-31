// Pricing rules shared by the browser (instant estimates) and the server (authoritative totals).
// All money is in whole Indian rupees, GST included.

export const MATERIALS = [
  { id: 'pla', name: 'PLA', density: 1.24, perGram: 3, note: 'Everyday prints, decor, prototypes' },
  { id: 'pla-plus', name: 'PLA+', density: 1.24, perGram: 3.5, note: 'Tougher PLA, less brittle' },
  { id: 'petg', name: 'PETG', density: 1.27, perGram: 4, note: 'Outdoor use, water and heat resistant' },
  { id: 'abs', name: 'ABS', density: 1.04, perGram: 4, note: 'Enclosures and car parts, up to 95 °C' },
  { id: 'tpu', name: 'TPU (flexible)', density: 1.21, perGram: 7, note: 'Rubber-like: gaskets, grips, cases' },
  { id: 'cf-petg', name: 'Carbon fibre PETG', density: 1.3, perGram: 9, note: 'Stiff, matte, engineering parts' },
]

export const COLORS = [
  { id: 'black', name: 'Black', hex: '#1d1f24' },
  { id: 'white', name: 'White', hex: '#f2f2ee' },
  { id: 'grey', name: 'Grey', hex: '#8b9099' },
  { id: 'red', name: 'Red', hex: '#c8312a' },
  { id: 'orange', name: 'Orange', hex: '#f26a1b' },
  { id: 'yellow', name: 'Yellow', hex: '#ffb627' },
  { id: 'green', name: 'Green', hex: '#2f9e5b' },
  { id: 'blue', name: 'Blue', hex: '#2e46f2' },
  { id: 'silk-gold', name: 'Silk gold', hex: '#c9a14a' },
]

export const QUALITIES = [
  { id: 'draft', name: 'Draft', layer: 0.28, timeFactor: 0.8, note: 'Fastest, visible layers' },
  { id: 'standard', name: 'Standard', layer: 0.2, timeFactor: 1, note: 'Balanced quality' },
  { id: 'fine', name: 'Fine', layer: 0.12, timeFactor: 1.6, note: 'Smooth surfaces, small details' },
]

export const SHIPPING = [
  { id: 'standard', name: 'Standard delivery', days: '4–6 working days', price: 79, freeOver: 999 },
  { id: 'express', name: 'Express delivery', days: '1–3 working days', price: 179, freeOver: null },
]

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI', note: 'GPay, PhonePe, Paytm or any UPI app' },
  { id: 'card', name: 'Card or net banking', note: 'Visa, Mastercard, RuPay, all major banks' },
  { id: 'cod', name: 'Cash on delivery', note: '₹49 handling fee', fee: 49 },
]

const MACHINE_RATE_PER_HOUR = 60
const GRAMS_PER_HOUR = 12
const MIN_PER_PART = 149

export const byId = (list, id) => list.find((x) => x.id === id)

function qtyDiscount(qty) {
  if (qty >= 25) return 0.15
  if (qty >= 10) return 0.1
  if (qty >= 5) return 0.05
  return 0
}

/** Estimate for one custom part. volumeCm3 is the solid volume of the mesh. */
export function estimatePart({ volumeCm3, material = 'pla-plus', quality = 'standard', infill = 20, qty = 1 }) {
  const mat = byId(MATERIALS, material) ?? MATERIALS[1]
  const q = byId(QUALITIES, quality) ?? QUALITIES[1]
  const fill = Math.min(Math.max(infill, 5), 100) / 100
  // Walls and top/bottom skins are always solid; the remainder follows infill.
  const effective = volumeCm3 * Math.min(1, 0.32 + 0.68 * fill)
  const grams = effective * mat.density
  const hours = (grams / GRAMS_PER_HOUR) * q.timeFactor
  const raw = grams * mat.perGram + hours * MACHINE_RATE_PER_HOUR
  const discount = qtyDiscount(qty)
  // Discount per part, so unit price × quantity always equals the total shown.
  const unit = Math.round(Math.max(MIN_PER_PART, Math.round(raw)) * (1 - discount))
  const total = unit * qty
  return { grams: Math.round(grams), hours: Math.max(0.3, Math.round(hours * 10) / 10), unit, discount, total }
}

export function shippingCost(shippingId, subtotal) {
  const s = byId(SHIPPING, shippingId) ?? SHIPPING[0]
  if (s.freeOver && subtotal >= s.freeOver) return 0
  return s.price
}

/** lines: [{ unitPrice, qty }] already resolved against the catalog. */
export function orderTotals(lines, shippingId, paymentId) {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0)
  const shipping = lines.length ? shippingCost(shippingId, subtotal) : 0
  const fee = byId(PAYMENT_METHODS, paymentId)?.fee ?? 0
  return { subtotal, shipping, fee, total: subtotal + shipping + fee }
}
