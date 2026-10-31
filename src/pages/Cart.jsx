import { Link } from 'react-router-dom'
import { CartLine } from '../components/CartDrawer.jsx'
import { useCart } from '../lib/cart.jsx'
import { money } from '../lib/format.js'
import { SHIPPING } from '../../shared/pricing.js'

export default function Cart() {
  const { items, subtotal, count } = useCart()
  const free = SHIPPING[0].freeOver
  return (
    <div className="page cart-page">
      <div className="container narrow">
        <header className="page-head">
          <h1>Your cart</h1>
          {count > 0 && <p>{count} {count === 1 ? 'item' : 'items'}</p>}
        </header>
        {items.length === 0 ? (
          <div className="empty">
            <p><strong>Your cart is empty.</strong></p>
            <p className="muted">Browse ready-made prints, or upload your own 3D file for an instant price.</p>
            <div className="row-gap center">
              <Link className="btn" to="/shop">Browse the shop</Link>
              <Link className="btn btn-quiet" to="/#quote">Upload a 3D file</Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="cart-lines">{items.map((i) => <CartLine key={i.key} item={i} />)}</ul>
            <div className="cart-summary panel">
              <p className="sum-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></p>
              <p className="muted small">
                {subtotal >= free ? 'You get free standard delivery.' : `Add ${money(free - subtotal)} more for free standard delivery.`} Prices include GST.
              </p>
              <Link className="btn btn-hot btn-block" to="/checkout">Checkout</Link>
              <Link className="btn btn-quiet btn-block" to="/shop">Keep shopping</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
