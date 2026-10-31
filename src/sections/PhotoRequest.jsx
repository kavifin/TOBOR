import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, ImagePlus, X, Check } from 'lucide-react'
import Field from '../components/Field.jsx'
import QtyStepper from '../components/QtyStepper.jsx'
import { api } from '../lib/api.js'
import { MATERIALS } from '../../shared/pricing.js'

const MAX_PHOTOS = 6
const MAX_PHOTO_BYTES = 15 * 1024 * 1024
export const phoneValid = (p) => /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(p.trim())

/** Photo → quote request. Used on the home page and on /send (opened from the QR code). */
export default function PhotoRequest({ source = 'web' }) {
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState({ notes: '', size: '', qty: 1, material: '', name: '', phone: '', email: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle')
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(null)
  const input = useRef(null)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  function addFiles(list) {
    const next = [...photos]
    let err = ''
    for (const f of list) {
      if (!f.type.startsWith('image/')) err = 'Only photos can be added here. For STL or OBJ files, use the 3D file tab.'
      else if (f.size > MAX_PHOTO_BYTES) err = `${f.name} is over 15 MB. Try a smaller photo.`
      else if (next.length >= MAX_PHOTOS) err = `You can add up to ${MAX_PHOTOS} photos.`
      else next.push({ file: f, url: URL.createObjectURL(f), id: crypto.randomUUID() })
    }
    setPhotos(next)
    setErrors((e) => ({ ...e, photos: err || undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    const errs = {}
    if (!photos.length) errs.photos = 'Add at least one photo. Shots from the front, side and top help most.'
    if (!form.name.trim()) errs.name = 'Add your name.'
    if (!phoneValid(form.phone)) errs.phone = 'Enter a 10-digit Indian mobile number that has WhatsApp.'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Check the email address, or leave it empty.'
    setErrors(errs)
    if (Object.keys(errs).length) {
      document.querySelector('.photo-request [aria-invalid="true"], .photo-request .drop.has-error')?.focus?.()
      return
    }
    const fd = new FormData()
    photos.forEach((p) => fd.append('photos', p.file))
    Object.entries({ ...form, source }).forEach(([k, v]) => fd.append(k, v))
    setState('sending')
    setServerError('')
    try {
      const res = await api.sendPhotoRequest(fd)
      setDone(res.id)
      setState('sent')
    } catch (err) {
      setServerError(err.message)
      setState('idle')
    }
  }

  if (done)
    return (
      <div className="request-done panel" role="status">
        <span className="tick big"><Check size={28} aria-hidden="true" /></span>
        <h3>Request sent</h3>
        <p>Your request number is <strong className="mono">{done}</strong>. We’ll send the sample model and quote to your WhatsApp, usually within 24 hours.</p>
        <div className="row-gap">
          <Link className="btn" to={`/track?id=${done}`}>Track this request</Link>
          <button className="btn btn-quiet" onClick={() => { setDone(null); setPhotos([]); setForm({ ...form, notes: '', size: '', qty: 1 }) }}>Send another</button>
        </div>
      </div>
    )

  return (
    <form className="photo-request" onSubmit={submit} noValidate>
      <div className="panel">
        <h3 className="panel-title"><Camera size={20} aria-hidden="true" /> Photos of the object</h3>
        <div
          className={`drop ${errors.photos ? 'has-error' : ''} ${photos.length ? 'has-files' : ''}`}
          tabIndex={0}
          role="button"
          aria-label="Add photos"
          onClick={() => input.current.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current.click())}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-over') }}
          onDragLeave={(e) => e.currentTarget.classList.remove('is-over')}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); addFiles(e.dataTransfer.files) }}
        >
          <span className="drop-icon"><ImagePlus size={26} aria-hidden="true" /></span>
          <strong>{source === 'qr' ? 'Take or choose photos' : 'Drop photos here or click to choose'}</strong>
          <span className="muted small">Up to 6 photos, JPG, PNG or HEIC. Put a coin or ruler in one shot for scale.</span>
        </div>
        <input ref={input} type="file" accept="image/*" multiple capture={source === 'qr' ? 'environment' : undefined} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        {errors.photos && <p className="field-error" role="alert">{errors.photos}</p>}
        {photos.length > 0 && (
          <ul className="photo-grid">
            {photos.map((p) => (
              <li key={p.id}>
                <img src={p.url} alt={`Photo ${p.file.name}`} />
                <button type="button" className="icon-btn" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.file.name}`}><X size={16} aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        )}
        <Field label="What should we make?" as="textarea" rows={3} value={form.notes} onChange={set('notes')} placeholder="For example: a replacement knob for my mixer, same size as the broken one in the photo" />
        <div className="grid-2">
          <Field label="Approximate size" value={form.size} onChange={set('size')} placeholder="e.g. 8 cm tall" />
          <Field label="Material" as="select" value={form.material} onChange={set('material')} hint="Not sure? We’ll suggest one.">
            <option value="">Not sure</option>
            {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Field>
        </div>
        <div className="field">
          <span className="label">How many copies?</span>
          <QtyStepper value={form.qty} onChange={(qty) => setForm({ ...form, qty })} max={10000} label="Number of copies" />
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">Where should we send the quote?</h3>
        <Field label="Your name" value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
        <Field label="WhatsApp number" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" hint="We send the sample model, quote and print updates here." placeholder="98400 12345" />
        <Field label="Email (optional)" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        {serverError && <p className="form-error" role="alert">{serverError}</p>}
        <button className="btn btn-hot btn-block" disabled={state === 'sending'}>{state === 'sending' ? 'Sending photos…' : 'Send for a free quote'}</button>
        <p className="muted small center">No payment now. You only pay after you approve the sample and quote.</p>
      </div>
    </form>
  )
}
