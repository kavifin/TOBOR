// The design a visitor is working on, shared by the hero's compact designer, the style showcase
// and the full designer. One name, font and colour pair carry across every text style, so a name
// typed in the hero shows on every style card and in the designer.
import { useSyncExternalStore } from 'react'
import { TEXT_DEFAULTS, MINIME } from '../../shared/designs.js'

let draft = {
  product: 'tag',
  ...TEXT_DEFAULTS, // text, font, textColor, baseColor, size
  options: {}, // per-style extras, e.g. { love: { heart: 'red' } }
  names: [], // extra names for a matching set
  photo: { size: 'm', baseColor: 'white' },
  minime: { ...MINIME.defaults },
}
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export const getDraft = () => draft
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))

export function setProduct(product) {
  if (draft.product === product) return
  draft = { ...draft, product }
  emit()
}

/** Patch the shared text options, e.g. patchDraft({ text: 'Asha' }). */
export function patchDraft(patch) {
  draft = { ...draft, ...patch }
  emit()
}

/** Patch a style's extra option, e.g. patchOption('love', { heart: 'red' }). */
export function patchOption(product, patch) {
  draft = { ...draft, options: { ...draft.options, [product]: { ...draft.options[product], ...patch } } }
  emit()
}

export function patchPhoto(patch) {
  draft = { ...draft, photo: { ...draft.photo, ...patch } }
  emit()
}

export function patchMiniMe(patch) {
  draft = { ...draft, minime: { ...draft.minime, ...patch } }
  emit()
}

/** The text design for a style, as normalizeDesign expects it. */
export const textDesignFor = (d, product, text = d.text) => ({ product, text, font: d.font, textColor: d.textColor, baseColor: d.baseColor, size: d.size, ...(d.options[product] ?? {}) })

export function useDraft() {
  return useSyncExternalStore(subscribe, getDraft, getDraft)
}
