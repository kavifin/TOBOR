// One off-screen renderer turns procedural models into product images, so grids of
// products don't each need their own WebGL context.
import * as THREE from 'three'
import { buildShape } from './shapes.js'
import { createStage, frameObject, disposeObject } from './stage.js'

const cache = new Map()
let ctx

function context() {
  if (ctx) return ctx
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(720, 720, false)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const { scene } = createStage()
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100)
  ctx = { renderer, scene, camera }
  return ctx
}

/**
 * Product-style image of any ready-made object (standing on y = 0). Caller keeps the object.
 * `size` renders a smaller square, e.g. a cart thumbnail that has to fit in localStorage.
 */
export function renderObjectThumb(object, { angle = 0.35, size = 720 } = {}) {
  try {
    const { renderer, scene, camera } = context()
    object.rotation.y = angle
    scene.add(object)
    frameObject(camera, object, { distance: 1.02 })
    renderer.render(scene, camera)
    let url
    if (size < 720) {
      const c = document.createElement('canvas')
      c.width = c.height = size
      c.getContext('2d').drawImage(renderer.domElement, 0, 0, size, size)
      url = c.toDataURL('image/webp', 0.8)
    } else {
      url = renderer.domElement.toDataURL('image/webp', 0.9)
    }
    scene.remove(object)
    return url
  } catch {
    return null
  }
}

export function renderThumb(shape, colorHex, { angle = 0 } = {}) {
  const key = `${shape}|${colorHex}|${angle}`
  if (cache.has(key)) return cache.get(key)
  try {
    const { renderer, scene, camera } = context()
    const object = buildShape(shape, colorHex)
    object.rotation.y = -0.35 + angle
    scene.add(object)
    frameObject(camera, object, { distance: 1.02 })
    renderer.render(scene, camera)
    const url = renderer.domElement.toDataURL('image/webp', 0.9)
    scene.remove(object)
    disposeObject(object)
    cache.set(key, url)
    return url
  } catch {
    return null // WebGL unavailable: cards fall back to a flat colour tile
  }
}
