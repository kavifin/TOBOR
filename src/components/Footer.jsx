import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, Check } from 'lucide-react'
import Field from './Field.jsx'
import Wordmark from './Wordmark.jsx'
import { WhatsAppIcon } from './Icons.jsx'
import { SITE, waLink } from '../lib/config.js'
import { api } from '../lib/api.js'

const TOPICS = ['Custom print or quote', 'Bulk or business order', 'Order I already placed', 'Something else']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function EnquiryForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: TOPICS[0], message: '', company: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle')
  const [emailed, setEmailed] = useState(false)
  const [serverError, setServerError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Add your name.'
    if (!EMAIL.test(form.email.trim())) errs.email = 'Enter your email address so we can reply.'
    if (form.phone.trim() && !/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) errs.phone = 'Check the number, or leave it empty.'
    if (form.message.trim().length < 10) errs.message = 'Tell us a little more, at least a sentence.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      setTimeout(() => document.querySelector('.enquiry [aria-invalid="true"]')?.focus(), 0)
      return
    }
    setState('sending')
    setServerError('')
    try {
      const res = await api.enquiry(form)
      setEmailed(res.emailed)
      setState('sent')
    } catch (err) {
      setServerError(err.message)
      setState('idle')
    }
  }

  if (state === 'sent')
    return (
      <div className="enquiry-sent" role="status">
        <span className="tick"><Check size={22} aria-hidden="true" /></span>
        <p>
          <strong>Message sent.</strong>{' '}
          {emailed ? `We’ve emailed a copy to ${form.email}. ` : ''}
          We reply by email within one working day, usually much sooner.
        </p>
        <button className="link-btn" onClick={() => { setForm({ ...form, message: '' }); setState('idle') }}>Send another message</button>
      </div>
    )

  return (
    <form className="enquiry" onSubmit={submit} noValidate>
      <div className="grid-2">
        <Field label="Name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Email" type="email" inputMode="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" placeholder="you@example.com" />
      </div>
      <Field label="Phone (optional)" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" hint="Add it if you’d like a call or a WhatsApp reply." />
      {/* hidden from people; only bots fill it in */}
      <div className="hp" aria-hidden="true">
        <label>Company<input tabIndex={-1} autoComplete="off" value={form.company} onChange={set('company')} /></label>
      </div>
      <Field label="What is it about?" as="select" value={form.topic} onChange={set('topic')}>
        {TOPICS.map((t) => <option key={t}>{t}</option>)}
      </Field>
      <Field label="Message" as="textarea" rows={4} value={form.message} onChange={set('message')} error={errors.message} placeholder="Sizes, quantities, deadlines, anything that helps" />
      {serverError && <p className="form-error" role="alert">{serverError}</p>}
      <button className="btn btn-hot" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send message'}</button>
    </form>
  )
}

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-top container">
        <div className="footer-enquiry">
          <h2>Ask us anything</h2>
          <p className="muted-night">Custom parts, bulk orders, materials, deadlines. A real person from the workshop replies.</p>
          <EnquiryForm />
        </div>
        <div className="footer-contact">
          <h2>Contact</h2>
          <ul className="contact-list">
            <li><WhatsAppIcon size={20} /><a href={waLink()} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a></li>
            <li><Phone size={20} aria-hidden="true" /><a href={`tel:${SITE.phone.replace(/\s/g, '')}`}>{SITE.phone}</a></li>
            {SITE.email && <li><Mail size={20} aria-hidden="true" /><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>}
            <li className="contact-address">
              <MapPin size={20} aria-hidden="true" />
              <address>
                {SITE.address.map((line) => <span key={line}>{line}</span>)}
                <a href={SITE.mapUrl} target="_blank" rel="noopener noreferrer">Get directions</a>
              </address>
            </li>
            <li><Clock size={20} aria-hidden="true" /><span>{SITE.hours}</span></li>
          </ul>
          <iframe
            className="footer-map"
            title="Map showing the TOBOR studio on Greams Road, Chennai"
            src={`https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <nav className="footer-links" aria-label="Footer">
            <Link to="/shop">Shop</Link>
            <Link to="/#quote">Get a quote</Link>
            <Link to="/send">Send photos from your phone</Link>
            <Link to="/track">Track an order</Link>
            <Link to="/#faq">Questions</Link>
          </nav>
        </div>
      </div>
      <div className="footer-base container">
        <Wordmark size="lg" alt="TOBOR" />
        <p>© {new Date().getFullYear()} TOBOR 3D printing. Prices include GST.</p>
      </div>
    </footer>
  )
}
