// Live 3D models for "Design your own". Each style is built in millimetres, then scaled so a
// 60 mm keychain is 0.6 units wide, in scale with the shop models. Every model stands on y = 0,
// centred on x and z, facing +z. Builders return { object, inner, mm }: the scene object, the
// millimetre-space group inside it (for adding a coin for scale) and the finished size.
import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { printMaterial } from './materials.js'
import { FONTS, MINIME, designProductById } from '../../shared/designs.js'
import { COLORS, byId } from '../../shared/pricing.js'

const MM = 0.01
const fonts = new Map()
const textures = new Map()

/** The typeface for a font id, fetched once and shared by every preview. */
export function loadFont(id) {
  const f = byId(FONTS, id) ?? FONTS[0]
  if (!fonts.has(f.id)) fonts.set(f.id, new FontLoader().loadAsync(f.file))
  return fonts.get(f.id)
}

/** A photo as a texture that covers a square, cropped from the middle. */
function loadPhoto(url) {
  if (!textures.has(url)) {
    textures.set(
      url,
      new THREE.TextureLoader().loadAsync(url).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace
        const a = t.image.width / t.image.height
        t.repeat.set(a > 1 ? 1 / a : 1, a > 1 ? 1 : a)
        t.offset.set(a > 1 ? (1 - 1 / a) / 2 : 0, a > 1 ? 0 : (1 - a) / 2)
        return t
      }),
    )
  }
  return textures.get(url)
}

const hex = (id) => byId(COLORS, id)?.hex ?? COLORS[0].hex
const material = (colorId) => printMaterial(hex(colorId), { layers: 160 })
const glow = (colorId) => new THREE.MeshStandardMaterial({ color: hex(colorId), emissive: hex(colorId), emissiveIntensity: 0.9, roughness: 0.6 })
const steel = () => new THREE.MeshStandardMaterial({ color: '#4a4d52', metalness: 0.6, roughness: 0.4 })

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

const loop = (mat, r = 4.5, tube = 1.3) => mesh(new THREE.TorusGeometry(r, tube, 10, 28), mat)

/**
 * Extruded text in mm: `width` wide (or shorter when that would make it taller than `maxHeight`),
 * with its left, bottom and back faces at the origin. Returns the mesh and its ink size.
 */
function textMesh(text, font, { width, maxHeight }, depth, mat, bevel = 0.35) {
  const geo = new TextGeometry(text, { font, size: 10, depth, curveSegments: 5, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.85, bevelSegments: bevel > 0.6 ? 3 : 2 })
  geo.computeBoundingBox()
  let b = geo.boundingBox
  const s = Math.min(width / (b.max.x - b.min.x), maxHeight / (b.max.y - b.min.y))
  geo.scale(s, s, 1)
  geo.computeBoundingBox()
  b = geo.boundingBox
  geo.translate(-b.min.x, -b.min.y, -b.min.z)
  return { mesh: mesh(geo, mat), w: b.max.x - b.min.x, h: b.max.y - b.min.y, d: b.max.z - b.min.z }
}

/** Centre the group on x/z, stand it on y = 0, scale to scene units, and report the size in mm. */
function finish(g) {
  const box = new THREE.Box3().setFromObject(g)
  const size = box.getSize(new THREE.Vector3())
  const c = box.getCenter(new THREE.Vector3())
  g.position.set(-c.x, -box.min.y, -c.z)
  const wrap = new THREE.Group()
  wrap.add(g)
  wrap.scale.setScalar(MM)
  return { object: wrap, inner: g, mm: { width: Math.round(size.x), height: Math.round(size.y), depth: Math.round(size.z) } }
}

function stadium(w, h) {
  const r = h / 2
  const s = new THREE.Shape()
  s.moveTo(-w / 2 + r, -r)
  s.lineTo(w / 2 - r, -r)
  s.absarc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false)
  s.lineTo(-w / 2 + r, r)
  s.absarc(-w / 2 + r, 0, r, Math.PI / 2, (3 * Math.PI) / 2, false)
  return s
}

function heart(size) {
  const s = new THREE.Shape()
  const k = size / 20
  s.moveTo(5 * k, 5 * k)
  s.bezierCurveTo(5 * k, 5 * k, 4 * k, 0, 0, 0)
  s.bezierCurveTo(-6 * k, 0, -6 * k, 7 * k, -6 * k, 7 * k)
  s.bezierCurveTo(-6 * k, 11 * k, -3 * k, 15.4 * k, 5 * k, 19 * k)
  s.bezierCurveTo(12 * k, 15.4 * k, 16 * k, 11 * k, 16 * k, 7 * k)
  s.bezierCurveTo(16 * k, 7 * k, 16 * k, 0, 10 * k, 0)
  s.bezierCurveTo(7 * k, 0, 5 * k, 5 * k, 5 * k, 5 * k)
  return s
}

const extrude = (shape, depth) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 })

// ---------- keychains ----------

function tag(font, d, size, { withLoop = true, magnet = false } = {}) {
  const pad = 4
  const loopR = 4.5
  const plateW = withLoop ? size.width - loopR : size.width
  const plateT = 3
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const { mesh: t, w, h } = textMesh(d.text, font, { width: plateW - pad * 2, maxHeight: 24 }, 2, letters)
  const plateH = Math.max(18, h + pad * 2)
  const g = new THREE.Group()
  g.add(mesh(new RoundedBoxGeometry(plateW, plateH, plateT, 4, 3), base))
  t.position.set(-w / 2, -h / 2, plateT / 2 - 0.2)
  g.add(t)
  if (withLoop) {
    const l = loop(base)
    l.position.set(-plateW / 2 - loopR + 1.3, 0, 0)
    g.add(l)
  }
  if (magnet) {
    const m = mesh(new THREE.CylinderGeometry(Math.min(9, plateH / 2 - 2), Math.min(9, plateH / 2 - 2), 1.6, 32), steel())
    m.rotation.x = Math.PI / 2
    m.position.z = -plateT / 2 - 0.8
    g.add(m)
  }
  return finish(g)
}

function bubble(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const { mesh: t, w, h } = textMesh(d.text, font, { width: size.width - 10, maxHeight: 28 }, 5, letters, 1.2)
  const g = new THREE.Group()
  t.position.set(-w / 2, -h / 2, 0)
  g.add(t)
  const bar = mesh(new RoundedBoxGeometry(w + 4, Math.max(5, h * 0.3), 2.5, 3, 1.2), base)
  bar.position.set(0, 0, -1.2)
  g.add(bar)
  const l = loop(base)
  l.position.set(-w / 2 - 3.5, 0, 0)
  g.add(l)
  return finish(g)
}

function wavy(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const W = size.width - 8
  const amp = 2.6
  const half = 9
  const shape = new THREE.Shape()
  const steps = 40
  const wave = (x) => amp * Math.sin((x / W) * Math.PI * 2.2)
  shape.moveTo(-W / 2, -half + wave(-W / 2))
  for (let i = 1; i <= steps; i++) {
    const x = -W / 2 + (W * i) / steps
    shape.lineTo(x, -half + wave(x))
  }
  for (let i = steps; i >= 0; i--) {
    const x = -W / 2 + (W * i) / steps
    shape.lineTo(x, half + wave(x))
  }
  const band = mesh(extrude(shape, 3), base)
  const g = new THREE.Group()
  g.add(band)
  const { mesh: t, w, h } = textMesh(d.text, font, { width: W - 14, maxHeight: 13 }, 2, letters)
  t.position.set(-w / 2, -h / 2, 2.8)
  g.add(t)
  const l = loop(base)
  l.position.set(-W / 2 - 3.2, wave(-W / 2), 1.5)
  g.add(l)
  return finish(g)
}

function tiles(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const chars = [...d.text]
  const n = chars.length
  const gap = 2.5
  const t = Math.max(10, Math.min(22, (size.width - 8 - (n - 1) * gap) / n))
  const g = new THREE.Group()
  let x = 0
  chars.forEach((ch, i) => {
    if (ch !== ' ') {
      const tile = new THREE.Group()
      tile.add(mesh(new RoundedBoxGeometry(t, t, 3, 3, 2), base))
      const { mesh: m, w, h } = textMesh(ch, font, { width: t * 0.62, maxHeight: t * 0.62 }, 1.5, letters, 0.25)
      m.position.set(-w / 2, -h / 2, 1.3)
      tile.add(m)
      tile.position.x = x + t / 2
      tile.rotation.z = (i % 2 ? 1 : -1) * 0.05
      g.add(tile)
    }
    if (i < n - 1) {
      const ring = mesh(new THREE.TorusGeometry(1.7, 0.6, 8, 18), letters)
      ring.position.set(x + t + gap / 2, 0, 0)
      g.add(ring)
    }
    x += t + gap
  })
  const l = loop(base)
  l.position.set(-4.5, 0, 0)
  g.add(l)
  return finish(g)
}

function beads(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const chars = [...d.text].filter((c) => c !== ' ')
  const n = chars.length
  const gap = 1.5
  const r = Math.max(5, Math.min(11, (size.width - 10 - (n - 1) * gap) / n / 2))
  const g = new THREE.Group()
  const pitch = r * 2 + gap
  chars.forEach((ch, i) => {
    const bead = new THREE.Group()
    bead.add(mesh(new THREE.SphereGeometry(r, 28, 18), base))
    const { mesh: m, w, h } = textMesh(ch, font, { width: r * 0.95, maxHeight: r * 0.95 }, 1.2, letters, 0.2)
    m.position.set(-w / 2, -h / 2, r - 0.9)
    bead.add(m)
    bead.position.x = i * pitch
    g.add(bead)
    if (i < n - 1) {
      const spacer = mesh(new THREE.SphereGeometry(r * 0.34, 16, 12), letters)
      spacer.position.x = i * pitch + pitch / 2
      g.add(spacer)
    }
  })
  const string = mesh(new THREE.CylinderGeometry(0.9, 0.9, (n - 1) * pitch + r * 2 + 8, 10), letters)
  string.rotation.z = Math.PI / 2
  string.position.x = ((n - 1) * pitch) / 2
  g.add(string)
  const l = loop(base)
  l.position.set(-r - 4, 0, 0)
  g.add(l)
  return finish(g)
}

// ---------- desk pieces ----------

function stand(font, d, size, { heart: heartColor } = {}) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const hasHeart = Boolean(heartColor)
  const { mesh: t, w } = textMesh(d.text, font, { width: size.width - (hasHeart ? 36 : 10), maxHeight: size.width * 0.3 }, 12, letters)
  const baseH = 5
  const g = new THREE.Group()
  let totalW = w
  t.position.set(-w / 2, baseH - 0.5, -6)
  g.add(t)
  if (hasHeart) {
    const hs = Math.min(26, size.width * 0.16)
    const hm = heartColor === 'match' ? letters : material('red')
    const h = mesh(extrude(heart(hs), 12), hm)
    h.rotation.z = Math.PI
    // the heart shape is drawn upside down around (5k, 9k); flip it and set it beside the name
    h.position.set(w / 2 + 6 + hs * 0.8, baseH + hs * 0.98, 6)
    g.add(h)
    totalW = w + 6 + hs * 1.1
    t.position.x = -totalW / 2
    h.position.x = -totalW / 2 + w + 6 + hs * 0.8
  }
  const slab = mesh(new RoundedBoxGeometry(totalW + 14, baseH, 20, 3, 2), base)
  slab.position.y = baseH / 2
  g.add(slab)
  return finish(g)
}

function plaque(font, d, size, shape = 'rect') {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const W = size.width
  const H = Math.round(W * 0.4)
  const plateGeo = shape === 'stadium' ? extrude(stadium(W, H), 4) : new RoundedBoxGeometry(W, H, 4, 4, 5)
  const plate = new THREE.Group()
  const p = mesh(plateGeo, base)
  if (shape === 'stadium') p.position.z = -2
  plate.add(p)
  const { mesh: t, w, h } = textMesh(d.text, font, { width: W - 24, maxHeight: H - 16 }, 2, letters)
  t.position.set(-w / 2, -h / 2, 1.8)
  plate.add(t)
  const tilt = 0.28
  plate.rotation.x = -tilt
  plate.position.set(0, 6 + (H / 2) * Math.cos(tilt), -(H / 2) * Math.sin(tilt) + 2)
  const g = new THREE.Group()
  g.add(plate)
  const wedge = mesh(new RoundedBoxGeometry(W * 0.86, 6, H * 0.45, 3, 2), base)
  wedge.position.set(0, 3, -H * 0.1)
  g.add(wedge)
  return finish(g)
}

function lamp(font, d, size) {
  const base = material(d.baseColor)
  const { mesh: t, w } = textMesh(d.text, font, { width: size.width - 24, maxHeight: size.width * 0.28 }, 10, glow(d.textColor))
  const baseH = 11
  const g = new THREE.Group()
  const slab = mesh(new RoundedBoxGeometry(w + 24, baseH, 28, 3, 3), base)
  slab.position.y = baseH / 2
  g.add(slab)
  const strip = mesh(new THREE.BoxGeometry(w + 6, 1.2, 12), new THREE.MeshStandardMaterial({ color: '#fff6dd', emissive: '#ffe9b0', emissiveIntensity: 1.4 }))
  strip.position.set(0, baseH + 0.6, 0)
  g.add(strip)
  t.position.set(-w / 2, baseH + 0.8, -5)
  g.add(t)
  return finish(g)
}

// ---------- small gifts ----------

function bookmark(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const L = size.width
  const W = 32
  const g = new THREE.Group()
  g.add(mesh(new RoundedBoxGeometry(W, L, 2.5, 3, 4), base))
  const { mesh: t, w, h } = textMesh(d.text, font, { width: L - 30, maxHeight: W - 12 }, 1.5, letters)
  const text = new THREE.Group()
  text.add(t)
  t.position.set(-w / 2, -h / 2, 0)
  text.rotation.z = -Math.PI / 2
  text.position.set(0, -4, 1.1)
  g.add(text)
  const l = loop(letters, 4, 1.1)
  l.position.set(0, L / 2 + 2.5, 0)
  g.add(l)
  return finish(g)
}

function plant(font, d, size) {
  const letters = material(d.textColor)
  const base = material(d.baseColor)
  const L = size.width
  const g = new THREE.Group()
  const stake = mesh(new THREE.BoxGeometry(9, L - 40, 3), base)
  stake.position.y = 20 + (L - 40) / 2
  g.add(stake)
  const tip = mesh(new THREE.ConeGeometry(4.5, 20, 4), base)
  tip.rotation.x = Math.PI
  tip.rotation.y = Math.PI / 4
  tip.position.y = 10
  g.add(tip)
  const leaf = new THREE.Shape()
  leaf.absellipse(0, 0, 30, 15, 0, Math.PI * 2, false, 0)
  const tagMesh = mesh(extrude(leaf, 3), base)
  tagMesh.position.set(0, L - 16, -1.5)
  g.add(tagMesh)
  const { mesh: t, w, h } = textMesh(d.text, font, { width: 48, maxHeight: 16 }, 1.5, letters)
  t.position.set(-w / 2, L - 16 - h / 2, 1.4)
  g.add(t)
  return finish(g)
}

// ---------- photo gifts ----------

async function frame(d, size, photoUrl, { standing = false } = {}) {
  const base = material(d.baseColor)
  const W = size.width
  const border = Math.max(5, Math.round(W * 0.09))
  const g = new THREE.Group()
  const framed = new THREE.Group()
  framed.add(mesh(new RoundedBoxGeometry(W, W, 4, 4, 2.5), base))
  const inner = W - border * 2
  let photoMat
  if (photoUrl) {
    const map = await loadPhoto(photoUrl)
    photoMat = new THREE.MeshStandardMaterial({ map, roughness: 0.85 })
  } else {
    photoMat = new THREE.MeshStandardMaterial({ color: '#d9cbb7', roughness: 0.9 })
  }
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(inner, inner), photoMat)
  photo.position.z = 2.06
  framed.add(photo)
  const lip = mesh(new RoundedBoxGeometry(inner + 2, inner + 2, 1.2, 2, 0.6), base)
  lip.position.z = 1.8
  // the lip is a ring: four thin bars read better than a box, so build them
  framed.remove(lip)
  for (const [x, y, w, h] of [[0, inner / 2 + 1, inner + 2, 2], [0, -inner / 2 - 1, inner + 2, 2], [inner / 2 + 1, 0, 2, inner + 2], [-inner / 2 - 1, 0, 2, inner + 2]]) {
    const bar = mesh(new THREE.BoxGeometry(w, h, 1.4), base)
    bar.position.set(x, y, 2.4)
    framed.add(bar)
  }
  if (standing) {
    const tilt = 0.22
    framed.rotation.x = -tilt
    framed.position.set(0, (W / 2) * Math.cos(tilt) + 2, -(W / 2) * Math.sin(tilt))
    const leg = mesh(new THREE.BoxGeometry(W * 0.3, 4, W * 0.42), base)
    leg.position.set(0, 2, -W * 0.18)
    g.add(leg)
  } else {
    const magnet = mesh(new THREE.CylinderGeometry(Math.min(10, W * 0.16), Math.min(10, W * 0.16), 1.6, 32), steel())
    magnet.rotation.x = Math.PI / 2
    magnet.position.z = -2.8
    framed.add(magnet)
  }
  g.add(framed)
  return finish(g)
}

// ---------- the Mini-Me sample figure ----------

const plain = (color) => printMaterial(color, { layers: 90 })

/**
 * The sample Mini-Me: an original cartoon in classic Tamil-cinema hero style (dark glasses, a
 * moustache, swept-back hair, folded arms, a shirt in the accent colour and a white veshti with a
 * gold border). One unit tall, standing on y = 0. Not a likeness of anyone: the real figure is
 * modelled from the customer's photos.
 */
function heroFigure(accentHex) {
  const skin = plain('#c98a5b')
  const hair = plain('#17120f')
  const shirt = plain(accentHex)
  const veshti = plain('#f7f3ea')
  const gold = new THREE.MeshStandardMaterial({ color: '#d2ab4f', metalness: 0.6, roughness: 0.35 })
  const dark = plain('#121212')
  const g = new THREE.Group()
  const put = (geo, mat, x, y, z, rot) => {
    const m = mesh(geo, mat)
    m.position.set(x, y, z)
    if (rot) m.rotation.set(...rot)
    g.add(m)
    return m
  }
  // cartoon proportions: a big head, a short body, sandals peeking out under the veshti
  put(new RoundedBoxGeometry(0.12, 0.04, 0.2, 2, 0.015), hair, -0.08, 0.02, 0.09)
  put(new RoundedBoxGeometry(0.12, 0.04, 0.2, 2, 0.015), hair, 0.08, 0.02, 0.09)
  // veshti with a gold border, and a dark waist band
  put(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 28), veshti, 0, 0.19, 0)
  put(new THREE.CylinderGeometry(0.191, 0.193, 0.03, 28), gold, 0, 0.055, 0)
  put(new THREE.CylinderGeometry(0.175, 0.175, 0.035, 28), dark, 0, 0.35, 0)
  // shirt, with folded arms across the chest and the hands tucked in
  put(new RoundedBoxGeometry(0.36, 0.27, 0.22, 3, 0.05), shirt, 0, 0.49, 0)
  put(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 16), shirt, -0.02, 0.5, 0.125, [0, 0, Math.PI / 2 + 0.12])
  put(new THREE.CylinderGeometry(0.055, 0.055, 0.3, 16), shirt, 0.02, 0.445, 0.13, [0, 0, Math.PI / 2 - 0.12])
  put(new THREE.SphereGeometry(0.052, 18, 14), skin, -0.165, 0.455, 0.135)
  put(new THREE.SphereGeometry(0.052, 18, 14), skin, 0.165, 0.51, 0.13)
  put(new RoundedBoxGeometry(0.2, 0.045, 0.07, 2, 0.015), veshti, 0, 0.63, 0.085) // collar
  // neck and a big round head
  put(new THREE.CylinderGeometry(0.06, 0.065, 0.06, 20), skin, 0, 0.64, 0)
  put(new THREE.SphereGeometry(0.19, 32, 24), skin, 0, 0.85, 0)
  put(new THREE.SphereGeometry(0.04, 14, 10), skin, -0.19, 0.84, 0) // ears
  put(new THREE.SphereGeometry(0.04, 14, 10), skin, 0.19, 0.84, 0)
  // swept-back hair with a quiff
  put(new THREE.SphereGeometry(0.198, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, 0.86, -0.015)
  put(new RoundedBoxGeometry(0.24, 0.08, 0.12, 3, 0.035), hair, 0, 1.02, 0.05, [-0.4, 0, 0])
  // sunglasses, the moustache and a small smile
  put(new RoundedBoxGeometry(0.13, 0.07, 0.03, 2, 0.014), dark, -0.075, 0.87, 0.168)
  put(new RoundedBoxGeometry(0.13, 0.07, 0.03, 2, 0.014), dark, 0.075, 0.87, 0.168)
  put(new THREE.BoxGeometry(0.03, 0.014, 0.02), dark, 0, 0.876, 0.176)
  put(new THREE.BoxGeometry(0.02, 0.016, 0.2), dark, -0.158, 0.87, 0.06)
  put(new THREE.BoxGeometry(0.02, 0.016, 0.2), dark, 0.158, 0.87, 0.06)
  put(new RoundedBoxGeometry(0.13, 0.03, 0.03, 2, 0.012), hair, 0, 0.79, 0.175)
  put(new RoundedBoxGeometry(0.07, 0.014, 0.02, 1, 0.005), plain('#a0523d'), 0, 0.755, 0.178)
  // normalise to one unit tall, standing on the ground
  const box = new THREE.Box3().setFromObject(g)
  const s = 1 / box.getSize(new THREE.Vector3()).y
  g.scale.setScalar(s)
  g.position.set(0, -box.min.y * s, 0)
  const wrap = new THREE.Group()
  wrap.add(g)
  return wrap
}

/**
 * The Mini-Me preview: the sample hero figure in the chosen accent colour, with the loop, base
 * or magnet plate of the chosen style. The real figure is modelled from the customer's photos.
 */
export function buildMiniMe(design) {
  const style = byId(MINIME.styles, design.style) ?? MINIME.styles[0]
  const figure = heroFigure(hex(design.accent))
  const white = printMaterial(COLORS[1].hex, { layers: 70 })
  const g = new THREE.Group()
  g.add(figure)
  if (style.id === 'standee') {
    const disc = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 40), white)
    disc.position.y = 0.025
    figure.position.y = 0.05
    g.add(disc)
  } else if (style.id === 'keychain') {
    const l = mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 24), white)
    l.position.set(0, 1.06, 0)
    g.add(l)
  } else {
    const plate = mesh(new RoundedBoxGeometry(0.6, 1.02, 0.06, 3, 0.08), white)
    plate.position.set(0, 0.51, -0.26)
    g.add(plate)
  }
  g.scale.setScalar(style.height * MM)
  const wrap = new THREE.Group()
  wrap.add(g)
  return { object: wrap, inner: null, mm: { width: Math.round(style.height * 0.42), height: style.height, depth: Math.round(style.height * 0.3) } }
}

/** A ₹10-sized coin (27 mm) lying beside the model, for a sense of scale. Call after finish(). */
export function addCoin(model) {
  if (!model.inner) return
  const coin = mesh(new THREE.CylinderGeometry(13.5, 13.5, 2, 48), new THREE.MeshStandardMaterial({ color: '#d4b25a', metalness: 0.85, roughness: 0.35 }))
  const box = new THREE.Box3().setFromObject(model.inner)
  coin.position.set(box.max.x + 18, box.min.y + 1, 0)
  model.inner.add(coin)
}

/** The model for any normalised design. Text styles wait for their font on first use. */
export async function buildDesignModel(design, { photoUrl = null } = {}) {
  const product = designProductById(design.product)
  if (!product) throw new Error('unknown design')
  if (product.kind === 'figure') return buildMiniMe(design)
  const size = byId(product.sizes, design.size) ?? product.sizes[1]
  if (product.kind === 'photo') return frame(design, size, photoUrl, { standing: product.id === 'photo-stand' })
  const font = await loadFont(design.font)
  switch (product.id) {
    case 'bubble': return bubble(font, design, size)
    case 'wavy': return wavy(font, design, size)
    case 'tiles': return tiles(font, design, size)
    case 'beads': return beads(font, design, size)
    case 'stand': return stand(font, design, size)
    case 'love': return stand(font, design, size, { heart: design.heart ?? 'red' })
    case 'plaque': return plaque(font, design, size, design.shape)
    case 'lamp': return lamp(font, design, size)
    case 'bookmark': return bookmark(font, design, size)
    case 'plant': return plant(font, design, size)
    case 'magnet': return tag(font, design, size, { withLoop: false, magnet: true })
    default: return tag(font, design, size)
  }
}
