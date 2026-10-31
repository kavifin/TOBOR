// The TOBOR logo. `light` is for dark backgrounds; `hero` prints itself in once on load.
const SOURCES = {
  sm: '/brand/tobor-logo-sm.webp',
  hero: '/brand/tobor-logo.webp',
  lg: '/brand/tobor-logo-light.webp',
}

export default function Wordmark({ size = 'sm', alt = '' }) {
  return (
    <span className={`wordmark wm-${size}`}>
      <img src={SOURCES[size] ?? SOURCES.sm} alt={alt} width="1720" height="432" decoding="async" draggable="false" />
      {size === 'hero' && <span className="wm-nozzle" aria-hidden="true" />}
    </span>
  )
}
