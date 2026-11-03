import { useEffect, useState } from 'react'
import { Sparkles, Share2, Check } from 'lucide-react'
import StyleThumb from '../components/StyleThumb.jsx'
import { WhatsAppIcon } from '../components/Icons.jsx'
import { useDraft, setProduct, patchDraft, textDesignFor } from '../lib/designDraft.js'
import { scrollToEl } from '../lib/smooth.js'
import { money } from '../lib/format.js'
import { SITE } from '../lib/config.js'
import { CATEGORIES, DESIGN_PRODUCTS, MINIME, TEXT_DEFAULTS, startingPrice } from '../../shared/designs.js'

const FILTERS = [{ id: 'all', name: 'Everything' }, ...CATEGORIES]

/** Every style with the visitor's name on it: the gift finder and the way into the designer. */
export default function DesignShowcase() {
  const draft = useDraft()
  const [filter, setFilter] = useState('all')
  const [copied, setCopied] = useState(false)
  const name = draft.text.trim() || TEXT_DEFAULTS.text

  // a shared link, e.g. /?for=Asha#design, fills the name in for the person it's sent to
  useEffect(() => {
    const who = new URLSearchParams(window.location.search).get('for')
    if (who) patchDraft({ text: who.slice(0, 16) })
  }, [])

  const shareUrl = `${window.location.origin}/?for=${encodeURIComponent(name)}#design`
  const shareText = `See every TOBOR gift with the name ${name} on it: ${shareUrl}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.prompt('Copy this link', shareUrl)
    }
  }
  const open = (id) => {
    setProduct(id)
    scrollToEl(document.getElementById('designer'))
  }

  const products = DESIGN_PRODUCTS.filter((p) => filter === 'all' || p.category === filter)

  return (
    <div className="showcase">
      <div className="showcase-head">
        <label className="showcase-name">
          <span>Show every style with the name</span>
          <input value={draft.text} maxLength={16} onChange={(e) => patchDraft({ text: e.target.value })} placeholder={TEXT_DEFAULTS.text} autoComplete="off" />
        </label>
        <div className="showcase-share">
          <a className="btn btn-wa" href={`${SITE.whatsapp ? 'https://wa.me/?text=' : '#'}${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} /> Share with {name}
          </a>
          <button className="btn btn-quiet" onClick={copy}>
            {copied ? <Check size={18} aria-hidden="true" /> : <Share2 size={18} aria-hidden="true" />} {copied ? 'Link copied' : 'Copy link'}
          </button>
        </div>
      </div>
      <div className="chip-row showcase-filters" role="group" aria-label="Filter styles">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.name}
          </button>
        ))}
      </div>
      <ul className="style-grid">
        {products.map((p) => {
          const design = p.kind === 'figure' ? { product: 'minime', ...draft.minime } : p.kind === 'photo' ? { product: p.id, ...draft.photo } : textDesignFor(draft, p.id, name)
          return (
            <li key={p.id} className="style-card">
              <button type="button" className="style-card-btn" onClick={() => open(p.id)} aria-label={`Design a ${p.name}`}>
                <StyleThumb design={design} alt="" />
                <span className="style-card-body">
                  <span className="style-card-name">
                    {p.name}
                    {p.kind === 'figure' && <Sparkles size={14} aria-hidden="true" />}
                  </span>
                  <span className="style-card-tag">{p.tagline}</span>
                  <span className="style-card-foot">
                    <span className="style-card-price">from {money(startingPrice(p, name))}</span>
                    <span className="style-card-lead">{p.leadDays ?? MINIME.leadDays} days</span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
