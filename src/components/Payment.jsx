import { useCallback, useRef, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { money } from '../lib/format.js'

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load the payment window. Check your connection and try again.'))
    document.body.appendChild(s)
  })
}

/**
 * Starts a payment for an order or approved quote. Live mode opens Razorpay (UPI, cards,
 * net banking); test mode shows a clearly-labelled simulator so the flow can be tried.
 * Returns { pay(id) → Promise<boolean>, dialog }.
 */
export function usePayment() {
  const [test, setTest] = useState(null)
  const resolver = useRef(null)

  const pay = useCallback(async (id) => {
    const p = await api.startPayment(id)
    if (p.mode === 'razorpay') {
      await loadRazorpay()
      return new Promise((resolve, reject) => {
        const rz = new window.Razorpay({
          key: p.keyId,
          order_id: p.providerOrderId,
          amount: p.amount * 100,
          currency: 'INR',
          name: 'TOBOR',
          image: `${window.location.origin}/brand/tobor-mark.webp`,
          description: `Payment for ${id}`,
          prefill: { name: p.name, email: p.email, contact: p.phone },
          theme: { color: '#127048' },
          handler: async (r) => {
            try {
              await api.verifyPayment(id, { providerOrderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature })
              resolve(true)
            } catch (err) {
              reject(err)
            }
          },
          modal: { ondismiss: () => resolve(false) },
        })
        rz.open()
      })
    }
    return new Promise((resolve) => {
      resolver.current = resolve
      setTest({ id, ...p })
    })
  }, [])

  const finish = async (ok) => {
    const t = test
    setTest(null)
    if (ok) await api.verifyPayment(t.id, { providerOrderId: t.providerOrderId, paymentId: 'test_pay' })
    resolver.current?.(ok)
  }

  const dialog = test && (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="pay-title">
      <div className="modal">
        <button className="icon-btn modal-close" onClick={() => finish(false)} aria-label="Cancel payment"><X size={20} aria-hidden="true" /></button>
        <p className="test-flag">Test mode</p>
        <h2 id="pay-title">Pay {money(test.amount)}</h2>
        <p className="muted">Online payments are not connected yet, so no money moves. Add Razorpay keys to the server to take real UPI, card and net banking payments.</p>
        <button className="btn btn-block" autoFocus onClick={() => finish(true)}><ShieldCheck size={18} aria-hidden="true" /> Simulate a successful payment</button>
        <button className="btn btn-quiet btn-block" onClick={() => finish(false)}>Cancel</button>
      </div>
    </div>
  )

  return { pay, dialog }
}
