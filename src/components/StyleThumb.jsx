import { useEffect, useState } from 'react'
import { buildDesignModel } from '../three/text3d.js'
import { renderObjectThumb } from '../three/thumbs.js'
import { disposeObject } from '../three/stage.js'

const cache = new Map()
let queue = Promise.resolve()

/** Render one design to an image, one at a time so a grid of styles doesn't stall the page. */
function thumbFor(design, size) {
  const key = JSON.stringify([design, size])
  if (cache.has(key)) return cache.get(key)
  const p = (queue = queue.then(async () => {
    const m = await buildDesignModel(design)
    const url = renderObjectThumb(m.object, { angle: 0.3, size })
    disposeObject(m.object)
    return url
  }).catch(() => null))
  cache.set(key, p)
  return p
}

/** A product-style image of a design, rendered off screen and cached. */
export default function StyleThumb({ design, size = 360, alt = '', className = '' }) {
  const [src, setSrc] = useState(null)
  const key = JSON.stringify(design)
  useEffect(() => {
    let alive = true
    thumbFor(design, size).then((url) => alive && url && setSrc(url))
    return () => (alive = false)
  }, [key, size]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`style-thumb ${src ? 'is-ready' : ''} ${className}`}>
      {src ? <img src={src} alt={alt} loading="lazy" /> : <span className="thumb-wait" aria-hidden="true" />}
    </div>
  )
}
