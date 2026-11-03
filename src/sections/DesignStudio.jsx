import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Type, UserRound, ShoppingBag, ImagePlus, X } from 'lucide-react'
import Field from '../components/Field.jsx'
import QtyStepper from '../components/QtyStepper.jsx'
import DesignPreview from '../components/DesignPreview.jsx'
import { FontPicker, ColorPicker, Segmented } from '../components/DesignControls.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { useCart } from '../lib/cart.jsx'
import { api } from '../lib/api.js'
import { money, localId } from '../lib/format.js'
import { useDraft, setProduct, patchDesign } from '../lib/designDraft.js'
import { renderObjectThumb } from '../three/thumbs.js'
import { TEXT_PRODUCTS, MINIME, normalizeDesign, priceDesign, designTitle } from '../../shared/designs.js'

const TABS = [
  { id: 'keychain', label: 'Name keychain', icon: KeyRound },
  { id: 'stand', label: 'Desk name stand', icon: Type },
  { id: 'minime', label: 'Mini-Me', icon: UserRound },
]
export const DESIGN_HASHES = TABS.map((t) => t.id)

/** A product image for the cart line, rendered from the live preview. */
const thumbOf = (model) => (model ? renderObjectThumb(model.object.clone(), { angle: 0.35, size: 160 }) : null)

/** A small JPEG of the customer's first photo for the cart line (object URLs do not survive a reload). */
async function photoThumb(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const side = 112
    const scale = Math.max(side / bitmap.width, side / bitmap.height)
    const c = document.createElement('canvas')
    c.width = side
    c.height = side
    const ctx = c.getContext('2d')
    ctx.drawImage(bitmap, (side - bitmap.width * scale) / 2, (side - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

function TextDesigner({ product }) {
  const spec = TEXT_PRODUCTS[product]
  const draft = useDraft()[product]
  const set = (patch) => patchDesign(product, patch)
  const { add } = useCart()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const model = useRef(null)

  let price = null
  try {
    price = priceDesign(normalizeDesign({ product, ...draft }), qty)
  } catch {
    /* the message shows when they try to add it */
  }

  function addToCart(buy) {
    try {
      const design = normalizeDesign({ product, ...draft })
      add({ kind: 'design', design, name: designTitle(design), qty, thumb: thumbOf(model.current) }, { open: !buy })
      setError('')
      if (buy) navigate('/checkout')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="design-layout">
      <div className="panel design-controls">
        <Field label="Name or words" value={draft.text} onChange={(e) => set({ text: e.target.value.slice(0, spec.maxChars) })} maxLength={spec.maxChars} placeholder="Type a name" hint={`Up to ${spec.maxChars} characters. Letters, numbers and simple punctuation.`} error={error} autoComplete="off" />
        <div className="field">
          <span className="control-label">Font</span>
          <FontPicker value={draft.font} onChange={(font) => set({ font })} />
        </div>
        <ColorPicker label="Letters" value={draft.textColor} onChange={(textColor) => set({ textColor })} />
        <ColorPicker label={product === 'stand' ? 'Base' : 'Tag'} value={draft.baseColor} onChange={(baseColor) => set({ baseColor })} />
        <Segmented label="Size" options={spec.sizes.map((s) => ({ id: s.id, name: s.name, note: `${s.width} mm wide` }))} value={draft.size} onChange={(size) => set({ size })} />
        <div className="field">
          <span className="control-label">Quantity</span>
          <QtyStepper value={qty} onChange={setQty} label="Number of copies" />
        </div>
      </div>
      <div className="panel design-preview-panel">
        <DesignPreview design={{ product, ...draft }} label={`${spec.name} preview`} onModel={(m) => (model.current = m)} />
        <p className="preview-meta muted">Drag to turn it round. Printed in PLA+ and ready in {spec.leadDays} days.</p>
        <div className="price-line">
          <span>{qty > 1 ? `${qty} × ${money(price?.unit ?? 0)}` : 'Price, GST included'}</span>
          <strong>{money(price?.total ?? 0)}</strong>
        </div>
        {price?.discount > 0 && <p className="small muted">Includes a {Math.round(price.discount * 100)}% bulk discount.</p>}
        <div className="row-gap">
          <button className="btn btn-quiet" onClick={() => addToCart(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> Add to cart
          </button>
          <button className="btn btn-hot" onClick={() => addToCart(true)}>Buy now</button>
        </div>
      </div>
    </div>
  )
}

function MiniMeDesigner() {
  const draft = useDraft().minime
  const set = (patch) => patchDesign('minime', patch)
  const { add } = useCart()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])

  function addFiles(list) {
    const next = [...photos]
    let err = ''
    for (const f of list) {
      if (!f.type.startsWith('image/')) err = 'Only photos can be added here.'
      else if (f.size > 15 * 1024 * 1024) err = `${f.name} is over 15 MB. Try a smaller photo.`
      else if (next.length >= MINIME.maxPhotos) err = `You can add up to ${MINIME.maxPhotos} photos.`
      else next.push({ id: localId(), file: f, url: URL.createObjectURL(f) })
    }
    setPhotos(next)
    setError(err)
  }

  const design = normalizeDesign({ product: 'minime', ...draft })
  const price = priceDesign(design, qty)

  async function addToCart(buy) {
    if (!photos.length) {
      setError('Add at least one photo so we can draw you.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const refs = []
      for (const p of photos) refs.push(await api.uploadFile(p.file, 'photos'))
      const thumb = await photoThumb(photos[0].file)
      add({ kind: 'design', design, name: designTitle(design), qty, photos: refs, thumb }, { open: !buy })
      setPhotos([])
      if (buy) navigate('/checkout')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="design-layout">
      <div className="panel design-controls">
        <div className="field">
          <span className="control-label">Your photos</span>
          <div
            className={`drop ${error && !photos.length ? 'has-error' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => input.current.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current.click())}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-over') }}
            onDragLeave={(e) => e.currentTarget.classList.remove('is-over')}
            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); addFiles(e.dataTransfer.files) }}
          >
            <span className="drop-icon"><ImagePlus size={26} aria-hidden="true" /></span>
            <strong>Drop photos here or click to choose</strong>
            <span className="muted small">One clear face photo, plus a full-length one if you can. Up to {MINIME.maxPhotos}.</span>
          </div>
          <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          {error && <p className="field-error" role="alert">{error}</p>}
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
        </div>
        <Segmented label="Make it a" options={MINIME.styles.map((s) => ({ id: s.id, name: s.name, note: s.note }))} value={draft.style} onChange={(style) => set({ style })} />
        <Segmented label="Colours in the figure" options={MINIME.colorCounts.map((c) => ({ id: c.id, name: c.name, note: c.extra ? `${c.note}, +${money(c.extra)}` : c.note }))} value={draft.colorCount} onChange={(colorCount) => set({ colorCount })} />
        <ColorPicker label="Main colour" value={draft.accent} onChange={(accent) => set({ accent })} />
        <Field label="Anything we should know? (optional)" as="textarea" rows={2} value={draft.notes} onChange={(e) => set({ notes: e.target.value.slice(0, 300) })} placeholder="Glasses, a favourite jersey, a pet to add…" />
        <div className="field">
          <span className="control-label">Quantity</span>
          <QtyStepper value={qty} onChange={setQty} label="Number of figures" />
        </div>
      </div>
      <div className="panel design-preview-panel">
        <DesignPreview design={design} label="Sample Mini-Me figure" />
        <p className="preview-meta muted">A sample figure. Yours is drawn and modelled from your photos.</p>
        <ol className="minime-steps">
          <li>Upload your photos and order.</li>
          <li>Within 2 days you get your cartoon on <WhatsAppIcon size={14} /> WhatsApp to approve.</li>
          <li>Once you say yes, it prints and ships in {MINIME.leadDays} days.</li>
        </ol>
        <div className="price-line">
          <span>{qty > 1 ? `${qty} × ${money(price.unit)}` : 'Price, GST included'}</span>
          <strong>{money(price.total)}</strong>
        </div>
        <div className="row-gap">
          <button className="btn btn-quiet" disabled={busy} onClick={() => addToCart(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> Add to cart
          </button>
          <button className="btn btn-hot" disabled={busy} onClick={() => addToCart(true)}>{busy ? 'Uploading…' : 'Buy now'}</button>
        </div>
      </div>
    </div>
  )
}

export default function DesignStudio() {
  const { product } = useDraft()

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1)
      if (DESIGN_HASHES.includes(h)) setProduct(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <section className="design-section" id="design" aria-labelledby="design-title">
      <div className="container">
        <div className="section-head">
          <h2 id="design-title">Design your own</h2>
          <p>Type a name and watch it become a keychain or a desk stand, or send photos for a Mini-Me figure. You see the size and the price before you order.</p>
        </div>
        <div className="mode-switch" role="tablist" aria-label="What would you like to design?">
          {TABS.map((t) => (
            <button key={t.id} role="tab" id={`design-tab-${t.id}`} aria-selected={product === t.id} aria-controls={`design-panel-${t.id}`} onClick={() => setProduct(t.id)}>
              <t.icon size={18} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`design-panel-${product}`} aria-labelledby={`design-tab-${product}`}>
          {product === 'minime' ? <MiniMeDesigner /> : <TextDesigner key={product} product={product} />}
        </div>
      </div>
    </section>
  )
}
