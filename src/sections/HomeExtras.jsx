import { useState } from 'react'
import { X } from 'lucide-react'
import { MATERIALS } from '../../shared/pricing.js'
import { GALLERY } from '../data/gallery.js'

export function Materials() {
  return (
    <section className="materials" aria-labelledby="mat-title">
      <div className="container">
        <div className="section-head">
          <h2 id="mat-title">Which material should I pick?</h2>
          <p>Every quote can switch material. If you’re unsure, tell us what the part has to survive and we’ll choose.</p>
        </div>
        <div className="table-wrap">
          <table className="mat-table">
            <thead>
              <tr><th scope="col">Material</th><th scope="col">Best for</th><th scope="col">Price per gram</th></tr>
            </thead>
            <tbody>
              {MATERIALS.map((m) => (
                <tr key={m.id}><th scope="row">{m.name}</th><td>{m.note}</td><td className="num">₹{m.perGram}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export function Gallery() {
  const [open, setOpen] = useState(null)
  if (!GALLERY.length) return null
  return (
    <section className="gallery" aria-labelledby="gallery-title">
      <div className="container">
        <div className="section-head">
          <h2 id="gallery-title">What we’ve printed for customers</h2>
          <p>Every photo is a real order. Tap any photo to see it larger.</p>
        </div>
        <ul className="gallery-grid">
          {GALLERY.map((g, i) => (
            <li key={g.src} className={g.wide ? 'wide' : g.tall ? 'tall' : ''}>
              <button onClick={() => setOpen(i)} aria-label={`Open photo: ${g.alt}`}>
                <img src={g.src} alt={g.alt} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={GALLERY[open].alt} onClick={() => setOpen(null)} onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}>
          <img src={GALLERY[open].src} alt={GALLERY[open].alt} />
          <button className="icon-btn" autoFocus onClick={() => setOpen(null)} aria-label="Close photo"><X size={24} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  )
}

const FAQ = [
  ['I don’t have a 3D file. Can you still print my idea?', 'Yes. Send photos or a sketch with rough measurements. Our designers build the 3D model, send you a sample to check and a quote. Modelling is included in the quote for most everyday parts.'],
  ['How long does it take?', 'File orders and shop products ship in 2 to 4 working days. Photo requests get a sample and quote within 24 hours, then 2 to 5 days to print depending on quantity.'],
  ['How do I pay?', 'UPI, cards and net banking through a secure payment page, or cash on delivery for shop orders. For photo requests you pay only after you approve the quote.'],
  ['What if the part doesn’t fit?', 'Tell us within 7 days with a photo. If we got a measurement wrong, we reprint it free. If the size you gave changed, we reprint at material cost.'],
  ['Do you print in bulk for businesses?', 'Yes. Quantities over 25 get at least 15% off automatically, and we can quote larger runs, enclosures and jigs by hand. Use the form below or WhatsApp us.'],
  ['Where do you deliver?', 'All over India through our courier partners. You get the tracking number on WhatsApp the moment your parcel leaves the workshop.'],
]

export function Faq() {
  return (
    <section className="faq" id="faq" aria-labelledby="faq-title">
      <div className="container narrow">
        <h2 id="faq-title">Questions people ask</h2>
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
