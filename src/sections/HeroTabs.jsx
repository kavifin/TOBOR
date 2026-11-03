import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Printer, KeyRound, Type, UserRound, ArrowRight } from 'lucide-react'
import DesignPreview from '../components/DesignPreview.jsx'
import { FontPicker, ComboPicker } from '../components/DesignControls.jsx'
import { useDraft, setProduct, patchDraft, textDesignFor } from '../lib/designDraft.js'
import { scrollToEl } from '../lib/smooth.js'
import { money } from '../lib/format.js'
import { MINIME, designProductById, normalizeDesign, priceDesign } from '../../shared/designs.js'

const TABS = [
  { id: 'quote', label: 'Print my part', icon: Printer },
  { id: 'tag', label: 'Name keychain', icon: KeyRound },
  { id: 'stand', label: 'Name stand', icon: Type },
  { id: 'minime', label: 'Mini-Me', icon: UserRound },
]

/** Try it here: a name, a font and a colour pair, with the real 3D preview. The full designer takes it from there. */
function HeroDesigner({ product, onOpen }) {
  const spec = designProductById(product)
  const draft = useDraft()
  const design = textDesignFor(draft, product)
  let price = null
  try {
    price = priceDesign(normalizeDesign(design))
  } catch {
    /* nothing typed yet */
  }
  return (
    <div className="hero-designer">
      <div className="hero-designer-controls">
        <label className="hero-input">
          <span>Your name</span>
          <input value={draft.text} maxLength={spec.maxChars} onChange={(e) => patchDraft({ text: e.target.value })} placeholder="Type a name" autoComplete="off" />
        </label>
        <FontPicker compact value={draft.font} onChange={(font) => patchDraft({ font })} />
        <div className="hero-combos">
          <span className="control-label">Colours</span>
          <ComboPicker textColor={draft.textColor} baseColor={draft.baseColor} onChange={patchDraft} />
        </div>
      </div>
      <div className="hero-designer-preview">
        <DesignPreview design={design} label={`${spec.name} preview`} />
        <div className="hero-designer-foot">
          <span className="hero-price">From <strong>{money(price?.unit ?? 0)}</strong></span>
          <button className="btn" onClick={onOpen}>
            More styles and sizes <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HeroTabs({ onTabChange }) {
  const [tab, setTab] = useState('quote')
  const select = (id) => {
    setTab(id)
    if (id !== 'quote') setProduct(id)
    onTabChange?.(id)
  }
  const goDesign = (product) => {
    setProduct(product)
    scrollToEl(document.getElementById('design'))
  }

  return (
    <>
      <div className="hero-tabs" role="tablist" aria-label="What would you like to make?">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`hero-tab-${t.id}`} aria-selected={tab === t.id} aria-controls="hero-panel" onClick={() => select(t.id)}>
            <t.icon size={16} aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>
      <div id="hero-panel" role="tabpanel" aria-labelledby={`hero-tab-${tab}`} className="hero-panel">
        {tab === 'quote' && (
          <>
            <p className="story-lede">Send a photo of anything. We model it, print it and deliver it to your door.</p>
            <div className="story-actions">
              <button className="btn btn-lg" onClick={() => scrollToEl(document.getElementById('quote'))}>Get a free quote</button>
              <Link className="btn btn-lg btn-glass" to="/shop">Shop ready-made prints</Link>
            </div>
          </>
        )}
        {(tab === 'tag' || tab === 'stand') && <HeroDesigner key={tab} product={tab} onOpen={() => goDesign(tab)} />}
        {tab === 'minime' && (
          <div className="hero-minime">
            <p className="story-lede">A cartoon figure of you, modelled from your photos and printed as a keychain, a desk standee or a fridge magnet.</p>
            <ul className="hero-bullets">
              <li>Upload one or two photos</li>
              <li>Approve your cartoon on WhatsApp</li>
              <li>Printed in up to 4 colours, from {money(MINIME.styles[0].price)}</li>
            </ul>
            <div className="story-actions">
              <button className="btn btn-lg" onClick={() => goDesign('minime')}>Make my Mini-Me</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
