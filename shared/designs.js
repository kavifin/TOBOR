// "Design your own" products: personalised prints a customer configures in the browser.
// Shared by the browser (live preview and price) and the server (authoritative price and validation).
// All money is in whole Indian rupees, GST included.
import { COLORS, byId } from './pricing.js'

/** 3D text faces: typeface.json files in public/fonts (MgOpen and Droid, free licences; see public/fonts/README.md). */
export const FONTS = [
  { id: 'block', name: 'Block', note: 'Clean and bold', file: '/fonts/helvetiker_bold.typeface.json' },
  { id: 'soft', name: 'Soft', note: 'Friendly, slightly rounded', file: '/fonts/optimer_bold.typeface.json' },
  { id: 'round', name: 'Round', note: 'Rounded, playful', file: '/fonts/droid_sans_bold.typeface.json' },
]

/** Products with text. `width` is the finished width in mm at that size; price scales with size and length. */
export const TEXT_PRODUCTS = {
  keychain: {
    id: 'keychain',
    name: 'Name keychain',
    tagline: 'Your name, two colours, a solid keyring loop.',
    maxChars: 12,
    base: 149,
    perChar: 12,
    sizes: [
      { id: 's', name: 'Small', width: 45, factor: 1 },
      { id: 'm', name: 'Medium', width: 60, factor: 1.2 },
      { id: 'l', name: 'Large', width: 75, factor: 1.45 },
    ],
    defaults: { text: 'Raghul', font: 'block', textColor: 'white', baseColor: 'green', size: 'm' },
    leadDays: '2 to 4',
  },
  stand: {
    id: 'stand',
    name: 'Desk name stand',
    tagline: 'Standing letters on a base, for a desk or a shelf.',
    maxChars: 14,
    base: 349,
    perChar: 25,
    sizes: [
      { id: 's', name: 'Small', width: 120, factor: 1 },
      { id: 'm', name: 'Medium', width: 160, factor: 1.3 },
      { id: 'l', name: 'Large', width: 200, factor: 1.6 },
    ],
    defaults: { text: 'Raghul', font: 'soft', textColor: 'blue', baseColor: 'white', size: 'm' },
    leadDays: '3 to 5',
  },
}

/** Mini-Me: a cartoon figure of a person, modelled by the team from the customer's photos. */
export const MINIME = {
  id: 'minime',
  name: 'Mini-Me',
  tagline: 'A cartoon figure of you, modelled from your photos.',
  styles: [
    { id: 'keychain', name: 'Keychain', price: 299, height: 55, note: 'About 55 mm tall, with a keyring loop' },
    { id: 'standee', name: 'Desk standee', price: 499, height: 90, note: 'About 90 mm tall on a base' },
    { id: 'magnet', name: 'Fridge magnet', price: 349, height: 60, note: 'About 60 mm tall, magnet on the back' },
  ],
  colorCounts: [
    { id: 2, name: '2 colours', note: 'Bold and graphic', extra: 0 },
    { id: 3, name: '3 colours', note: 'Balanced', extra: 50 },
    { id: 4, name: '4 colours', note: 'Most detail', extra: 100 },
  ],
  minPhotos: 1,
  maxPhotos: 3,
  defaults: { style: 'keychain', colorCount: 3, accent: 'orange', notes: '' },
  leadDays: '4 to 6',
}

export const DESIGN_PRODUCTS = [TEXT_PRODUCTS.keychain, TEXT_PRODUCTS.stand, MINIME]
export const designProductById = (id) => DESIGN_PRODUCTS.find((p) => p.id === id)

// Letters, digits, spaces and the punctuation names and short messages use. Every font ships these glyphs.
const TEXT_OK = /^[A-Za-z0-9 .,'&!?@#+\-]+$/

/**
 * Checks and normalises a design from the browser. Throws an Error with a message safe to show
 * the customer. The result is what gets priced and stored.
 */
export function normalizeDesign(input = {}) {
  const product = designProductById(input.product)
  if (!product) throw new Error('Choose a design to personalise.')
  if (product.id === 'minime') {
    const style = byId(MINIME.styles, input.style) ?? MINIME.styles[0]
    const colorCount = MINIME.colorCounts.find((c) => c.id === Number(input.colorCount)) ?? MINIME.colorCounts[1]
    const accent = byId(COLORS, input.accent) ?? byId(COLORS, MINIME.defaults.accent)
    const notes = String(input.notes ?? '').trim().slice(0, 300)
    return { product: 'minime', style: style.id, colorCount: colorCount.id, accent: accent.id, notes }
  }
  const text = String(input.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) throw new Error('Type the name or words to print.')
  if (text.length > product.maxChars) throw new Error(`Keep it to ${product.maxChars} characters for a ${product.name.toLowerCase()}.`)
  if (!TEXT_OK.test(text)) throw new Error('Use letters, numbers and simple punctuation only.')
  const font = byId(FONTS, input.font) ?? byId(FONTS, product.defaults.font)
  const textColor = byId(COLORS, input.textColor) ?? byId(COLORS, product.defaults.textColor)
  const baseColor = byId(COLORS, input.baseColor) ?? byId(COLORS, product.defaults.baseColor)
  const size = byId(product.sizes, input.size) ?? byId(product.sizes, product.defaults.size)
  return { product: product.id, text, font: font.id, textColor: textColor.id, baseColor: baseColor.id, size: size.id }
}

function bulkDiscount(qty) {
  if (qty >= 25) return 0.15
  if (qty >= 10) return 0.1
  if (qty >= 5) return 0.05
  return 0
}

/** Price for one normalised design. The unit price includes the quantity discount, so unit × qty is the total. */
export function priceDesign(design, qty = 1) {
  const product = designProductById(design.product)
  let raw
  if (design.product === 'minime') {
    raw = byId(MINIME.styles, design.style).price + MINIME.colorCounts.find((c) => c.id === design.colorCount).extra
  } else {
    const size = byId(product.sizes, design.size)
    const letters = design.text.replace(/\s/g, '').length
    raw = Math.round((product.base + product.perChar * Math.max(0, letters - 3)) * size.factor)
  }
  const discount = bulkDiscount(qty)
  const unit = Math.round(raw * (1 - discount))
  return { unit, discount, total: unit * qty }
}

/** Short human description, used in the cart, order emails and the team dashboard. */
export function describeDesign(design) {
  const product = designProductById(design.product)
  if (design.product === 'minime') {
    const style = byId(MINIME.styles, design.style)
    return `${style.name}, ${design.colorCount} colours, ${byId(COLORS, design.accent).name} accent`
  }
  const size = byId(product.sizes, design.size)
  return `${byId(FONTS, design.font).name}, ${byId(COLORS, design.textColor).name} on ${byId(COLORS, design.baseColor).name}, ${size.name} (${size.width} mm)`
}

/** Line name shown wherever the design appears, e.g. “Name keychain “Raghul””. */
export function designTitle(design) {
  const product = designProductById(design.product)
  return design.product === 'minime' ? `Mini-Me ${byId(MINIME.styles, design.style).name.toLowerCase()}` : `${product.name} “${design.text}”`
}
