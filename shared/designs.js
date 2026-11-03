// "Design your own": personalised prints a customer configures in the browser.
// Shared by the browser (live preview and price) and the server (authoritative price and validation).
// All money is in whole Indian rupees, GST included.
import { COLORS, byId } from './pricing.js'

/** 3D text faces: typeface.json files in public/fonts (MgOpen and Droid, free licences; see public/fonts/README.md). */
export const FONTS = [
  { id: 'block', name: 'Block', note: 'Clean and bold', file: '/fonts/helvetiker_bold.typeface.json' },
  { id: 'soft', name: 'Soft', note: 'Friendly, slightly rounded', file: '/fonts/optimer_bold.typeface.json' },
  { id: 'round', name: 'Round', note: 'Rounded and playful', file: '/fonts/droid_sans_bold.typeface.json' },
  { id: 'classic', name: 'Classic', note: 'A serif with character', file: '/fonts/droid_serif_bold.typeface.json' },
  { id: 'light', name: 'Light', note: 'Thin and modern', file: '/fonts/helvetiker_regular.typeface.json' },
]

/** Two-colour combinations that print well together; the customer can still pick any pair. */
export const COLOR_COMBOS = [
  { id: 'forest', name: 'White on green', textColor: 'white', baseColor: 'green' },
  { id: 'gold', name: 'Gold on black', textColor: 'silk-gold', baseColor: 'black' },
  { id: 'sunset', name: 'Yellow on orange', textColor: 'yellow', baseColor: 'orange' },
  { id: 'sky', name: 'White on blue', textColor: 'white', baseColor: 'blue' },
  { id: 'ink', name: 'Black on white', textColor: 'black', baseColor: 'white' },
  { id: 'cherry', name: 'White on red', textColor: 'white', baseColor: 'red' },
]

export const CATEGORIES = [
  { id: 'keychain', name: 'Keychains' },
  { id: 'desk', name: 'Desk pieces' },
  { id: 'gift', name: 'Small gifts' },
  { id: 'photo', name: 'Photo gifts' },
  { id: 'figure', name: 'Mini-Me' },
]

const S = (s, m, l) => [
  { id: 's', name: 'Small', width: s, factor: 1 },
  { id: 'm', name: 'Medium', width: m, factor: 1.2 },
  { id: 'l', name: 'Large', width: l, factor: 1.45 },
]

/**
 * Every style. `kind` is text (a name, font, two colours, a size), photo (an uploaded photo,
 * a frame colour, a size) or figure (the Mini-Me). `width` is the finished width in mm per size.
 * Text prices: (base + perChar × letters beyond three) × the size factor.
 */
export const STYLES = [
  // keychains
  { id: 'tag', category: 'keychain', kind: 'text', name: 'Classic tag', tagline: 'Raised letters on a tag with a solid keyring loop.', base: 149, perChar: 12, maxChars: 12, sizes: S(45, 60, 75), leadDays: '2 to 4' },
  { id: 'bubble', category: 'keychain', kind: 'text', name: 'Bubble letters', tagline: 'Chunky rounded letters, nothing else.', base: 169, perChar: 14, maxChars: 10, sizes: S(45, 60, 75), leadDays: '2 to 4' },
  { id: 'wavy', category: 'keychain', kind: 'text', name: 'Wavy band', tagline: 'Letters riding a wave.', base: 159, perChar: 12, maxChars: 12, sizes: S(50, 65, 80), leadDays: '2 to 4' },
  { id: 'tiles', category: 'keychain', kind: 'text', name: 'Letter tiles', tagline: 'One tile per letter, linked in a chain.', base: 129, perChar: 22, maxChars: 8, sizes: S(60, 80, 100), leadDays: '2 to 4' },
  { id: 'beads', category: 'keychain', kind: 'text', name: 'Name beads', tagline: 'Letter beads on a string, bracelet style.', base: 129, perChar: 20, maxChars: 9, sizes: S(60, 80, 100), leadDays: '2 to 4' },
  // desk pieces
  { id: 'stand', category: 'desk', kind: 'text', name: 'Desk name stand', tagline: 'Standing letters on a base.', base: 349, perChar: 25, maxChars: 14, sizes: S(120, 160, 200), leadDays: '3 to 5' },
  { id: 'love', category: 'desk', kind: 'text', name: 'Love stand', tagline: 'A name with a heart beside it.', base: 399, perChar: 25, maxChars: 12, sizes: S(130, 170, 210), leadDays: '3 to 5', options: [{ id: 'heart', name: 'Heart', choices: [{ id: 'red', name: 'Red' }, { id: 'match', name: 'Same as letters' }] }] },
  { id: 'plaque', category: 'desk', kind: 'text', name: 'Name plaque', tagline: 'A plate on a slanted base, for a desk or a door.', base: 449, perChar: 20, maxChars: 16, sizes: S(140, 180, 220), leadDays: '3 to 5', options: [{ id: 'shape', name: 'Shape', choices: [{ id: 'rect', name: 'Rectangle' }, { id: 'stadium', name: 'Rounded ends' }] }] },
  { id: 'lamp', category: 'desk', kind: 'text', name: 'LED name lamp', tagline: 'Letters that light up on a dark base, USB powered.', base: 899, perChar: 30, maxChars: 12, sizes: S(140, 180, 220), leadDays: '4 to 6' },
  // small gifts
  { id: 'bookmark', category: 'gift', kind: 'text', name: 'Name bookmark', tagline: 'A slim bookmark with the name down its length.', base: 129, perChar: 10, maxChars: 12, sizes: S(110, 130, 150), leadDays: '2 to 4' },
  { id: 'plant', category: 'gift', kind: 'text', name: 'Plant buddy', tagline: 'A stake with a leaf tag, for a pot.', base: 149, perChar: 12, maxChars: 10, sizes: S(140, 170, 200), leadDays: '2 to 4' },
  { id: 'magnet', category: 'gift', kind: 'text', name: 'Name magnet', tagline: 'Raised letters on a plate with a magnet behind.', base: 169, perChar: 12, maxChars: 12, sizes: S(60, 75, 90), leadDays: '2 to 4' },
  // photo gifts
  { id: 'photo-magnet', category: 'photo', kind: 'photo', name: 'Photo magnet', tagline: 'Your photo in a printed frame, magnet on the back.', sizes: [{ id: 's', name: 'Small', width: 55, price: 199 }, { id: 'm', name: 'Medium', width: 70, price: 249 }, { id: 'l', name: 'Large', width: 90, price: 329 }], leadDays: '2 to 4' },
  { id: 'photo-stand', category: 'photo', kind: 'photo', name: 'Photo stand', tagline: 'Your photo in a frame that stands on its own.', sizes: [{ id: 's', name: 'Small', width: 70, price: 299 }, { id: 'm', name: 'Medium', width: 90, price: 379 }, { id: 'l', name: 'Large', width: 120, price: 499 }], leadDays: '2 to 4' },
]

/** Mini-Me: a cartoon figure of a person, modelled by the team from the customer's photos. */
export const MINIME = {
  id: 'minime',
  category: 'figure',
  kind: 'figure',
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

export const DESIGN_PRODUCTS = [...STYLES, MINIME]
export const designProductById = (id) => DESIGN_PRODUCTS.find((p) => p.id === id)
export const TEXT_STYLES = STYLES.filter((s) => s.kind === 'text')
export const PHOTO_STYLES = STYLES.filter((s) => s.kind === 'photo')

/** What a fresh design starts with. */
export const TEXT_DEFAULTS = { text: 'Raghul', font: 'block', textColor: 'white', baseColor: 'green', size: 'm' }

// Letters, digits, spaces and the punctuation names and short messages use. Every font ships these glyphs.
const TEXT_OK = /^[A-Za-z0-9 .,'&!?@#+\-]+$/

/**
 * Checks and normalises a design from the browser. Throws an Error with a message safe to show
 * the customer. The result is what gets priced and stored.
 */
export function normalizeDesign(input = {}) {
  const product = designProductById(input.product)
  if (!product) throw new Error('Choose a design to personalise.')
  if (product.kind === 'figure') {
    const style = byId(MINIME.styles, input.style) ?? MINIME.styles[0]
    const colorCount = MINIME.colorCounts.find((c) => c.id === Number(input.colorCount)) ?? MINIME.colorCounts[1]
    const accent = byId(COLORS, input.accent) ?? byId(COLORS, MINIME.defaults.accent)
    const notes = String(input.notes ?? '').trim().slice(0, 300)
    return { product: 'minime', style: style.id, colorCount: colorCount.id, accent: accent.id, notes }
  }
  const size = byId(product.sizes, input.size) ?? product.sizes[1]
  if (product.kind === 'photo') {
    const baseColor = byId(COLORS, input.baseColor) ?? byId(COLORS, 'white')
    return { product: product.id, baseColor: baseColor.id, size: size.id }
  }
  const text = String(input.text ?? '').replace(/\s+/g, ' ').trim()
  if (!text) throw new Error('Type the name or words to print.')
  if (text.length > product.maxChars) throw new Error(`Keep it to ${product.maxChars} characters for a ${product.name.toLowerCase()}.`)
  if (!TEXT_OK.test(text)) throw new Error('Use letters, numbers and simple punctuation only.')
  const font = byId(FONTS, input.font) ?? byId(FONTS, TEXT_DEFAULTS.font)
  const textColor = byId(COLORS, input.textColor) ?? byId(COLORS, TEXT_DEFAULTS.textColor)
  const baseColor = byId(COLORS, input.baseColor) ?? byId(COLORS, TEXT_DEFAULTS.baseColor)
  const design = { product: product.id, text, font: font.id, textColor: textColor.id, baseColor: baseColor.id, size: size.id }
  for (const opt of product.options ?? []) design[opt.id] = (byId(opt.choices, input[opt.id]) ?? opt.choices[0]).id
  return design
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
  if (product.kind === 'figure') {
    raw = byId(MINIME.styles, design.style).price + MINIME.colorCounts.find((c) => c.id === design.colorCount).extra
  } else if (product.kind === 'photo') {
    raw = byId(product.sizes, design.size).price
  } else {
    const size = byId(product.sizes, design.size)
    const letters = design.text.replace(/\s/g, '').length
    raw = Math.round((product.base + product.perChar * Math.max(0, letters - 3)) * size.factor)
  }
  const discount = bulkDiscount(qty)
  const unit = Math.round(raw * (1 - discount))
  return { unit, discount, total: unit * qty }
}

/** The lowest price a style starts from, for the showcase. */
export function startingPrice(product, text = TEXT_DEFAULTS.text) {
  if (product.kind === 'figure') return MINIME.styles[0].price
  if (product.kind === 'photo') return product.sizes[0].price
  return priceDesign({ product: product.id, text, size: 's' }).unit
}

/** Short human description, used in the cart, order emails and the team dashboard. */
export function describeDesign(design) {
  const product = designProductById(design.product)
  if (product.kind === 'figure') {
    const style = byId(MINIME.styles, design.style)
    return `${style.name}, ${design.colorCount} colours, ${byId(COLORS, design.accent).name} accent`
  }
  const size = byId(product.sizes, design.size)
  if (product.kind === 'photo') return `${byId(COLORS, design.baseColor).name} frame, ${size.name} (${size.width} mm)`
  const extras = (product.options ?? []).map((o) => `${o.name.toLowerCase()} ${byId(o.choices, design[o.id]).name.toLowerCase()}`)
  return [`${byId(FONTS, design.font).name}, ${byId(COLORS, design.textColor).name} on ${byId(COLORS, design.baseColor).name}`, `${size.name} (${size.width} mm)`, ...extras].join(', ')
}

/** Line name shown wherever the design appears, e.g. “Classic tag keychain “Raghul””. */
export function designTitle(design) {
  const product = designProductById(design.product)
  if (product.kind === 'figure') return `Mini-Me ${byId(MINIME.styles, design.style).name.toLowerCase()}`
  if (product.kind === 'photo') return product.name
  const suffix = product.category === 'keychain' ? ' keychain' : ''
  return `${product.name}${suffix} “${design.text}”`
}
