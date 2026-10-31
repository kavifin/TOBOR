import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, Truck, Smartphone, CreditCard, Banknote } from 'lucide-react'
import Field from '../components/Field.jsx'
import { CartLine } from '../components/CartDrawer.jsx'
import { usePayment } from '../components/Payment.jsx'
import { phoneValid } from '../sections/PhotoRequest.jsx'
import { useCart } from '../lib/cart.jsx'
import { api } from '../lib/api.js'
import { money } from '../lib/format.js'
import { SHIPPING, PAYMENT_METHODS, shippingCost, byId } from '../../shared/pricing.js'

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']
const PAY_ICONS = { upi: Smartphone, card: CreditCard, cod: Banknote }
const SAVED = 'tobor.checkout.v1'

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(SAVED)) ?? {}
  } catch {
    return {}
  }
}

export function rememberTracking(id, phone) {
  try {
    sessionStorage.setItem('tobor.track', JSON.stringify({ id, phone }))
  } catch {
    /* fine: the track page will ask for the phone number */
  }
}

export default function Checkout() {
  const { items, subtotal, clear } = useCart()
  const navigate = useNavigate()
  const { pay, dialog } = usePayment()
  const saved = loadSaved()
  const [f, setF] = useState({ name: '', phone: '', email: '', line1: '', line2: '', city: '', state: '', pin: '', ...saved, shipping: 'standard', payment: 'upi' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const ship = shippingCost(f.shipping, subtotal)
  const fee = byId(PAYMENT_METHODS, f.payment)?.fee ?? 0
  const total = subtotal + ship + fee

  if (!items.length && !busy)
    return (
      <div className="page"><div className="container narrow empty">
        <h1>Checkout</h1>
        <p className="muted">Your cart is empty, so there’s nothing to check out yet.</p>
        <Link className="btn" to="/shop">Browse the shop</Link>
      </div></div>
    )

  function validate() {
    const e = {}
    if (!f.name.trim()) e.name = 'Add the name for delivery.'
    if (!phoneValid(f.phone)) e.phone = 'Enter a 10-digit mobile number. We send delivery updates on WhatsApp.'
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Check the email address, or leave it empty.'
    if (!f.line1.trim()) e.line1 = 'Add your house or flat number and street.'
    if (!f.city.trim()) e.city = 'Add your city or town.'
    if (!f.state) e.state = 'Choose your state.'
    if (!/^\d{6}$/.test(f.pin)) e.pin = 'PIN codes have 6 digits.'
    return e
  }

  async function submit(e) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length) {
      setTimeout(() => document.querySelector('.checkout [aria-invalid="true"]')?.focus(), 0)
      return
    }
    setBusy(true)
    setServerError('')
    try {
      const { name, phone, email, line1, line2, city, state, pin } = f
      try {
        localStorage.setItem(SAVED, JSON.stringify({ name, phone, email, line1, line2, city, state, pin }))
      } catch {
        /* optional convenience */
      }
      const order = await api.placeOrder({
        items: items.map(({ key, ...i }) => i),
        customer: { name, phone, email },
        address: { line1, line2, city, state, pin },
        shipping: f.shipping,
        payment: f.payment,
      })
      rememberTracking(order.id, phone)
      // The order is saved either way; an unfinished payment can be retried from the order page.
      if (order.needsPayment) await pay(order.id).catch(() => false)
      clear()
      navigate(`/track?id=${order.id}&new=1`)
    } catch (err) {
      setServerError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="page checkout-page">
      <div className="container">
        <header className="page-head">
          <h1>Checkout</h1>
          <p className="muted"><Lock size={14} aria-hidden="true" /> Payments are processed securely. We never see your card or UPI PIN.</p>
        </header>
        <form className="checkout" onSubmit={submit} noValidate>
          <div className="checkout-main">
            <section className="panel">
              <h2 className="step-title"><span>1</span> Contact</h2>
              <div className="grid-2">
                <Field label="Full name" value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                <Field label="Mobile number (WhatsApp)" type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" placeholder="98400 12345" />
              </div>
              <Field label="Email (optional)" type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" hint="For your invoice." />
            </section>

            <section className="panel">
              <h2 className="step-title"><span>2</span> Delivery address</h2>
              <Field label="House or flat number, street" value={f.line1} onChange={set('line1')} error={errors.line1} autoComplete="address-line1" />
              <Field label="Area or landmark (optional)" value={f.line2} onChange={set('line2')} autoComplete="address-line2" />
              <div className="grid-3">
                <Field label="City or town" value={f.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
                <Field label="State" as="select" value={f.state} onChange={set('state')} error={errors.state} autoComplete="address-level1">
                  <option value="">Choose…</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </Field>
                <Field label="PIN code" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} error={errors.pin} autoComplete="postal-code" />
              </div>
            </section>

            <section className="panel">
              <h2 className="step-title"><span>3</span> Delivery speed</h2>
              <div className="options" role="radiogroup" aria-label="Delivery speed">
                {SHIPPING.map((s) => {
                  const cost = shippingCost(s.id, subtotal)
                  return (
                    <label key={s.id} className={`option ${f.shipping === s.id ? 'is-on' : ''}`}>
                      <input type="radio" name="shipping" value={s.id} checked={f.shipping === s.id} onChange={set('shipping')} />
                      <Truck size={20} aria-hidden="true" />
                      <span><strong>{s.name}</strong><small>{s.days}</small></span>
                      <span className="option-price">{cost ? money(cost) : 'Free'}</span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="panel">
              <h2 className="step-title"><span>4</span> Payment</h2>
              <div className="options" role="radiogroup" aria-label="Payment method">
                {PAYMENT_METHODS.map((p) => {
                  const Icon = PAY_ICONS[p.id]
                  return (
                    <label key={p.id} className={`option ${f.payment === p.id ? 'is-on' : ''}`}>
                      <input type="radio" name="payment" value={p.id} checked={f.payment === p.id} onChange={set('payment')} />
                      <Icon size={20} aria-hidden="true" />
                      <span><strong>{p.name}</strong><small>{p.note}</small></span>
                    </label>
                  )
                })}
              </div>
            </section>
          </div>

          <aside className="checkout-summary panel">
            <h2>Order summary</h2>
            <ul className="cart-lines">{items.map((i) => <CartLine key={i.key} item={i} compact />)}</ul>
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Delivery</dt><dd>{ship ? money(ship) : 'Free'}</dd></div>
              {fee > 0 && <div><dt>Cash handling</dt><dd>{money(fee)}</dd></div>}
              <div className="grand"><dt>Total</dt><dd>{money(total)}</dd></div>
            </dl>
            <p className="muted small">Prices include GST. Custom prints from uploaded files are checked by our team before printing.</p>
            {serverError && <p className="form-error" role="alert">{serverError}</p>}
            <button className="btn btn-hot btn-block" disabled={busy}>
              {busy ? 'Placing order…' : f.payment === 'cod' ? `Place order, pay ${money(total)} on delivery` : `Pay ${money(total)}`}
            </button>
          </aside>
        </form>
      </div>
      {dialog}
    </div>
  )
}
