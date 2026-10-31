// WhatsApp updates. With WhatsApp Cloud API credentials in .env, messages are sent automatically.
// Without them, each message is still logged with a one-click wa.me link the team can send by hand.
import { store } from './store.js'
import { whatsappText } from '../shared/status.js'

const { WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_TEMPLATE, PUBLIC_URL = 'http://localhost:5173' } = process.env

export function toWhatsAppNumber(phone = '') {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? '91' + digits : digits
}

export async function notifyCustomer(record, kind) {
  const to = toWhatsAppNumber(record.customer?.phone)
  if (!to) return null
  const link = `${PUBLIC_URL}/track?id=${record.id}`
  const text = whatsappText(kind, record).replace('{link}', link)
  const entry = { id: crypto.randomUUID(), recordId: record.id, kind, to, text, at: new Date().toISOString(), status: 'logged', manualLink: `https://wa.me/${to}?text=${encodeURIComponent(text)}` }

  if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID) {
    const body = WHATSAPP_TEMPLATE
      ? { messaging_product: 'whatsapp', to, type: 'template', template: { name: WHATSAPP_TEMPLATE, language: { code: 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text }] }] } }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      entry.status = res.ok ? 'sent' : `failed (${res.status})`
    } catch (err) {
      entry.status = `failed (${err.message})`
    }
  } else {
    console.log(`[whatsapp:${kind}] to ${to}: ${text}`)
  }
  await store.insert('notifications', entry)
  return entry
}
