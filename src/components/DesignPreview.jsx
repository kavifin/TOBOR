import { useEffect, useRef, useState } from 'react'
import Viewer from '../three/Viewer.jsx'
import { buildDesignModel, addCoin } from '../three/text3d.js'

/**
 * Live 3D preview of a design. Rebuilds a moment after the last change and keeps the previous
 * model while the next one loads. `onModel` receives { object, mm } so the caller can make a
 * thumbnail; `coin` lays a 27 mm coin beside the model; `scene` picks the backdrop.
 */
export default function DesignPreview({ design, photoUrl = null, coin = false, scene = 'studio', label = '3D preview of your design', className = '', onModel }) {
  const [model, setModel] = useState(null)
  const latest = useRef(0)
  const notify = useRef(onModel)
  notify.current = onModel
  const key = JSON.stringify([design, photoUrl, coin])

  useEffect(() => {
    const id = ++latest.current
    const isText = design.product !== 'minime' && !design.product?.startsWith('photo')
    if (isText && !design.text?.trim()) return undefined
    const t = setTimeout(async () => {
      try {
        const m = await buildDesignModel(design, { photoUrl })
        if (id !== latest.current) return
        if (coin) addCoin(m)
        setModel(m)
        notify.current?.(m)
      } catch {
        /* an unsupported character or a font still loading: keep the last model */
      }
    }, isText ? 160 : 0)
    return () => clearTimeout(t)
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`design-preview ${className}`} data-scene={scene}>
      <Viewer object={model?.object} label={label} className="design-viewer" />
      {model && (
        <span className="size-readout" aria-live="polite">
          {model.mm.width} × {model.mm.height} mm
        </span>
      )}
    </div>
  )
}
