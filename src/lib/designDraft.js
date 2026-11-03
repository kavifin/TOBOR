// The design a visitor is working on, shared between the hero's compact designer and the
// full "Design your own" section, so a name typed in the hero carries over.
import { useSyncExternalStore } from 'react'
import { TEXT_PRODUCTS, MINIME } from '../../shared/designs.js'

let draft = {
  product: 'keychain',
  keychain: { ...TEXT_PRODUCTS.keychain.defaults },
  stand: { ...TEXT_PRODUCTS.stand.defaults },
  minime: { ...MINIME.defaults },
}
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())

export const getDraft = () => draft
export const subscribe = (l) => (listeners.add(l), () => listeners.delete(l))

/** Switch the active product. */
export function setProduct(product) {
  if (draft.product === product) return
  draft = { ...draft, product }
  emit()
}

/** Patch one product's options, e.g. patchDesign('keychain', { text: 'Asha' }). */
export function patchDesign(product, patch) {
  draft = { ...draft, [product]: { ...draft[product], ...patch } }
  emit()
}

export function useDraft() {
  return useSyncExternalStore(subscribe, getDraft, getDraft)
}
