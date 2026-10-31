// Enquiry emails: each enquiry is emailed to the business and the customer gets a confirmation.
// Sending goes through the first provider that is configured in .env:
//   1. Brevo (free plan) via its HTTP API: BREVO_API_KEY, with a sender verified in Brevo
//   2. Any SMTP server, e.g. Gmail with an App Password: SMTP_USER + SMTP_PASS
//   3. Neither: emails are written to the server log so the flow can still be tested
import nodemailer from 'nodemailer'

const {
  BREVO_API_KEY,
  BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email',
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  SMTP_USER,
  SMTP_PASS,
  BUSINESS_EMAIL = 'roboattis@gmail.com',
  MAIL_FROM = BUSINESS_EMAIL, // must be a sender verified in Brevo
  BUSINESS_PHONE = '+91 80720 51063',
  BUSINESS_WHATSAPP = '918072051063',
} = process.env

export const mailProvider = BREVO_API_KEY ? 'brevo' : SMTP_USER && SMTP_PASS ? 'smtp' : 'log'
export const mailLive = mailProvider !== 'log'
if (BREVO_API_KEY?.startsWith('xsmtpsib-'))
  console.warn('BREVO_API_KEY is a Brevo SMTP key; emails need an API key (starts with xkeysib-) from SMTP & API → API Keys')

const smtp = mailProvider === 'smtp' && nodemailer.createTransport({ host: SMTP_HOST, port: Number(SMTP_PORT), secure: Number(SMTP_PORT) === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })

/** Sends one email. `to` and `replyTo` are { email, name }. Resolves to 'sent' or 'logged'; throws on failure. */
async function deliver({ to, replyTo, subject, text, html }) {
  if (mailProvider === 'brevo') {
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'TOBOR', email: MAIL_FROM }, to: [to], replyTo, subject, textContent: text, htmlContent: html }),
    })
    if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return 'sent'
  }
  if (mailProvider === 'smtp') {
    await smtp.sendMail({ from: `"TOBOR" <${MAIL_FROM}>`, to: to.email, replyTo: `"${replyTo.name}" <${replyTo.email}>`, subject, text, html })
    return 'sent'
  }
  console.log(`[email] to ${to.email}: ${subject}`)
  return 'logged'
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const paragraphs = (s) => escape(s).replace(/\n/g, '<br>')

function layout(title, body) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4eee5;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fbf8f3;border-radius:16px;padding:28px;color:#1f1b17">
    <p style="margin:0 0 6px;font-size:22px;font-weight:800;letter-spacing:-0.5px">TOBOR</p>
    <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
    ${body}
    <p style="margin:24px 0 0;font-size:13px;color:#6e6358">TOBOR 3D printing, Greams Road, Thousand Lights, Chennai 600006 · ${escape(BUSINESS_PHONE)} · Monday to Friday, 10 am – 7 pm</p>
  </div>
</div>`
}

/** Sends the enquiry to the business, and a confirmation to the customer. Never throws. */
export async function sendEnquiryEmails(e) {
  const name = e.name.replace(/["<>]/g, '')
  const first = name.split(' ')[0]
  const rows = [
    ['Name', e.name],
    ['Email', e.email],
    ['Phone', e.phone || 'Not given'],
    ['About', e.topic],
  ]
  const results = { business: 'skipped', customer: 'skipped' }

  try {
    results.business = await deliver({
      to: { email: BUSINESS_EMAIL, name: 'TOBOR' },
      replyTo: { email: e.email, name },
      subject: `New enquiry: ${e.topic} — ${name}`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${e.message}\n\nReply to this email to answer ${name} directly.`,
      html: layout(
        'New enquiry from the website',
        `<table style="border-collapse:collapse;font-size:15px;margin-bottom:16px">${rows
          .map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#6e6358">${k}</td><td style="padding:4px 0"><strong>${escape(v)}</strong></td></tr>`)
          .join('')}</table>
        <div style="background:#fff;border-radius:12px;padding:16px;font-size:15px;line-height:1.5">${paragraphs(e.message)}</div>
        <p style="font-size:14px;color:#127048">Reply to this email to answer ${escape(name)} directly.</p>`,
      ),
    })
  } catch (err) {
    results.business = `failed (${err.message})`
    console.error('[email] enquiry to business failed:', err.message)
  }

  try {
    results.customer = await deliver({
      to: { email: e.email, name },
      replyTo: { email: BUSINESS_EMAIL, name: 'TOBOR' },
      subject: 'We got your message — TOBOR',
      text: `Hi ${first},\n\nThanks for writing to TOBOR. We reply within one working day (Monday to Friday, 10 am – 7 pm), usually much sooner.\n\nYour message:\n${e.message}\n\nNeed us sooner? WhatsApp or call ${BUSINESS_PHONE}.\n\nTOBOR 3D printing`,
      html: layout(
        `Thanks, ${escape(first)}. We got your message.`,
        `<p style="font-size:15px;line-height:1.55">We reply within one working day (Monday to Friday, 10 am – 7 pm), usually much sooner.</p>
        <p style="font-size:13px;color:#6e6358;margin:16px 0 6px">Your message</p>
        <div style="background:#fff;border-radius:12px;padding:16px;font-size:15px;line-height:1.5">${paragraphs(e.message)}</div>
        <p style="font-size:15px;margin-top:20px">Need us sooner? <a href="https://wa.me/${BUSINESS_WHATSAPP}" style="color:#127048;font-weight:bold">Chat on WhatsApp</a> or call ${escape(BUSINESS_PHONE)}.</p>`,
      ),
    })
  } catch (err) {
    results.customer = `failed (${err.message})`
    console.error('[email] confirmation to customer failed:', err.message)
  }
  return results
}
