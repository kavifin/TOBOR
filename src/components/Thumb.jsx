import { useEffect, useState } from 'react'
import { renderThumb } from '../three/thumbs.js'
import { byId, COLORS } from '../../shared/pricing.js'

/** Product image: a real photo when the product has one, else a render of its 3D model. */
export default function Thumb({ product, color, alt = '', className = '' }) {
  const hex = byId(COLORS, color ?? product.color)?.hex
  const [src, setSrc] = useState(product.photos?.[0] ?? null)
  useEffect(() => {
    if (product.photos?.[0]) return
    const idle = window.requestIdleCallback ?? ((cb) => setTimeout(cb, 1))
    const cancel = window.cancelIdleCallback ?? clearTimeout
    const id = idle(() => setSrc(renderThumb(product.shape, hex)))
    return () => cancel(id)
  }, [product, hex])
  return (
    <div className={`thumb ${className}`} style={{ '--tint': hex }}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <span className="thumb-wait" aria-hidden="true" />}
    </div>
  )
}
