import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, LogOut, Download } from 'lucide-react'
import Field from '../components/Field.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { api } from '../lib/api.js'
import { money, dateTime } from '../lib/format.js'
import { STAGES } from '../../shared/status.js'

const KEY = 'tobor.admin'
const label = (s) => (s === 'placed' ? 'Awaiting payment' : STAGES.find((x) => x.id === s)?.label ?? s)
// files are served through the key-checked admin routes: private Blob files by URL, files on this computer by name
const fileUrl = (key, folder, ref) =>
  /^https:/.test(ref) ? `/api/admin/blob?u=${encodeURIComponent(ref)}&key=${encodeURIComponent(key)}` : `/api/admin/file/${folder}/${ref}?key=${encodeURIComponent(key)}`

function StatusControl({ adminKey, record, onDone }) {
  const options = record.type === 'photo' ? ['modelling', 'paid', 'printing', 'printed', 'shipped', 'delivered'] : ['paid', 'printing', 'printed', 'shipped', 'delivered']
  const [status, setStatus] = useState(options.find((o) => STAGES.findIndex((s) => s.id === o) > STAGES.findIndex((s) => s.id === record.status)) ?? options[0])
  const [ship, setShip] = useState({ courier: '', awb: '', trackingUrl: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api.admin.status(adminKey, record.id, { status, ...ship })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="admin-form" onSubmit={save}>
      <Field label="Move to" as="select" value={status} onChange={(e) => setStatus(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
      </Field>
      {status === 'shipped' && (
        <div className="grid-3">
          <Field label="Courier" value={ship.courier} onChange={(e) => setShip({ ...ship, courier: e.target.value })} placeholder="Delhivery" />
          <Field label="AWB / tracking no." value={ship.awb} onChange={(e) => setShip({ ...ship, awb: e.target.value })} />
          <Field label="Tracking link" value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <button className="btn" disabled={busy}>Update and notify customer</button>
    </form>
  )
}

function QuoteControl({ adminKey, record, onDone }) {
  const [amount, setAmount] = useState(record.quote?.amount ?? '')
  const [note, setNote] = useState(record.quote?.note ?? '')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const sampleRef = file ? await api.uploadFile(file, 'samples', { adminKey }) : ''
      await api.admin.quote(adminKey, record.id, { amount, note, sampleRef })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="admin-form" onSubmit={save}>
      <div className="grid-2">
        <Field label="Quote amount (₹, incl. GST and delivery)" type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Field label="Sample model (STL, OBJ or 3MF)" type="file" accept=".stl,.obj,.3mf" onChange={(e) => setFile(e.target.files[0])} />
      </div>
      <Field label="Note to customer" as="textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Printed in PETG, 82 mm tall, fits the original screw" />
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-hot" disabled={busy}>{record.quote ? 'Update quote and notify' : 'Send sample and quote'}</button>
    </form>
  )
}

function RecordCard({ adminKey, record, notes, onDone }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`admin-card panel ${open ? 'is-open' : ''}`}>
      <button className="admin-card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="mono">{record.id}</span>
        <span>{record.customer.name}</span>
        <span className="muted small">{dateTime(record.createdAt)}</span>
        {record.totals && <span>{money(record.totals.total)}</span>}
        <span className={`pill pill-${record.status}`}>{label(record.status)}</span>
      </button>
      {open && (
        <div className="admin-card-body">
          <p>
            <a href={`tel:${record.customer.phone}`}>{record.customer.phone}</a>
            {record.customer.email && <> · <a href={`mailto:${record.customer.email}`}>{record.customer.email}</a></>}
          </p>
          {record.type === 'photo' && (
            <>
              <ul className="admin-photos">
                {record.photos.map((p) => (
                  <li key={p}><a href={fileUrl(adminKey, 'photos', p)} target="_blank" rel="noreferrer"><img src={fileUrl(adminKey, 'photos', p)} alt="Customer photo" /></a></li>
                ))}
              </ul>
              <dl className="spec-list">
                <div><dt>Notes</dt><dd>{record.details.notes || '—'}</dd></div>
                <div><dt>Size</dt><dd>{record.details.size || '—'}</dd></div>
                <div><dt>Copies</dt><dd>{record.details.qty}</dd></div>
                <div><dt>Material</dt><dd>{record.details.material}</dd></div>
                <div><dt>Sent from</dt><dd>{record.details.source}</dd></div>
              </dl>
              {['received', 'modelling', 'quoted'].includes(record.status) && <QuoteControl adminKey={adminKey} record={record} onDone={onDone} />}
            </>
          )}
          {record.type === 'order' && (
            <>
              <ul className="order-items">
                {record.items.map((i, n) => (
                  <li key={n}>
                    <span>{i.qty} × {i.name}<small>{i.color}{i.kind === 'print' ? `, ${i.material}, ${i.quality}, ${i.infill}% infill, ${i.volumeCm3} cm³${i.needsReview ? ', price needs review' : ''}` : ''}</small></span>
                    {i.kind === 'print' && <a className="link-btn" href={fileUrl(adminKey, 'models', i.fileId)} download={i.name}><Download size={14} aria-hidden="true" /> File</a>}
                  </li>
                ))}
              </ul>
              <p className="small">{[record.address.line1, record.address.line2, record.address.city, record.address.state, record.address.pin].filter(Boolean).join(', ')}</p>
              <p className="small">Payment: {record.payment.method}, {record.payment.status}. Delivery: {record.shipping}.</p>
            </>
          )}
          {record.history.some((h) => h.note) && (
            <ul className="admin-notes">{record.history.filter((h) => h.note).map((h, i) => <li key={i}><span className="muted small">{dateTime(h.at)}</span> {h.note}</li>)}</ul>
          )}
          {record.status !== 'delivered' && record.status !== 'placed' && <StatusControl adminKey={adminKey} record={record} onDone={onDone} />}
          {notes.length > 0 && (
            <div className="admin-wa">
              <p className="small"><strong>WhatsApp messages</strong></p>
              <ul>
                {notes.map((n) => (
                  <li key={n.id} className="small">
                    <span className="muted">{dateTime(n.at)} · {n.status}</span> {n.text}
                    {n.status !== 'sent' && <a className="link-btn" href={n.manualLink} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> Send by hand</a>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY) ?? '')
  const [input, setInput] = useState('')
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('requests')
  const [error, setError] = useState('')

  const refresh = useCallback(async (k = key) => {
    try {
      const d = await api.admin.summary(k)
      setData(d)
      setError('')
      sessionStorage.setItem(KEY, k)
      setKey(k)
    } catch (err) {
      setError(err.message)
      setData(null)
    }
  }, [key])

  useEffect(() => {
    if (key) refresh(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!data)
    return (
      <div className="page"><div className="container narrow">
        <header className="page-head"><h1>Team dashboard</h1><p className="muted">Requests, orders and customer messages.</p></header>
        <form className="panel" onSubmit={(e) => { e.preventDefault(); refresh(input) }}>
          <Field label="Team key" type="password" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="current-password" />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn">Open dashboard</button>
        </form>
      </div></div>
    )

  const notesFor = (id) => data.notifications.filter((n) => n.recordId === id)
  const open = (list, done) => list.filter((r) => (done ? r.status === 'delivered' : r.status !== 'delivered'))
  const tabs = [
    ['requests', `Photo requests (${open(data.requests).length})`],
    ['orders', `Orders (${open(data.orders).length})`],
    ['enquiries', `Enquiries (${data.enquiries.length})`],
  ]

  return (
    <div className="page admin-page">
      <div className="container">
        <header className="page-head row-head">
          <h1>Team dashboard</h1>
          <div className="row-gap">
            <button className="btn btn-quiet" onClick={() => refresh()}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
            <button className="btn btn-quiet" onClick={() => { sessionStorage.removeItem(KEY); setKey(''); setData(null) }}><LogOut size={16} aria-hidden="true" /> Lock</button>
          </div>
        </header>
        <div className="chips" role="tablist">
          {tabs.map(([id, name]) => <button key={id} role="tab" className="chip" aria-selected={tab === id} aria-pressed={tab === id} onClick={() => setTab(id)}>{name}</button>)}
        </div>
        <div className="admin-list">
          {tab === 'requests' && (data.requests.length ? data.requests.map((r) => <RecordCard key={r.id} adminKey={key} record={r} notes={notesFor(r.id)} onDone={() => refresh()} />) : <p className="muted">No photo requests yet.</p>)}
          {tab === 'orders' && (data.orders.length ? data.orders.map((r) => <RecordCard key={r.id} adminKey={key} record={r} notes={notesFor(r.id)} onDone={() => refresh()} />) : <p className="muted">No orders yet.</p>)}
          {tab === 'enquiries' && (data.enquiries.length ? data.enquiries.map((e) => (
            <article key={e.id} className="panel admin-enquiry">
              <p><strong>{e.name}</strong> <span className="muted small">{dateTime(e.createdAt)}, {e.topic}</span></p>
              <p className="small">
                {e.email ? <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.topic}`)}`}>{e.email}</a> : e.contact}
                {e.phone && <> · <a href={`tel:${e.phone}`}>{e.phone}</a></>}
                {e.mail && <span className="muted"> · email {e.mail.business}</span>}
              </p>
              <p>{e.message}</p>
            </article>
          )) : <p className="muted">No enquiries yet.</p>)}
        </div>
      </div>
    </div>
  )
}
