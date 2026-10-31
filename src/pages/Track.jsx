import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Truck, PartyPopper, Box } from 'lucide-react'
import Field from '../components/Field.jsx'
import StatusTimeline from '../components/StatusTimeline.jsx'
import { usePayment } from '../components/Payment.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import Viewer from '../three/Viewer.jsx'
import { loadModelFile } from '../three/loadModel.js'
import { api } from '../lib/api.js'
import { money, dateTime } from '../lib/format.js'
import { waLink } from '../lib/config.js'
import { STAGES, ORDER_STAGES, PLACED_STAGE } from '../../shared/status.js'
import { rememberTracking } from './Checkout.jsx'

function storedPhone(id) {
  try {
    const s = JSON.parse(sessionStorage.getItem('tobor.track'))
    return s?.id === id ? s.phone : ''
  } catch {
    return ''
  }
}

function SamplePreview({ url }) {
  const [model, setModel] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    fetch(url)
      .then((r) => r.blob())
      .then((b) => loadModelFile(new File([b], url.split('/').pop())))
      .then((m) => alive && setModel(m))
      .catch(() => alive && setFailed(true))
    return () => (alive = false)
  }, [url])
  if (failed) return <a className="btn btn-quiet" href={url} download>Download the sample model</a>
  if (!model) return <div className="sample-viewer preview-empty"><Box size={28} aria-hidden="true" /><p className="muted">Loading the sample…</p></div>
  return <Viewer object={model.object} color="#c9ccd6" className="sample-viewer" label="Sample 3D model for your approval" />
}

function QuoteBox({ record, phone, onChange }) {
  const { pay, dialog } = usePayment()
  const [changes, setChanges] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    setBusy(true)
    setError('')
    try {
      if (await pay(record.id)) onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function sendChanges(e) {
    e.preventDefault()
    if (!changes.trim()) return setError('Tell us what to change in the sample.')
    setBusy(true)
    setError('')
    try {
      await api.requestChanges(record.id, phone, changes)
      onChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel quote-box" aria-labelledby="qb-title">
      <h2 id="qb-title">Your sample and quote</h2>
      {record.quote.sampleUrl && <SamplePreview url={record.quote.sampleUrl} />}
      {record.quote.note && <p className="quote-note">{record.quote.note}</p>}
      <p className="sum-row big"><span>Quote</span><strong>{money(record.quote.amount)}</strong></p>
      <p className="muted small">Includes modelling, printing {record.details?.qty ?? 1} {record.details?.qty === 1 ? 'copy' : 'copies'}, GST and standard delivery.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      {asking ? (
        <form onSubmit={sendChanges}>
          <Field label="What should we change?" as="textarea" rows={3} value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="For example: make the hole 2 mm wider" />
          <div className="row-gap">
            <button className="btn" disabled={busy}>Send changes</button>
            <button type="button" className="btn btn-quiet" onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="row-gap">
          <button className="btn btn-quiet" onClick={() => setAsking(true)}>Request changes</button>
          <button className="btn btn-hot" disabled={busy} onClick={approve}>Approve and pay {money(record.quote.amount)}</button>
        </div>
      )}
      {dialog}
    </section>
  )
}

export default function Track() {
  const [params, setParams] = useSearchParams()
  const [id, setId] = useState(params.get('id') ?? '')
  const [phone, setPhone] = useState(() => storedPhone(params.get('id')))
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { pay, dialog } = usePayment()
  const fresh = params.get('new') === '1'

  async function load(theId = id, thePhone = phone) {
    setLoading(true)
    setError('')
    try {
      const r = await api.track(theId.trim().toUpperCase(), thePhone)
      setRecord(r)
      rememberTracking(r.id, thePhone)
      if (params.get('id') !== r.id) setParams({ id: r.id }, { replace: true })
    } catch (err) {
      setRecord(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id && phone) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submit(e) {
    e.preventDefault()
    if (!id.trim() || phone.replace(/\D/g, '').length < 4) return setError('Enter your order or request ID and the last 4 digits of your phone number.')
    load()
  }

  async function payNow() {
    try {
      if (await pay(record.id)) load()
    } catch (err) {
      setError(err.message)
    }
  }

  const stages = record?.type === 'photo' ? STAGES : [PLACED_STAGE, ...ORDER_STAGES]
  const stage = stages.find((s) => s.id === record?.status)

  return (
    <div className="page track-page">
      <div className="container narrow">
        {!record && (
          <>
            <header className="page-head">
              <h1>Track your order</h1>
              <p>Enter the ID from your WhatsApp message or confirmation, like TB-O5012 or TB-R1042.</p>
            </header>
            <form className="panel track-form" onSubmit={submit} noValidate>
              <div className="grid-2">
                <Field label="Order or request ID" value={id} onChange={(e) => setId(e.target.value)} placeholder="TB-O5012" autoCapitalize="characters" />
                <Field label="Phone number, last 4 digits" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2345" hint="Keeps your order details private." />
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn" disabled={loading}><Search size={18} aria-hidden="true" /> {loading ? 'Looking…' : 'Track'}</button>
            </form>
          </>
        )}

        {record && (
          <div className="track-result">
            {fresh && record.type === 'order' && (
              <div className="thanks panel" role="status">
                <PartyPopper size={28} aria-hidden="true" />
                <div>
                  <h1>Thank you, {record.firstName}!</h1>
                  <p>{record.status === 'placed' ? 'Your order is saved. Finish the payment below to send it to the print queue.' : 'Your order is confirmed. We’ve sent the details to your WhatsApp.'}</p>
                </div>
              </div>
            )}
            <header className="track-head">
              <div>
                <p className="muted small">{record.type === 'photo' ? 'Photo request' : 'Order'} placed {dateTime(record.createdAt)}</p>
                <h2 className="mono">{record.id}</h2>
              </div>
              <span className={`pill pill-${record.status}`}>{stage?.label}</span>
            </header>

            {record.status === 'placed' && (
              <section className="panel attention">
                <p><strong>Payment pending.</strong> Your order prints as soon as the payment goes through.</p>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="btn btn-hot" onClick={payNow}>Pay {money(record.totals.total)}</button>
              </section>
            )}
            {record.status === 'quoted' && record.quote && <QuoteBox record={record} phone={phone} onChange={() => load()} />}
            {record.shipment && (
              <section className="panel ship-box">
                <Truck size={22} aria-hidden="true" />
                <p>With <strong>{record.shipment.courier}</strong>{record.shipment.awb && <>, tracking number <span className="mono">{record.shipment.awb}</span></>}.</p>
                {record.shipment.trackingUrl && <a className="btn btn-quiet" href={record.shipment.trackingUrl} target="_blank" rel="noopener noreferrer">Track with courier</a>}
              </section>
            )}

            <div className="track-grid">
              <section className="panel">
                <h2 className="panel-title">Progress</h2>
                <StatusTimeline record={record} />
              </section>
              <section className="panel">
                <h2 className="panel-title">{record.type === 'photo' ? 'Your request' : 'Items'}</h2>
                {record.type === 'photo' ? (
                  <dl className="spec-list">
                    {record.details.notes && <div><dt>What to make</dt><dd>{record.details.notes}</dd></div>}
                    <div><dt>Copies</dt><dd>{record.details.qty}</dd></div>
                    <div><dt>Material</dt><dd>{record.details.material}</dd></div>
                    {record.details.size && <div><dt>Size</dt><dd>{record.details.size}</dd></div>}
                  </dl>
                ) : (
                  <>
                    <ul className="order-items">
                      {record.items.map((i, n) => (
                        <li key={n}><span>{i.qty} × {i.name}<small>{i.color}{i.kind === 'print' ? `, ${i.material}, ${i.quality}` : ''}</small></span><span>{money(i.unitPrice * i.qty)}</span></li>
                      ))}
                    </ul>
                    <dl className="totals">
                      <div><dt>Subtotal</dt><dd>{money(record.totals.subtotal)}</dd></div>
                      <div><dt>Delivery</dt><dd>{record.totals.shipping ? money(record.totals.shipping) : 'Free'}</dd></div>
                      {record.totals.fee > 0 && <div><dt>Cash handling</dt><dd>{money(record.totals.fee)}</dd></div>}
                      <div className="grand"><dt>Total</dt><dd>{money(record.totals.total)}</dd></div>
                    </dl>
                    <p className="muted small">Payment: {record.payment?.status}</p>
                  </>
                )}
              </section>
            </div>

            <div className="row-gap">
              <a className="btn btn-wa" href={waLink(`Hi TOBOR, I have a question about ${record.id}.`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Ask about this order</a>
              <button className="btn btn-quiet" onClick={() => { setRecord(null); setParams({}) }}>Track another order</button>
              <Link className="btn btn-quiet" to="/shop">Back to shop</Link>
            </div>
          </div>
        )}
      </div>
      {dialog}
    </div>
  )
}
