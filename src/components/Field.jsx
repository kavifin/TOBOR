import { useId } from 'react'

/** Labelled control with hint and inline error. Use `as="select"` or `as="textarea"` for other controls. */
export default function Field({ label, hint, error, as: As = 'input', className = '', children, ...props }) {
  const id = useId()
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <As id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </As>
      {hint && !error && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  )
}
