import { COLORS } from '../../shared/pricing.js'
import { FONTS, COLOR_COMBOS } from '../../shared/designs.js'

/** Font choice, shown as "Aa" samples set in a similar screen face. */
export function FontPicker({ value, onChange, compact = false }) {
  return (
    <div className={`font-chips ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="Font">
      {FONTS.map((f) => (
        <button key={f.id} type="button" role="radio" aria-checked={value === f.id} className="font-chip" onClick={() => onChange(f.id)} title={f.note}>
          <span className={`font-sample font-${f.id}`} aria-hidden="true">Aa</span>
          {f.name}
        </button>
      ))}
    </div>
  )
}

/** Two-colour combinations that print well, as quick picks above the swatches. */
export function ComboPicker({ textColor, baseColor, onChange }) {
  const hex = (id) => COLORS.find((c) => c.id === id)?.hex
  return (
    <div className="combo-row" role="group" aria-label="Colour combinations">
      {COLOR_COMBOS.map((c) => {
        const on = c.textColor === textColor && c.baseColor === baseColor
        return (
          <button key={c.id} type="button" className="combo" aria-pressed={on} onClick={() => onChange({ textColor: c.textColor, baseColor: c.baseColor })} title={c.name}>
            <span className="combo-swatch" style={{ '--base': hex(c.baseColor), '--text': hex(c.textColor) }} aria-hidden="true">Aa</span>
            <span className="sr-only">{c.name}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A row of colour swatches. */
export function ColorPicker({ label, value, onChange, colors = COLORS, large = false }) {
  const current = colors.find((c) => c.id === value)
  return (
    <div className="color-field">
      {label && (
        <span className="control-label">
          {label}: <strong>{current?.name}</strong>
        </span>
      )}
      <div className="swatch-row" role="radiogroup" aria-label={label}>
        {colors.map((c) => (
          <button key={c.id} type="button" role="radio" aria-checked={value === c.id} className={`swatch ${large ? 'swatch-lg' : ''}`} style={{ '--c': c.hex }} onClick={() => onChange(c.id)} aria-label={c.name} title={c.name} />
        ))}
      </div>
    </div>
  )
}

/** Boxed options with a name and a short note, for sizes, styles and colour counts. */
export function Segmented({ label, options, value, onChange, columns }) {
  return (
    <div className="seg-field">
      {label && <span className="control-label">{label}</span>}
      <div className="segmented" role="radiogroup" aria-label={label} style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)}>
            <strong>{o.name}</strong>
            {o.note && <small>{o.note}</small>}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Small toggle chips, e.g. preview scenes or the coin for scale. */
export function ChipRow({ label, options, value, onChange }) {
  return (
    <div className="chip-field" role="group" aria-label={label}>
      {label && <span className="control-label">{label}</span>}
      <div className="chip-row">
        {options.map((o) => (
          <button key={o.id} type="button" className="mini-chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}
