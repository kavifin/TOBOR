// Razorpay (UPI, cards, net banking). Without keys the shop runs in test mode: payments are
// simulated so the whole flow can be tried end to end, and the UI labels it clearly.
import crypto from 'node:crypto'

const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env
export const paymentsLive = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)

export async function createPayment(record, amount) {
  if (!paymentsLive) return { mode: 'test', amount, providerOrderId: 'test_' + crypto.randomUUID().slice(0, 12) }
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amount * 100, currency: 'INR', receipt: record.id }),
  })
  if (!res.ok) throw new Error('Could not start the payment. Try again in a minute.')
  const order = await res.json()
  return { mode: 'razorpay', amount, providerOrderId: order.id, keyId: RAZORPAY_KEY_ID }
}

export function verifyPayment({ providerOrderId, paymentId, signature }) {
  if (!paymentsLive) return providerOrderId?.startsWith('test_')
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${providerOrderId}|${paymentId}`).digest('hex')
  return signature && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
