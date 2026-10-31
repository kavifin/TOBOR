import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { productById } from '../../shared/products.js'
import { estimatePart } from '../../shared/pricing.js'

const KEY = 'tobor.cart.v1'
const CartContext = createContext(null)

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? []
  } catch {
    return []
  }
}

// A line's key decides whether adding again merges quantities.
const lineKey = (item) => (item.kind === 'product' ? `${item.productId}:${item.color}` : `print:${item.fileId}:${item.material}:${item.color}:${item.quality}:${item.infill}`)

function reducer(items, action) {
  switch (action.type) {
    case 'add': {
      const key = lineKey(action.item)
      const found = items.find((i) => i.key === key)
      if (found) return items.map((i) => (i.key === key ? { ...i, qty: Math.min(999, i.qty + action.item.qty) } : i))
      return [...items, { ...action.item, key }]
    }
    case 'qty':
      return items.map((i) => (i.key === action.key ? { ...i, qty: Math.max(1, Math.min(999, action.qty)) } : i))
    case 'remove':
      return items.filter((i) => i.key !== action.key)
    case 'clear':
      return []
    default:
      return items
  }
}

/** Unit price for a line, using the same rules the server applies at checkout (bulk discounts follow quantity). */
export const unitPriceOf = (item) =>
  item.kind === 'product'
    ? productById(item.productId)?.price ?? 0
    : estimatePart({ volumeCm3: item.volumeCm3, material: item.material, quality: item.quality, infill: item.infill, qty: item.qty }).unit

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable: cart still works for this visit */
    }
  }, [items])

  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.qty, 0)
    const subtotal = items.reduce((s, i) => s + unitPriceOf(i) * i.qty, 0)
    return {
      items,
      count,
      subtotal,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add: (item, { open = true } = {}) => {
        dispatch({ type: 'add', item })
        if (open) setDrawerOpen(true)
      },
      setQty: (key, qty) => dispatch({ type: 'qty', key, qty }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
    }
  }, [items, drawerOpen])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
