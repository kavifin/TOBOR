import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, ImagePlus, X, Plus, Coins, Lightbulb } from 'lucide-react'
import Field from '../components/Field.jsx'
import QtyStepper from '../components/QtyStepper.jsx'
import DesignPreview from '../components/DesignPreview.jsx'
import DesignShowcase from './DesignShowcase.jsx'
import { FontPicker, ColorPicker, ComboPicker, Segmented, ChipRow } from '../components/DesignControls.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { useCart } from '../lib/cart.jsx'
import { api } from '../lib/api.js'
import { money, localId } from '../lib/format.js'
import { useDraft, setProduct, patchDraft, patchOption, patchPhoto, patchMiniMe, textDesignFor } from '../lib/designDraft.js'
import { renderObjectThumb } from '../three/thumbs.js'
import { CATEGORIES, DESIGN_PRODUCTS, MINIME, designProductById, normalizeDesign, priceDesign, designTitle } from '../../shared/designs.js'

export const DESIGN_HASHES = DESIGN_PRODUCTS.map((p) => p.id)

const SCENES = [{ id: 'studio', name: 'Studio' }, { id: 'desk', name: 'Desk' }, { id: 'night', name: 'Night' }]

/** A product image for the cart line, rendered from the live preview. */
const thumbOf = (model) => (model ? renderObjectThumb(model.object.clone(), { angle: 0.35, size: 160 }) : null)

/** A small JPEG of the customer's photo for the cart line (object URLs do not survive a reload). */
async function photoThumb(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const side = 112
    const scale = Math.max(side / bitmap.width, side / bitmap.height)
    const c = document.createElement('canvas')
    c.width = side
    c.height = side
    c.getContext('2d').drawImage(bitmap, (side - bitmap.width * scale) / 2, (side - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

/** Preview backdrop, coin for scale and the price line, shared by every designer. */
function PreviewPanel({ design, photoUrl, label, onModel, children, price, qty, lead }) {
  const [scene, setScene] = useState('studio')
  const [coin, setCoin] = useState(false)
  return (
    <div className="panel design-preview-panel">
      <DesignPreview design={design} photoUrl={photoUrl} coin={coin} scene={scene} label={label} onModel={onModel} />
      <div className="preview-tools">
        <ChipRow options={SCENES} value={scene} onChange={setScene} label="Backdrop" />
        <button type="button" className="mini-chip" aria-pressed={coin} onClick={() => setCoin(!coin)}>
          <Coins size={14} aria-hidden="true" /> Coin for scale
        </button>
      </div>
      <p className="preview-meta muted">Drag to turn it round. Printed in PLA+ and ready in {lead} days.</p>
      {children}
      <div className="price-line">
        <span>{qty > 1 ? `${qty} × ${money(price?.unit ?? 0)}` : 'Price, GST included'}</span>
        <strong>{money(price?.total ?? 0)}</strong>
      </div>
      {price?.discount > 0 && <p className="small muted">Includes a {Math.round(price.discount * 100)}% bulk discount.</p>}
    </div>
  )
}

function PhotoDrop({ photos, setPhotos, max, hint, error }) {
  const input = useRef(null)
  function addFiles(list) {
    const next = [...photos]
    let err = ''
    for (const f of list) {
      if (!f.type.startsWith('image/')) err = 'Only photos can be added here.'
      else if (f.size > 15 * 1024 * 1024) err = `${f.name} is over 15 MB. Try a smaller photo.`
      else if (next.length >= max) err = max === 1 ? 'One photo is enough. Remove the first one to swap it.' : `You can add up to ${max} photos.`
      else next.push({ id: localId(), file: f, url: URL.createObjectURL(f) })
    }
    setPhotos(next, err)
  }
  return (
    <div className="field">
      <span className="control-label">{max === 1 ? 'Your photo' : 'Your photos'}</span>
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
        <strong>{max === 1 ? 'Drop a photo here or click to choose' : 'Drop photos here or click to choose'}</strong>
        <span className="muted small">{hint}</span>
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      {error && <p className="field-error" role="alert">{error}</p>}
      {photos.length > 0 && (
        <ul className="photo-grid">
          {photos.map((p) => (
            <li key={p.id}>
              <img src={p.url} alt={`Photo ${p.file.name}`} />
              <button type="button" className="icon-btn" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id), '')} aria-label={`Remove ${p.file.name}`}><X size={16} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Name, font, colours, size and any style option, plus a matching set of extra names. */
function TextDesigner({ product }) {
  const spec = designProductById(product)
  const draft = useDraft()
  const { add } = useCart()
  const navigate = useNavigate()
  const [qty, setQty] = useState(1)
  const [error, setError] = useState('')
  const [setOpen, setSetOpen] = useState(draft.names.length > 0)
  const model = useRef(null)
  const names = [draft.text, ...draft.names].map((n) => n.trim()).filter(Boolean)

  const design = textDesignFor(draft, product)
  let price = null
  try {
    // each name in a set is priced on its own letters, so the total is the sum of the set
    const first = priceDesign(normalizeDesign(design), qty)
    const total = (names.length ? names : [draft.text]).reduce((sum, text) => sum + priceDesign(normalizeDesign(textDesignFor(draft, product, text)), qty).total, 0)
    price = { ...first, total }
  } catch {
    /* the message shows when they try to add it */
  }

  function addToCart(buy) {
    try {
      const thumb = thumbOf(model.current)
      const list = names.length ? names : [draft.text]
      list.forEach((text, i) => {
        const d = normalizeDesign(textDesignFor(draft, product, text))
        add({ kind: 'design', design: d, name: designTitle(d), qty, thumb: i === 0 ? thumb : null }, { open: !buy && i === list.length - 1 })
      })
      setError('')
      if (buy) navigate('/checkout')
    } catch (e) {
      setError(e.message)
    }
  }

  const setNames = (next) => patchDraft({ names: next })

  return (
    <div className="design-layout">
      <div className="panel design-controls">
        <Field label="Name or words" value={draft.text} onChange={(e) => patchDraft({ text: e.target.value.slice(0, spec.maxChars) })} maxLength={spec.maxChars} placeholder="Type a name" hint={`Up to ${spec.maxChars} characters. Letters, numbers and simple punctuation.`} error={error} autoComplete="off" />
        <div className="field set-field">
          {setOpen ? (
            <>
              <span className="control-label">Matching set: one of each name</span>
              {draft.names.map((n, i) => (
                <div key={i} className="set-row">
                  <input value={n} maxLength={spec.maxChars} placeholder="Another name" aria-label={`Name ${i + 2}`} onChange={(e) => setNames(draft.names.map((x, k) => (k === i ? e.target.value : x)))} />
                  <button type="button" className="icon-btn" aria-label={`Remove name ${i + 2}`} onClick={() => setNames(draft.names.filter((_, k) => k !== i))}><X size={16} aria-hidden="true" /></button>
                </div>
              ))}
              {draft.names.length < 9 && (
                <button type="button" className="link-btn" onClick={() => setNames([...draft.names, ''])}><Plus size={16} aria-hidden="true" /> Add another name</button>
              )}
            </>
          ) : (
            <button type="button" className="link-btn" onClick={() => { setSetOpen(true); setNames(['']) }}><Plus size={16} aria-hidden="true" /> Make a matching set for family or friends</button>
          )}
        </div>
        <div className="field">
          <span className="control-label">Font</span>
          <FontPicker value={draft.font} onChange={(font) => patchDraft({ font })} />
        </div>
        <div className="field">
          <span className="control-label">Colour combinations</span>
          <ComboPicker textColor={draft.textColor} baseColor={draft.baseColor} onChange={patchDraft} />
        </div>
        <ColorPicker label="Letters" value={draft.textColor} onChange={(textColor) => patchDraft({ textColor })} />
        <ColorPicker label={spec.category === 'keychain' ? 'Tag and loop' : 'Base'} value={draft.baseColor} onChange={(baseColor) => patchDraft({ baseColor })} />
        {(spec.options ?? []).map((o) => (
          <Segmented key={o.id} label={o.name} options={o.choices} value={design[o.id] ?? o.choices[0].id} onChange={(v) => patchOption(product, { [o.id]: v })} columns={o.choices.length} />
        ))}
        <Segmented label="Size" options={spec.sizes.map((s) => ({ id: s.id, name: s.name, note: `${s.width} mm wide` }))} value={draft.size} onChange={(size) => patchDraft({ size })} />
        <div className="field">
          <span className="control-label">Quantity{names.length > 1 ? ' of each' : ''}</span>
          <QtyStepper value={qty} onChange={setQty} label="Number of copies" />
        </div>
      </div>
      <PreviewPanel design={design} label={`${spec.name} preview`} onModel={(m) => (model.current = m)} price={price} qty={qty * Math.max(1, names.length)} lead={spec.leadDays}>
        {spec.id === 'lamp' && <p className="small muted"><Lightbulb size={14} aria-hidden="true" /> Comes with a USB cable; the letters glow in their own colour.</p>}
        {names.length > 1 && <p className="small muted">{names.length} names in the set: {names.join(', ')}.</p>}
        <div className="row-gap">
          <button className="btn btn-quiet" onClick={() => addToCart(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> Add to cart
          </button>
          <button className="btn btn-hot" onClick={() => addToCart(true)}>Buy now</button>
        </div>
      </PreviewPanel>
    </div>
  )
}

/** A photo in a printed frame: magnet or stand. */
function PhotoDesigner({ product }) {
  const spec = designProductById(product)
  const draft = useDraft()
  const { add } = useCart()
  const navigate = useNavigate()
  const [photos, setPhotosState] = useState([])
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])
  const setPhotos = (next, err = '') => { setPhotosState(next); setError(err) }

  const design = normalizeDesign({ product, ...draft.photo })
  const price = priceDesign(design, qty)

  async function addToCart(buy) {
    if (!photos.length) return setError('Add the photo to print.')
    setBusy(true)
    setError('')
    try {
      const ref = await api.uploadFile(photos[0].file, 'photos')
      add({ kind: 'design', design, name: designTitle(design), qty, photos: [ref], thumb: await photoThumb(photos[0].file) }, { open: !buy })
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
        <PhotoDrop photos={photos} setPhotos={setPhotos} max={1} hint="A square crop from the middle is printed. Faces and pets work best." error={error} />
        <ColorPicker label="Frame" value={draft.photo.baseColor} onChange={(baseColor) => patchPhoto({ baseColor })} />
        <Segmented label="Size" options={spec.sizes.map((s) => ({ id: s.id, name: s.name, note: `${s.width} mm, ${money(s.price)}` }))} value={draft.photo.size} onChange={(size) => patchPhoto({ size })} />
        <div className="field">
          <span className="control-label">Quantity</span>
          <QtyStepper value={qty} onChange={setQty} label="Number of copies" />
        </div>
      </div>
      <PreviewPanel design={design} photoUrl={photos[0]?.url ?? null} label={`${spec.name} preview`} price={price} qty={qty} lead={spec.leadDays}>
        <p className="small muted">The photo is printed on photo paper and set into the frame by hand.</p>
        <div className="row-gap">
          <button className="btn btn-quiet" disabled={busy} onClick={() => addToCart(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> Add to cart
          </button>
          <button className="btn btn-hot" disabled={busy} onClick={() => addToCart(true)}>{busy ? 'Uploading…' : 'Buy now'}</button>
        </div>
      </PreviewPanel>
    </div>
  )
}

function MiniMeDesigner() {
  const draft = useDraft().minime
  const { add } = useCart()
  const navigate = useNavigate()
  const [photos, setPhotosState] = useState([])
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos])
  const setPhotos = (next, err = '') => { setPhotosState(next); setError(err) }

  const design = normalizeDesign({ product: 'minime', ...draft })
  const price = priceDesign(design, qty)

  async function addToCart(buy) {
    if (!photos.length) return setError('Add at least one photo so we can draw you.')
    setBusy(true)
    setError('')
    try {
      const refs = []
      for (const p of photos) refs.push(await api.uploadFile(p.file, 'photos'))
      add({ kind: 'design', design, name: designTitle(design), qty, photos: refs, thumb: await photoThumb(photos[0].file) }, { open: !buy })
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
        <PhotoDrop photos={photos} setPhotos={setPhotos} max={MINIME.maxPhotos} hint={`One clear face photo, plus a full-length one if you can. Up to ${MINIME.maxPhotos}.`} error={error} />
        <Segmented label="Make it a" options={MINIME.styles.map((s) => ({ id: s.id, name: s.name, note: s.note }))} value={draft.style} onChange={(style) => patchMiniMe({ style })} />
        <Segmented label="Colours in the figure" options={MINIME.colorCounts.map((c) => ({ id: c.id, name: c.name, note: c.extra ? `${c.note}, +${money(c.extra)}` : c.note }))} value={draft.colorCount} onChange={(colorCount) => patchMiniMe({ colorCount })} />
        <ColorPicker label="Main colour" value={draft.accent} onChange={(accent) => patchMiniMe({ accent })} />
        <Field label="Anything we should know? (optional)" as="textarea" rows={2} value={draft.notes} onChange={(e) => patchMiniMe({ notes: e.target.value.slice(0, 300) })} placeholder="Glasses, a favourite jersey, a pet to add…" />
        <div className="field">
          <span className="control-label">Quantity</span>
          <QtyStepper value={qty} onChange={setQty} label="Number of figures" />
        </div>
      </div>
      <PreviewPanel design={design} label="Sample Mini-Me figure, a cartoon hero in Tamil-cinema style" price={price} qty={qty} lead={MINIME.leadDays}>
        <p className="small muted">A sample figure in classic Tamil-cinema hero style. Yours is drawn and modelled from your photos, in your look.</p>
        <ol className="minime-steps">
          <li>Upload your photos and order.</li>
          <li>Within 2 days you get your cartoon on <WhatsAppIcon size={14} /> WhatsApp to approve.</li>
          <li>Once you say yes, it prints and ships in {MINIME.leadDays} days.</li>
        </ol>
        <div className="row-gap">
          <button className="btn btn-quiet" disabled={busy} onClick={() => addToCart(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> Add to cart
          </button>
          <button className="btn btn-hot" disabled={busy} onClick={() => addToCart(true)}>{busy ? 'Uploading…' : 'Buy now'}</button>
        </div>
      </PreviewPanel>
    </div>
  )
}

export default function DesignStudio() {
  const { product } = useDraft()
  const spec = designProductById(product)

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
          <p>Fourteen styles and a Mini-Me figure, all made to order. Type a name, pick a font and colours, and see the real size and the price before you order.</p>
        </div>
        <ul className="trust-strip" aria-label="Good to know">
          <li>Live 3D preview</li>
          <li>Nine PLA+ colours</li>
          <li>Printed in Chennai</li>
          <li>Ships in 2 to 6 days</li>
          <li>WhatsApp support</li>
        </ul>
        <DesignShowcase />
        <div className="designer" id="designer">
          <div className="designer-head">
            <h3>{spec.name}</h3>
            <p className="muted">{spec.tagline}</p>
          </div>
          <div className="style-switch" role="tablist" aria-label="Style">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="style-group">
                <span className="style-group-name">{c.name}</span>
                {DESIGN_PRODUCTS.filter((p) => p.category === c.id).map((p) => (
                  <button key={p.id} role="tab" aria-selected={product === p.id} className="mini-chip" onClick={() => setProduct(p.id)}>
                    {p.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div role="tabpanel" aria-label={`${spec.name} designer`}>
            {spec.kind === 'figure' ? <MiniMeDesigner /> : spec.kind === 'photo' ? <PhotoDesigner key={product} product={product} /> : <TextDesigner key={product} product={product} />}
          </div>
        </div>
      </div>
    </section>
  )
}
