import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Upload, Box, Zap, Layers, Palette, SlidersHorizontal, Package, FileBox, X, Plus, ShoppingBag, Camera, FileUp, Smartphone } from 'lucide-react'
import Viewer from '../three/Viewer.jsx'
import { loadModelFile, previewable, ACCEPTED, MAX_BYTES, extOf } from '../three/loadModel.js'
import PhotoRequest from './PhotoRequest.jsx'
import QtyStepper from '../components/QtyStepper.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { MATERIALS, COLORS, QUALITIES, estimatePart, byId } from '../../shared/pricing.js'
import { useCart } from '../lib/cart.jsx'
import { api } from '../lib/api.js'
import { money, fileSize, localId } from '../lib/format.js'
import { waLink } from '../lib/config.js'

const MODEL_FILE = /\.(stl|obj|3mf|step|stp)$/i
const DEFAULT_CFG = { material: 'pla-plus', color: 'black', quality: 'standard', infill: 20, qty: 1 }

function FileQuote() {
  const [files, setFiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)
  const { add } = useCart()
  const navigate = useNavigate()

  const current = files.find((f) => f.id === selected)
  const cfg = current?.cfg ?? DEFAULT_CFG
  const setCfg = (patch) => setFiles((fs) => fs.map((f) => (f.id === selected ? { ...f, cfg: { ...f.cfg, ...patch } } : f)))

  async function addFiles(list) {
    setError('')
    const fresh = []
    for (const file of list) {
      if (!MODEL_FILE.test(file.name)) {
        setError(`${file.name} isn’t a 3D file. Use STL, OBJ, 3MF or STEP, or send a photo instead.`)
        continue
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 100 MB. Send it on WhatsApp and we’ll quote it by hand.`)
        continue
      }
      fresh.push({ id: localId(), file, name: file.name, size: file.size, status: previewable(file.name) ? 'loading' : 'manual', cfg: { ...DEFAULT_CFG } })
    }
    if (!fresh.length) return
    setFiles((fs) => [...fs, ...fresh])
    setSelected(fresh[0].id)
    for (const f of fresh.filter((x) => x.status === 'loading')) {
      try {
        const model = await loadModelFile(f.file)
        setFiles((fs) => fs.map((x) => (x.id === f.id ? { ...x, status: 'ready', model } : x)))
      } catch {
        setFiles((fs) => fs.map((x) => (x.id === f.id ? { ...x, status: 'error' } : x)))
      }
    }
  }

  function removeFile(id) {
    const rest = files.filter((f) => f.id !== id)
    setFiles(rest)
    if (selected === id) setSelected(rest[0]?.id ?? null)
  }

  const quote = (f) => (f.status === 'ready' ? estimatePart({ volumeCm3: f.model.volumeCm3, ...f.cfg }) : null)
  const est = current ? quote(current) : null
  const ready = files.filter((f) => f.status === 'ready')
  const total = ready.reduce((s, f) => s + quote(f).total, 0)

  async function addAll(thenCheckout) {
    setBusy(true)
    setError('')
    try {
      for (const f of ready) {
        const up = await api.uploadModel(f.file)
        const volumeCm3 = up.volumeCm3 ?? f.model.volumeCm3
        add(
          {
            kind: 'print', fileId: up.fileId, name: f.name, volumeCm3,
            material: f.cfg.material, materialName: byId(MATERIALS, f.cfg.material).name,
            quality: f.cfg.quality, qualityName: byId(QUALITIES, f.cfg.quality).name,
            color: f.cfg.color, infill: f.cfg.infill, qty: f.cfg.qty,
          },
          { open: !thenCheckout },
        )
      }
      setFiles((fs) => fs.filter((f) => f.status !== 'ready'))
      setSelected(null)
      if (thenCheckout) navigate('/checkout')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const material = byId(MATERIALS, cfg.material)

  return (
    <div className="studio">
      <div className="studio-left">
        <div className="panel">
          <h3 className="panel-title"><Upload size={20} aria-hidden="true" /> Upload model</h3>
          {files.length === 0 ? (
            <div
              className="drop drop-tall"
              tabIndex={0}
              role="button"
              aria-label="Upload 3D model files"
              onClick={() => input.current.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.current.click())}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-over') }}
              onDragLeave={(e) => e.currentTarget.classList.remove('is-over')}
              onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-over'); addFiles(e.dataTransfer.files) }}
            >
              <span className="drop-icon"><FileUp size={28} aria-hidden="true" /></span>
              <strong>Drop your 3D files here</strong>
              <span className="muted">or click to browse. Add several files at once.</span>
              <span className="muted small">STL, OBJ, 3MF or STEP, up to 100 MB each</span>
            </div>
          ) : (
            <>
              <ul className="file-list" aria-label="Uploaded files">
                {files.map((f) => {
                  const q = quote(f)
                  return (
                    <li key={f.id} className={f.id === selected ? 'is-selected' : ''}>
                      <button className="file-pick" onClick={() => setSelected(f.id)} aria-pressed={f.id === selected}>
                        <FileBox size={20} aria-hidden="true" />
                        <span className="file-name">{f.name}</span>
                        <span className="file-meta">
                          {f.status === 'loading' && 'Reading file…'}
                          {f.status === 'error' && 'Could not read this file'}
                          {f.status === 'manual' && 'Quoted by our team'}
                          {f.status === 'ready' && `${f.model.sizeMm.x} × ${f.model.sizeMm.y} × ${f.model.sizeMm.z} mm, ${fileSize(f.size)}`}
                        </span>
                        {q && <span className="file-price">{money(q.total)}</span>}
                      </button>
                      <button className="icon-btn" onClick={() => removeFile(f.id)} aria-label={`Remove ${f.name}`}><X size={16} aria-hidden="true" /></button>
                    </li>
                  )
                })}
              </ul>
              <button className="link-btn" onClick={() => input.current.click()}><Plus size={16} aria-hidden="true" /> Add another file</button>
            </>
          )}
          <input ref={input} type="file" accept={ACCEPTED} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className={`panel preview-panel ${current?.status === 'ready' ? '' : 'is-empty'}`}>
          <h3 className="panel-title"><Box size={20} aria-hidden="true" /> 3D preview</h3>
          {current?.status === 'ready' ? (
            <>
              <Viewer object={current.model.object} color={byId(COLORS, cfg.color).hex} keep label={`Preview of ${current.name}`} className="preview-viewer" />
              <p className="preview-meta mono">
                {current.model.sizeMm.x} × {current.model.sizeMm.y} × {current.model.sizeMm.z} mm, {current.model.volumeCm3.toFixed(1)} cm³
              </p>
              <p className="muted small">Drag to rotate. Scroll or pinch to zoom.</p>
            </>
          ) : current?.status === 'manual' ? (
            <div className="preview-empty">
              <p><strong>{extOf(current.name).toUpperCase()} files need a quick look from our team.</strong></p>
              <p className="muted">Send the file on WhatsApp and we’ll reply with a price, usually within a few hours.</p>
              <a className="btn btn-wa" href={waLink(`Hi TOBOR, I'd like a quote for my ${extOf(current.name).toUpperCase()} file "${current.name}".`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Send on WhatsApp</a>
            </div>
          ) : current?.status === 'error' ? (
            <div className="preview-empty">
              <p><strong>We couldn’t read {current.name}.</strong></p>
              <p className="muted">Export it again as STL from your design app, or send it on WhatsApp and we’ll take a look.</p>
            </div>
          ) : (
            <div className="preview-empty">
              <span className="drop-icon"><Box size={28} aria-hidden="true" /></span>
              <p className="muted">{current?.status === 'loading' ? 'Building the preview…' : 'Upload a 3D model to see it here'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="panel studio-config">
        <h3 className="panel-title"><Zap size={20} aria-hidden="true" /> Configure your print</h3>
        <fieldset disabled={!current || current.status !== 'ready'} className="config-fields">
          <div className="grid-2">
            <div className="field">
              <label htmlFor="cfg-mat"><Package size={16} aria-hidden="true" /> Material</label>
              <select id="cfg-mat" value={cfg.material} onChange={(e) => setCfg({ material: e.target.value })}>
                {MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className="field-hint">{material.note}</p>
            </div>
            <div className="field">
              <span className="label" id="cfg-color"><Palette size={16} aria-hidden="true" /> Colour: {byId(COLORS, cfg.color).name}</span>
              <div className="swatch-row" role="radiogroup" aria-labelledby="cfg-color">
                {COLORS.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={cfg.color === c.id} aria-label={c.name} className="swatch" style={{ '--c': c.hex }} onClick={() => setCfg({ color: c.id })} />
                ))}
              </div>
            </div>
          </div>
          <div className="field">
            <span className="label" id="cfg-q"><Layers size={16} aria-hidden="true" /> Quality</span>
            <div className="segmented" role="radiogroup" aria-labelledby="cfg-q">
              {QUALITIES.map((q) => (
                <button key={q.id} type="button" role="radio" aria-checked={cfg.quality === q.id} onClick={() => setCfg({ quality: q.id })}>
                  <strong>{q.name}</strong>
                  <small>{q.layer} mm, {q.note.toLowerCase()}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="cfg-infill" className="label-row"><span><SlidersHorizontal size={16} aria-hidden="true" /> Infill</span><output htmlFor="cfg-infill" className="hot-num">{cfg.infill}%</output></label>
            <input id="cfg-infill" type="range" min={10} max={100} step={5} value={cfg.infill} onChange={(e) => setCfg({ infill: +e.target.value })} style={{ '--fill': `${((cfg.infill - 10) / 90) * 100}%` }} />
            <div className="range-labels muted small"><span>Light (10%)</span><span>Medium (50%)</span><span>Solid (100%)</span></div>
          </div>
          <div className="field">
            <span className="label">Copies</span>
            <QtyStepper value={cfg.qty} onChange={(qty) => setCfg({ qty })} label="Number of copies" />
          </div>
        </fieldset>

        {est ? (
          <div className="price-card" aria-live="polite">
            <div className="price-main">
              <span>{files.length > 1 ? 'This part' : 'Your price'}</span>
              <strong>{money(est.total)}</strong>
            </div>
            <ul className="price-facts">
              <li>{money(est.unit)} each{est.discount ? `, ${Math.round(est.discount * 100)}% bulk discount` : ''}</li>
              <li>About {est.grams} g of filament, {est.hours} h of printing per part</li>
              <li>Ships in 2–4 working days, GST included</li>
            </ul>
            {ready.length > 1 && <p className="price-all">All {ready.length} parts: <strong>{money(total)}</strong></p>}
          </div>
        ) : (
          <div className="price-card is-empty">
            <Upload size={20} aria-hidden="true" />
            <strong>Upload your model to see the price</strong>
            <span className="muted small">Instant pricing, no sign-up needed</span>
          </div>
        )}
        <div className="row-gap">
          <button className="btn btn-quiet" disabled={!ready.length || busy} onClick={() => addAll(false)}>
            <ShoppingBag size={18} aria-hidden="true" /> {ready.length > 1 ? `Add ${ready.length} parts to cart` : 'Add to cart'}
          </button>
          <button className="btn btn-hot" disabled={!ready.length || busy} onClick={() => addAll(true)}>
            {busy ? 'Uploading…' : ready.length ? 'Buy now' : 'Upload a file first'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PhoneQr() {
  const [src, setSrc] = useState(null)
  const [url, setUrl] = useState('')
  useEffect(() => {
    let alive = true
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const base = local ? api.config().then((c) => c.lanUrl || window.location.origin).catch(() => window.location.origin) : Promise.resolve(window.location.origin)
    base.then((origin) => {
      const target = `${origin}/send`
      if (!alive) return
      setUrl(target)
      QRCode.toDataURL(target, { margin: 1, width: 280, color: { dark: '#121A3A', light: '#FFFFFF' } }).then((d) => alive && setSrc(d))
    })
    return () => (alive = false)
  }, [])
  return (
    <aside className="qr-card">
      {src && <img src={src} alt="QR code that opens the TOBOR photo upload page on your phone" width="140" height="140" />}
      <div>
        <h3><Smartphone size={18} aria-hidden="true" /> Object in front of you?</h3>
        <p className="muted">Scan with your phone camera to take photos and send them straight from your phone.</p>
        {url && <p className="small mono qr-url">{url.replace(/^https?:\/\//, '')}</p>}
      </div>
    </aside>
  )
}

export default function QuoteStudio() {
  const [mode, setMode] = useState('file')
  const tabs = useMemo(
    () => [
      { id: 'file', label: 'I have a 3D file', icon: FileUp },
      { id: 'photo', label: 'I have a photo', icon: Camera },
    ],
    [],
  )
  useEffect(() => {
    const fromHash = () => window.location.hash === '#photo' && setMode('photo')
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  return (
    <section className="quote-section" id="quote" aria-labelledby="quote-title">
      <div className="container">
        <div className="section-head">
          <h2 id="quote-title">Print your part</h2>
          <p>Upload a 3D file for an instant price, or send a photo and our designers will model it for you.</p>
        </div>
        <div className="mode-switch" role="tablist" aria-label="How do you want to start?">
          {tabs.map((t) => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={mode === t.id} aria-controls={`panel-${t.id}`} onClick={() => setMode(t.id)}>
              <t.icon size={18} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
          {mode === 'file' ? (
            <FileQuote />
          ) : (
            <div className="photo-layout">
              <PhotoRequest />
              <PhoneQr />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
