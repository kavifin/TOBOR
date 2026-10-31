import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X, Trash2, FileBox } from 'lucide-react'
import { useCart, unitPriceOf } from '../lib/cart.jsx'
import { money } from '../lib/format.js'
import { productById } from '../../shared/products.js'
import { byId, COLORS } from '../../shared/pricing.js'
import Thumb from './Thumb.jsx'
import QtyStepper from './QtyStepper.jsx'

export function CartLine({ item, compact = false }) {
  const { setQty, remove } = useCart()
  const product = item.kind === 'product' ? productById(item.productId) : null
  const color = byId(COLORS, item.color)
  const name = product?.name ?? item.name
  return (
    <li className={`cart-line ${compact ? 'is-compact' : ''}`}>
      {product ? (
        <Thumb product={product} color={item.color} className="cart-thumb" />
      ) : (
        <div className="thumb cart-thumb print-thumb" style={{ '--tint': color?.hex }}>
          <FileBox size={28} aria-hidden="true" />
        </div>
      )}
      <div className="cart-line-info">
        {product ? (
          <Link to={`/shop/${product.slug}`} className="cart-line-name">{name}</Link>
        ) : (
          <span className="cart-line-name">{name}</span>
        )}
        <span className="cart-line-meta">
          <i className="dot" style={{ background: color?.hex }} />
          {color?.name}
          {item.kind === 'print' && `, ${item.materialName}, ${item.qualityName}, ${item.infill}% infill`}
        </span>
        <div className="cart-line-row">
          <QtyStepper value={item.qty} onChange={(q) => setQty(item.key, q)} label={`Quantity of ${name}`} />
          <button className="link-btn" onClick={() => remove(item.key)} aria-label={`Remove ${name}`}>
            <Trash2 size={16} aria-hidden="true" /> Remove
          </button>
        </div>
      </div>
      <span className="cart-line-price">{money(unitPriceOf(item) * item.qty)}</span>
    </li>
  )
}

export default function CartDrawer() {
  const { items, subtotal, drawerOpen, closeDrawer } = useCart()
  const navigate = useNavigate()
  const panel = useRef(null)

  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.activeElement
    panel.current?.focus()
    const onKey = (e) => e.key === 'Escape' && closeDrawer()
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('lock-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('lock-scroll')
      prev?.focus?.()
    }
  }, [drawerOpen, closeDrawer])

  const go = (to) => {
    closeDrawer()
    navigate(to)
  }

  return (
    <div className={`drawer-root ${drawerOpen ? 'is-open' : ''}`}>
      <div className="drawer-scrim" onClick={closeDrawer} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabIndex={-1} ref={panel} inert={!drawerOpen}>
        <div className="drawer-head">
          <h2 id="cart-title">Your cart</h2>
          <button className="icon-btn" onClick={closeDrawer} aria-label="Close cart">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Your cart is empty.</p>
            <p className="muted">Pick something from the shop, or upload a 3D file for an instant price.</p>
            <button className="btn" onClick={() => go('/shop')}>Browse the shop</button>
          </div>
        ) : (
          <>
            <ul className="cart-lines">
              {items.map((i) => <CartLine key={i.key} item={i} compact />)}
            </ul>
            <div className="drawer-foot">
              <p className="sum-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
              <p className="muted small">Delivery and payment options at checkout. Prices include GST.</p>
              <button className="btn btn-block" onClick={() => go('/checkout')}>Checkout</button>
              <button className="btn btn-quiet btn-block" onClick={() => go('/cart')}>View full cart</button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
