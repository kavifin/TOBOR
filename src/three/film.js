// TOBOR's scroll film: a sunlit maker studio where one printed piece goes through the whole workflow.
// photo upload on a phone → modelled on the studio PC → uploaded to the printer → approved → paid
// → printed layer by layer → WhatsApp "print complete" → boxed while the courier van pulls up.
// `update(t)` maps film time t ∈ [0, 1] to the scene and is pure, so scrolling back plays it in reverse.
// Real models (phone, PC, Bambu printer, the "Circle of Love" piece) stream in after start;
// built-in stand-ins (a spiral vase, a simple printer) show until then.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { buildShape } from './shapes.js'
import { printMaterial } from './materials.js'
import { renderThumb, renderObjectThumb } from './thumbs.js'
import { logos, drawLogo } from '../lib/brand.js'
import { makeVan } from './van.js'
import { loadPhone, loadPc, loadPrinter, loadPiece, UNITS_PER_METRE } from './models.js'

const clamp01 = (x) => Math.min(1, Math.max(0, x))
const ease = (x) => x * x * (3 - 2 * x)
const seg = (t, a, b) => ease(clamp01((t - a) / (b - a)))
const mix = THREE.MathUtils.lerp

/** Monotone cubic through (xs, ys) (Fritsch–Carlson): smooth, never runs backwards, at rest at both ends. */
function monotone(xs, ys) {
  const n = xs.length
  const d = []
  const m = []
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]))
  m[0] = 0
  m[n - 1] = 0
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      m[i] = (3 / Math.sqrt(s)) * a * d[i]
      m[i + 1] = (3 / Math.sqrt(s)) * b * d[i]
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0]
    if (x >= xs[n - 1]) return ys[n - 1]
    let i = 0
    while (x > xs[i + 1]) i++
    const h = xs[i + 1] - xs[i]
    const u = (x - xs[i]) / h
    const u2 = u * u
    const u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (3 * u2 - 2 * u3) * ys[i + 1] + (u3 - u2) * h * m[i + 1]
  }
}

const VASE_WHITE = '#efece6'
const GREEN = '#127048'
export const FILM_LAYERS = 250

// Studio layout (desk top is y = 0): PC on the left, window in the middle, printer on the right.
const WIN_X = 2.2 // window centre
const MONITOR = new THREE.Vector3(-5.4, 1.5, -2.4) // stand-in until the PC model reports its screen
const BED = new THREE.Vector3(6.4, 0, -1.2) // printer bed centre
const PHONE_DESK = new THREE.Vector3(0.6, 0.025, 1.4)
const BOX_AT = new THREE.Vector3(1.2, 0, 0.6)

// ---------- textures ----------
function canvasTexture(w, h, paint) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function woodTexture() {
  const t = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#c49a6c'
    ctx.fillRect(0, 0, w, h)
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 140; i++) {
      const y = rnd() * h
      ctx.strokeStyle = `rgba(${90 + rnd() * 40}, ${55 + rnd() * 30}, ${30 + rnd() * 20}, ${0.08 + rnd() * 0.14})`
      ctx.lineWidth = 1 + rnd() * 4
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.006 + i) * 6 + Math.sin(x * 0.02 + i * 3) * 2)
      ctx.stroke()
    }
  })
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 1)
  return t
}

function wallTexture() {
  return canvasTexture(64, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#f3ebdf')
    g.addColorStop(1, '#e2d4c1')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
}

function outdoorTexture() {
  return canvasTexture(1024, 768, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#fff6e6')
    sky.addColorStop(0.55, '#fde9c8')
    sky.addColorStop(1, '#e9e1d2')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)
    ctx.filter = 'blur(18px)'
    for (const [x, y, r, c] of [[120, 300, 160, '#b9c99a'], [380, 260, 200, '#a9bf8c'], [800, 290, 220, '#bccd9f'], [620, 330, 140, '#c8d6ac']]) {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.filter = 'none'
    ctx.fillStyle = '#d9d2c4'
    ctx.fillRect(0, h * 0.72, w, h * 0.28)
  })
}

function boxLabelTexture() {
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#c69863'
    ctx.fillRect(0, 0, 512, 512)
    ctx.fillStyle = '#fbf8f3'
    ctx.fillRect(110, 150, 300, 250)
    ctx.fillStyle = '#1f1b17'
    ctx.fillRect(110, 150, 300, 52)
    ctx.fillStyle = '#fbf8f3'
    ctx.font = '700 28px "Instrument Sans", system-ui, sans-serif'
    ctx.fillText('OUT FOR DELIVERY', 128, 186)
    drawLogo(ctx, logos.dark, 126, 214, 50)
    ctx.font = '600 22px "JetBrains Mono", monospace'
    ctx.fillText('TB-R1042   1/1', 128, 290)
    let s = 3
    for (let x = 128; x < 392; x += 5) {
      s = (s * 9301 + 49297) % 233280
      ctx.fillRect(x, 310, s / 233280 > 0.5 ? 3 : 1.5, 70)
    }
  })
}

// Phone screen UI, redrawn only when its state changes.
function phoneScreen() {
  const c = document.createElement('canvas')
  c.width = 540
  c.height = 1140
  const ctx = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const vase = new Image()
  const thumb = renderThumb('spiralVase', VASE_WHITE)
  if (thumb) vase.src = thumb
  let key = ''

  const font = (w, s, f = 'Instrument Sans') => `${w} ${s}px "${f}", system-ui, sans-serif`
  const field = (y, label, value, reveal) => {
    ctx.fillStyle = '#6e6358'
    ctx.font = font(600, 22)
    ctx.fillText(label, 48, y)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#e7ddcf'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(40, y + 14, 460, 66, 16)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1f1b17'
    ctx.font = font(500, 28)
    ctx.fillText(value.slice(0, Math.round(value.length * reveal)), 64, y + 58)
  }

  // iOS-style status bar: time on the left, signal, wifi and battery on the right,
  // with room in the middle for the Dynamic Island.
  function statusBar(ink, onBrand) {
    if (onBrand) {
      ctx.fillStyle = '#0b5636'
      ctx.fillRect(0, 0, 540, 80)
    }
    ctx.fillStyle = ink
    ctx.font = font(650, 26)
    ctx.fillText('9:41', 62, 54)
    for (let i = 0; i < 4; i++) ctx.fillRect(378 + i * 9, 50 - (i + 1) * 5, 6, (i + 1) * 5)
    ctx.strokeStyle = ink
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    for (const r of [7, 13, 19]) {
      ctx.beginPath()
      ctx.arc(432, 54, r, -Math.PI * 0.75, -Math.PI * 0.25)
      ctx.stroke()
    }
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(458, 34, 40, 20, 6)
    ctx.stroke()
    ctx.fillRect(462, 38, 28, 12)
    ctx.fillRect(500, 40, 3, 8)
  }

  function homeIndicator(ink) {
    ctx.fillStyle = ink
    ctx.beginPath()
    ctx.roundRect(190, 1112, 160, 9, 5)
    ctx.fill()
  }

  function draw(state, typing = 0) {
    const k = `${state}:${Math.round(typing * 12)}:${vase.complete}`
    if (k === key) return
    key = k
    ctx.fillStyle = '#f4eee5'
    ctx.fillRect(0, 0, 540, 1140)
    statusBar(state === 'done' ? '#ffffff' : '#1f1b17', state === 'done')
    if (state === 'done') {
      ctx.fillStyle = '#0b5636'
      ctx.fillRect(0, 80, 540, 120)
      const lw = drawLogo(ctx, logos.light, 44, 112, 44)
      ctx.fillStyle = '#ffffff'
      ctx.font = font(500, 22)
      ctx.fillText('Business account', 44 + lw + 18, 148)
      ctx.fillStyle = '#ece5dd'
      ctx.fillRect(0, 200, 540, 940)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(36, 250, 468, 560, 24)
      ctx.fill()
      if (vase.complete && vase.naturalWidth) ctx.drawImage(vase, 70, 270, 400, 300)
      ctx.fillStyle = '#127048'
      ctx.font = font(700, 40, 'Bricolage Grotesque')
      ctx.fillText('3D print status', 64, 630)
      ctx.fillText('100% completed', 64, 680)
      ctx.fillStyle = '#dff0e6'
      ctx.beginPath()
      ctx.roundRect(64, 710, 410, 18, 9)
      ctx.fill()
      ctx.fillStyle = '#127048'
      ctx.beginPath()
      ctx.roundRect(64, 710, 410, 18, 9)
      ctx.fill()
      ctx.fillStyle = '#1f1b17'
      ctx.font = font(500, 24)
      ctx.fillText('TB-R1042 passed quality check.', 64, 772)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(36, 840, 400, 110, 24)
      ctx.fill()
      ctx.fillStyle = '#1f1b17'
      ctx.font = font(500, 24)
      ctx.fillText('Out for delivery tomorrow.', 64, 905)
    } else {
      const lw = drawLogo(ctx, logos.dark, 44, 102, 46)
      ctx.font = font(600, 26)
      ctx.fillStyle = '#6e6358'
      ctx.fillText('Send a photo', 44 + lw + 18, 138)
      ctx.fillStyle = '#e7ddcf'
      ctx.beginPath()
      ctx.roundRect(40, 180, 460, 420, 28)
      ctx.fill()
      if (vase.complete && vase.naturalWidth) ctx.drawImage(vase, 70, 190, 400, 400)
      field(650, 'Name', 'Raghul', clamp01(typing * 2))
      field(780, 'WhatsApp number', '98765 41230', clamp01(typing * 2 - 1))
      const done = state === 'uploaded'
      ctx.fillStyle = done ? '#0b5636' : '#127048'
      ctx.beginPath()
      ctx.roundRect(40, 930, 460, 84, 42)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = font(700, 30)
      const label = done ? '✓  Uploaded' : 'Send photo'
      ctx.fillText(label, 270 - ctx.measureText(label).width / 2, 982)
    }
    homeIndicator('#1f1b17')
    tex.needsUpdate = true
  }
  vase.onload = () => (key = '')
  const setPhoto = (url) => {
    vase.src = url
    key = ''
  }
  document.fonts?.ready.then(() => (key = ''))
  return { tex, draw, setPhoto }
}

// ---------- props ----------
function roundedRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Flat rounded-rectangle mesh whose UVs span 0..1, so a texture fills it exactly. */
function roundedPlane(w, h, r) {
  const geo = new THREE.ShapeGeometry(roundedRect(w, h, r), 12)
  const pos = geo.attributes.position
  const uv = geo.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5)
  return geo
}

// A modern flagship phone: titanium frame, glass front and back, Dynamic Island,
// side buttons and a triple camera. Front faces +z; 0.4 × 0.82 units.
function makePhone(screenTex) {
  const W = 0.4
  const H = 0.82
  const D = 0.042
  const R = 0.062
  const g = new THREE.Group()

  const titanium = new THREE.MeshPhysicalMaterial({ color: '#b9b2a6', metalness: 1, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.4 })
  const blackGlass = new THREE.MeshPhysicalMaterial({ color: '#050506', metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03 })
  const backGlass = new THREE.MeshPhysicalMaterial({ color: '#d8d1c5', metalness: 0.1, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 })

  // frame: the rounded slab, slightly inset faces so the metal band shows around the edge
  const frame = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 8, 0.02), titanium)
  const extrude = (w, h, r, depth, mat) => {
    const geo = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 16 })
    return new THREE.Mesh(geo, mat)
  }
  const frontGlass = extrude(W - 0.008, H - 0.008, R - 0.004, 0.002, blackGlass)
  frontGlass.position.z = D / 2 - 0.001
  const back = extrude(W - 0.008, H - 0.008, R - 0.004, 0.002, backGlass)
  back.rotation.y = Math.PI
  back.position.z = -D / 2 + 0.001

  // display: glowing, but still glossy enough to catch the room's reflections
  const screen = new THREE.Mesh(
    roundedPlane(W - 0.03, H - 0.03, R - 0.016),
    new THREE.MeshPhysicalMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 1.05, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 }),
  )
  screen.position.z = D / 2 + 0.0035
  const island = new THREE.Mesh(roundedPlane(0.1, 0.03, 0.015), new THREE.MeshBasicMaterial({ color: '#000000' }))
  island.position.set(0, H / 2 - 0.045, D / 2 + 0.0046)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.006, 24), new THREE.MeshPhysicalMaterial({ color: '#10131a', roughness: 0.05, clearcoat: 1 }))
  lens.position.set(0.03, H / 2 - 0.045, D / 2 + 0.0058)

  // side buttons: action + volume on the left, power on the right
  const button = (h, x, y) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.008, h, 0.016, 3, 0.003), titanium)
    b.position.set(x, y, 0)
    return b
  }
  const buttons = [button(0.04, -W / 2 - 0.002, 0.24), button(0.07, -W / 2 - 0.002, 0.15), button(0.07, -W / 2 - 0.002, 0.06), button(0.1, W / 2 + 0.002, 0.15)]

  // camera plateau with three lenses and a flash
  const cam = new THREE.Group()
  const plateau = new THREE.Mesh(new RoundedBoxGeometry(0.17, 0.17, 0.008, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: '#cfc7ba', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }))
  cam.add(plateau)
  const ring = new THREE.MeshPhysicalMaterial({ color: '#a8a196', metalness: 1, roughness: 0.25 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0b0d12', roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02 })
  for (const [x, y] of [[-0.038, 0.038], [-0.038, -0.038], [0.038, 0]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.031, 0.012, 32), ring)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(x, y, 0.008)
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.022, 32), glass)
    eye.position.set(x, y, 0.0145)
    cam.add(barrel, eye)
  }
  const flash = new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), new THREE.MeshStandardMaterial({ color: '#f3ead2', emissive: '#3a3020' }))
  flash.position.set(0.045, 0.05, 0.0045)
  cam.add(flash)
  cam.rotation.y = Math.PI
  cam.position.set(W / 2 - 0.11, H / 2 - 0.11, -D / 2 - 0.004)

  g.add(frame, frontGlass, back, screen, island, lens, ...buttons, cam)
  g.traverse((o) => o.isMesh && (o.castShadow = true))
  return g
}

function makeSpool(color, x, z) {
  const g = new THREE.Group()
  const side = new THREE.MeshStandardMaterial({ color: '#dcd8d1', roughness: 0.35, transparent: true, opacity: 0.85 })
  const fil = new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.2, 48), fil)
  core.rotation.x = Math.PI / 2
  for (const dz of [-0.11, 0.11]) {
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 48), side)
    flange.rotation.x = Math.PI / 2
    flange.position.z = dz
    g.add(flange)
  }
  g.add(core)
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true))
  g.position.set(x, 0.34, z)
  g.rotation.y = 1.15
  return g
}

function makePrinter() {
  const white = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 0.55 })
  const alu = new THREE.MeshStandardMaterial({ color: '#c3c7cc', metalness: 0.7, roughness: 0.35 })
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2b2e', roughness: 0.6 })
  const g = new THREE.Group()
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.24, 1.35, 4, 0.06), white)
  base.position.y = 0.12
  const bed = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.05, 1.15, 3, 0.02), dark)
  bed.position.set(-0.1, 0.27, 0)
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.16, 0.03, 3, 0.02), new THREE.MeshStandardMaterial({ color: '#1a1c20', emissive: '#4fb487', emissiveIntensity: 0.25 }))
  panel.position.set(0.62, 0.2, 0.68)
  panel.rotation.x = -0.5
  const posts = []
  for (const x of [-0.82, 0.72]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), alu)
    post.position.set(x, 1.24, -0.48)
    posts.push(post)
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.12, 0.14), alu)
  top.position.set(-0.05, 2.24, -0.48)
  const gantry = new THREE.Group()
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.1, 0.12), alu)
  bar.position.set(-0.05, 0, -0.35)
  const head = new THREE.Group()
  const block = new THREE.Mesh(new RoundedBoxGeometry(0.26, 0.3, 0.24, 4, 0.04), white)
  const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32), dark)
  fan.rotation.x = Math.PI / 2
  fan.position.z = 0.125
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 16), new THREE.MeshStandardMaterial({ color: '#c9a14a', metalness: 0.9, roughness: 0.25 }))
  nozzle.rotation.x = Math.PI
  nozzle.position.y = -0.19
  const glow = new THREE.PointLight('#ffb44a', 0, 1.2, 2)
  glow.position.y = -0.24
  head.add(block, fan, nozzle, glow)
  head.position.set(0, -0.02, -0.18)
  gantry.add(bar, head)
  g.add(base, bed, panel, ...posts, top, gantry)
  g.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true))
  return { group: g, gantry, head, glow, bedTop: 0.295, bedX: -0.1 }
}

// Outline of the printed spiral vase at height v (0..1 of its height) in direction theta
// (angle in the world x-z plane). It is a hexagon whose size follows the vase profile and which
// twists with height, exactly as spiralVase() in shapes.js builds it. Returns the radius in film units.
const PRINT_SCALE = 0.95 // the printed piece is 0.95 units (17 cm) tall
function vaseOutline(v, theta) {
  const y = v * 2
  const r = 0.42 + 0.16 * Math.sin(y * 1.7 + 0.4) - (y > 1.6 ? (y - 1.6) * 0.25 : 0)
  const phi = Math.PI / 2 - theta + y * 0.9 // lathe angle of this direction, undoing the twist
  const sector = Math.PI / 3
  const local = ((phi % sector) + sector) % sector
  return ((r * Math.cos(Math.PI / 6)) / Math.cos(local - Math.PI / 6)) * 0.5 // normalize() halves the 2-unit vase
}

/**
 * Outline of any piece (1 unit tall, standing on y = 0): for each height band and direction, the
 * furthest the surface reaches from the centre line. The nozzle traces this, like a slicer's outer wall.
 */
function outlineFromGeometry(geometry) {
  const H = 64
  const A = 96
  const table = Array.from({ length: H }, () => new Float32Array(A).fill(-1))
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const hb = Math.min(H - 1, Math.max(0, Math.floor(y * H)))
    const ab = Math.floor((((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * A) % A
    table[hb][ab] = Math.max(table[hb][ab], Math.hypot(x, z))
  }
  // fill directions with no vertices from their nearest neighbours round the circle, then empty bands
  for (const row of table) {
    if (row.every((r) => r < 0)) continue
    const filled = Float32Array.from(row)
    for (let a = 0; a < A; a++) {
      if (row[a] >= 0) continue
      for (let d = 1; d < A; d++) {
        const l = row[(a - d + A) % A]
        const r = row[(a + d) % A]
        if (l >= 0 || r >= 0) {
          filled[a] = Math.max(l, r)
          break
        }
      }
    }
    row.set(filled)
  }
  for (let h = 0; h < H; h++) if (table[h][0] < 0) table[h] = table[h - 1] ?? table.find((r) => r[0] >= 0)
  return (v, theta) => {
    const row = table[Math.min(H - 1, Math.max(0, Math.floor(v * H)))]
    const f = ((((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * A
    const a0 = Math.floor(f) % A
    const a1 = (a0 + 1) % A
    return row[a0] + (row[a1] - row[a0]) * (f - Math.floor(f))
  }
}

/** A brim: a thin band of plastic hugging the base outline, printed first to hold the part down. */
function brimGeometry(outline) {
  const shape = new THREE.Shape()
  const hole = new THREE.Path()
  const N = 72
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const r = outline(0.01, a) * PRINT_SCALE
    // the brim is laid flat (rotation.x = -π/2), so shape y maps to world -z
    const o = [Math.cos(a) * (r + 0.07), -Math.sin(a) * (r + 0.07)]
    const n = [Math.cos(a) * r * 0.97, -Math.sin(a) * r * 0.97]
    i ? shape.lineTo(...o) : shape.moveTo(...o)
    i ? hole.lineTo(...n) : hole.moveTo(...n)
  }
  shape.holes.push(hole)
  return new THREE.ExtrudeGeometry(shape, { depth: 0.005, bevelEnabled: false })
}

// Printer rigs share one interface: `group`, `bed` (world point where the part sits, on the bed top),
// `kind`, and `pose(height, dx, dz, park, hot)`: put the nozzle at world offset (dx, dz) from the
// part's centre line. Like a real bed-slinger, the toolhead covers one axis along its gantry and
// the bed slides along the other, carrying the part. pose() returns the bed's world shift {x, z}.
function proceduralPrinter(p) {
  p.group.position.set(BED.x - p.bedX, 0, BED.z)
  return {
    kind: 'stand-in',
    group: p.group,
    front: new THREE.Vector3(0, 0, 1),
    along: new THREE.Vector3(1, 0, 0),
    bed: new THREE.Vector3(BED.x, p.bedTop, BED.z),
    pose(h, dx, dz, park, hot) {
      p.gantry.position.y = p.bedTop + h + 0.38 + park * 0.5
      p.head.position.x = p.bedX + dx
      p.head.position.z = -0.18 + dz
      p.glow.intensity = hot * 2.5
      return { x: 0, z: 0 }
    },
  }
}

// The Bambu A1 mini model's front faces its +x axis: the gantry arm runs along its z axis (machine X)
// and the bed slides along its x axis (machine Y). It is turned so its front faces the camera.
const PRINTER_YAW = -1.22

function glbPrinter(rig) {
  const K = rig.scale
  const { root, toolhead, gantry, bed, base } = rig
  root.rotation.y = PRINTER_YAW
  // the part sits on the bed under the nozzle (nozzle's bed-axis position, bed's centre across)
  const anchor = new THREE.Vector3(rig.nozzleXZ.x, rig.bedTop, rig.bedCentre.z)
  const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), PRINTER_YAW)
  const toLocal = turn.clone().invert()
  // place the model so that point lands on the planned spot
  const offset = anchor.clone().multiplyScalar(K).applyQuaternion(turn)
  root.position.set(BED.x - offset.x, 0, BED.z - offset.z)
  const glow = new THREE.PointLight('#ffb44a', 0, 0.3, 2)
  root.add(glow)
  const local = new THREE.Vector3()
  const shift = new THREE.Vector3()
  return {
    kind: 'bambu',
    group: root,
    front: new THREE.Vector3(1, 0, 0).applyQuaternion(turn),
    along: new THREE.Vector3(0, 0, 1).applyQuaternion(turn),
    bed: new THREE.Vector3(BED.x, rig.bedTop * K, BED.z),
    pose(h, dx, dz, park, hot) {
      // Z: gantry and toolhead ride up so the nozzle sits on the current layer
      const lift = rig.bedTop + h / K + 0.001 - rig.nozzleTip + park * 0.05
      for (const m of gantry) m.position.y = base.get(m).y + lift
      toolhead.position.y = base.get(toolhead).y + lift
      // the nozzle offset in the printer's own axes
      local.set(dx, 0, dz).applyQuaternion(toLocal).divideScalar(K)
      // X (along the gantry arm): the head follows the outline, then parks to one side
      toolhead.position.z = base.get(toolhead).z + (rig.bedCentre.z - rig.nozzleXZ.z) + local.z - park * 0.05
      // Y: the bed slides the opposite way along its rail, carrying the part under the nozzle
      bed.position.x = base.get(bed).x - local.x
      glow.position.set(rig.nozzleXZ.x, rig.bedTop + h / K + 0.004, rig.bedCentre.z + local.z)
      glow.intensity = hot * 1.6
      // the part moves with the bed; report that in world space
      shift.set(-local.x * K, 0, 0).applyQuaternion(turn)
      return { x: shift.x, z: shift.z }
    },
  }
}

function makeBox() {
  const kraft = new THREE.MeshStandardMaterial({ color: '#c69863', roughness: 0.85, side: THREE.DoubleSide })
  const label = new THREE.MeshStandardMaterial({ map: boxLabelTexture(), roughness: 0.85, side: THREE.DoubleSide })
  const inner = new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.9, side: THREE.DoubleSide })
  const W = 1.1, H = 0.62, D = 0.85
  const g = new THREE.Group()
  const walls = new THREE.Group()
  const wall = (w, h, x, z, ry, m) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m)
    mesh.position.set(x, h / 2, z)
    mesh.rotation.y = ry
    mesh.castShadow = mesh.receiveShadow = true
    walls.add(mesh)
  }
  wall(W, H, 0, D / 2, 0, label)
  wall(W, H, 0, -D / 2, 0, kraft)
  wall(D, H, W / 2, 0, Math.PI / 2, kraft)
  wall(D, H, -W / 2, 0, Math.PI / 2, kraft)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), inner)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.01
  walls.add(floor)
  g.add(walls)
  const flaps = []
  for (const [axis, s, w, d] of [['x', 1, W, D / 2], ['x', -1, W, D / 2], ['z', 1, D, W / 2], ['z', -1, D, W / 2]]) {
    const hinge = new THREE.Group()
    const flap = new THREE.Mesh(new THREE.PlaneGeometry(w, d), kraft)
    flap.position.y = d / 2
    flap.castShadow = true
    hinge.add(flap)
    if (axis === 'x') hinge.position.set(0, H, (s * D) / 2)
    else {
      hinge.position.set((s * W) / 2, H, 0)
      hinge.rotation.order = 'YXZ' // yaw to face sideways, then fold about the hinge line
      hinge.rotation.y = Math.PI / 2
    }
    hinge.userData = { s, axis }
    flaps.push(hinge)
    g.add(hinge)
  }
  return { group: g, flaps, H }
}

// ---------- hologram ----------
function hologramMaterial(plane) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#5cffb5') }, uTime: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_vertex>
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); // name required by the clipping chunk
        vN = normalize(normalMatrix * normal);
        vV = -mvPosition.xyz;
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uTime; uniform float uAlpha;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      #include <clipping_planes_pars_fragment>
      void main() {
        #include <clipping_planes_fragment>
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        float scan = 0.55 + 0.45 * step(0.5, fract(vW.y * 60.0 - uTime * 2.0));
        float a = (0.32 + fres * 0.85) * scan * uAlpha;
        gl_FragColor = vec4(uColor * (0.7 + fres), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    clipping: true,
    clippingPlanes: [plane],
  })
}

// The modelling app on the studio PC: a small scene rendered into a texture, plus a UI layer.
function makeCad() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#14211f')
  const grid = new THREE.GridHelper(6, 24, '#2f5a4e', '#1f3a34')
  scene.add(grid)
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
  const mat = hologramMaterial(plane)
  const vase = buildShape('spiralVase', VASE_WHITE)
  vase.traverse((o) => o.isMesh && (o.material = mat))
  vase.scale.setScalar(1.25)
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.62, 0.62, 1.3, 6, 1, true)),
    new THREE.LineBasicMaterial({ color: '#4fb487', transparent: true, opacity: 0.35 }),
  )
  wire.position.y = 0.65
  scene.add(vase, wire)
  const camera = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 50)
  camera.position.set(2.3, 1.55, 2.7)
  camera.lookAt(0, 0.62, 0)
  const rt = new THREE.WebGLRenderTarget(1024, 576, { samples: 4 })

  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 576
  const ctx = c.getContext('2d')
  const ui = new THREE.CanvasTexture(c)
  ui.colorSpace = THREE.SRGBColorSpace
  let key = ''
  function drawUi(status, progress, approved) {
    const k = `${status}|${Math.round(progress * 20)}|${approved}`
    if (k === key) return
    key = k
    ctx.clearRect(0, 0, 1024, 576)
    ctx.fillStyle = 'rgba(10,18,17,0.92)'
    ctx.fillRect(0, 0, 1024, 46)
    ctx.fillRect(0, 46, 58, 476)
    ctx.fillRect(0, 522, 1024, 54)
    const lw = drawLogo(ctx, logos.light, 16, 10, 26)
    ctx.fillStyle = '#a6b6b3'
    ctx.font = '600 18px "Instrument Sans", system-ui, sans-serif'
    ctx.fillText('Studio', 26 + lw, 30)
    ctx.fillStyle = '#f2eee7'
    ctx.fillText('TB-R1042  circle_of_love.3mf', 340, 30)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i === 1 ? '#4fb487' : 'rgba(166,182,179,0.35)'
      ctx.beginPath()
      ctx.roundRect(15, 66 + i * 56, 28, 28, 7)
      ctx.fill()
    }
    ctx.fillStyle = approved ? '#4fb487' : '#f2eee7'
    ctx.font = '600 20px "Instrument Sans", system-ui, sans-serif'
    ctx.fillText(status, 76, 556)
    ctx.fillStyle = 'rgba(166,182,179,0.25)'
    ctx.fillRect(640, 543, 360, 8)
    ctx.fillStyle = approved ? '#4fb487' : '#f2a93b'
    ctx.fillRect(640, 543, 360 * progress, 8)
    if (approved) {
      ctx.fillStyle = '#127048'
      ctx.beginPath()
      ctx.roundRect(744, 66, 256, 52, 26)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '700 22px "Instrument Sans", system-ui, sans-serif'
      ctx.fillText('✓  Quote approved', 772, 100)
    }
    ui.needsUpdate = true
  }
  return { scene, camera, rt, ui, drawUi, vase, mat, plane, wire }
}

function sampleSurface(object, count) {
  const pts = []
  object.updateMatrixWorld(true)
  const v = new THREE.Vector3()
  object.traverse((o) => {
    if (!o.isMesh) return
    const pos = o.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) pts.push(v.fromBufferAttribute(pos, i).clone().applyMatrix4(o.matrixWorld))
  })
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const p = pts[(i * 7919) % pts.length]
    out.set([p.x + (Math.random() - 0.5) * 0.02, p.y + (Math.random() - 0.5) * 0.02, p.z + (Math.random() - 0.5) * 0.02], i * 3)
  }
  return out
}

function setOpacity(object, o) {
  object.visible = o > 0.002
  object.traverse((m) => {
    if (!m.material) return
    for (const mat of [].concat(m.material)) {
      if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity
      mat.opacity = mat.userData.baseOpacity * o
      mat.transparent = o < 0.999 || mat.userData.baseOpacity < 1
    }
  })
}

// ---------- the film ----------
/** The camera's route and timing, shared by the film and by the scroll pacing below. */
function cameraRig() {
  // camera path, in film time: [t, position, target]. One smooth curve runs through every point,
  // so the camera glides past them instead of stopping at each.
  const cams = [
    [0, [0.5, 1.35, 3.9], [0.05, 0.92, 0.6]],
    [0.16, [0.45, 1.2, 3.0], [0, 0.95, 0.7]],
    [0.215, [-1.2, 2.6, 7.0], [-3.0, 1.2, -0.8]], // phone → PC
    [0.255, [-3.4, 2.1, 3.7], [-5.3, 1.4, -2.3]], // the model on the monitor
    [0.3, [3.8, 4.8, 16.2], [3.4, 1.0, -1.6]], // upload: PC → printer, both in view
    [0.33, [3.5, 4.5, 15.4], [3.2, 1.0, -1.6]],
    [0.5, [1.6, 1.6, 4.6], [1.6, 0.5, -0.3]], // on to the models: sample and filament
    [0.6, [8.2, 2.1, 3.0], [6.4, 0.75, -1.2]], // printing
    [0.72, [7.6, 1.55, 2.0], [6.4, 0.7, -1.2]],
    [0.79, [0.9, 0.85, 2.6], [0.6, 0.08, 1.3]], // phone on the desk
    [0.86, [1.9, 2.0, 4.0], [1.2, 0.35, 0.6]], // boxing
    [0.92, [1.6, 1.85, 3.7], [1.2, 0.4, 0.55]],
    [1, [3.0, 1.95, 5.0], [2.0, 1.25, -3.0]], // the van in the window
  ]
  const camPath = new THREE.CatmullRomCurve3(cams.map(([, p]) => new THREE.Vector3(...p)), false, 'centripetal')
  const aimPath = new THREE.CatmullRomCurve3(cams.map(([, , g]) => new THREE.Vector3(...g)), false, 'centripetal')
  // time → distance along each curve, so the camera's speed rises and falls smoothly between points
  const keyT = cams.map(([t]) => t)
  const along = (curve) => {
    const per = 64
    curve.arcLengthDivisions = (keyT.length - 1) * per
    const lengths = curve.getLengths()
    const total = lengths[lengths.length - 1] || 1
    return monotone(keyT, keyT.map((_, i) => lengths[i * per] / total))
  }
  const camAlong = along(camPath)
  const aimAlong = along(aimPath)
  return { cams, camPath, aimPath, camAlong, aimAlong }
}

/**
 * Scroll pacing: how much scroll each moment of the film gets, so the camera travels at one steady,
 * slow pace from start to end. Moments where the camera barely moves (the printing) keep a floor of
 * `still` times the average, so they still play out slowly. Returns film ↔ scroll maps on 0..1.
 */
export function filmPace(still = 0.8, samples = 1000) {
  const { camPath, aimPath, camAlong, aimAlong } = cameraRig()
  const p = new THREE.Vector3()
  const g = new THREE.Vector3()
  const lastP = new THREE.Vector3()
  const lastG = new THREE.Vector3()
  const moves = []
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    camPath.getPointAt(clamp01(camAlong(t)), p)
    aimPath.getPointAt(clamp01(aimAlong(t)), g)
    if (i) moves.push(p.distanceTo(lastP) + 0.5 * g.distanceTo(lastG)) // where the camera looks counts too
    lastP.copy(p)
    lastG.copy(g)
  }
  const floor = (moves.reduce((a, b) => a + b, 0) / moves.length) * still
  const at = [0]
  for (const m of moves) at.push(at[at.length - 1] + Math.max(m, floor))
  const total = at[samples]
  for (let i = 0; i <= samples; i++) at[i] /= total
  const toScroll = (t) => {
    const x = clamp01(t) * samples
    const i = Math.min(samples - 1, Math.floor(x))
    return at[i] + (at[i + 1] - at[i]) * (x - i)
  }
  const toFilm = (s) => {
    const y = clamp01(s)
    let lo = 0
    let hi = samples
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (at[mid] <= y) lo = mid
      else hi = mid
    }
    return (lo + (y - at[lo]) / (at[hi] - at[lo])) / samples
  }
  return { toFilm, toScroll }
}

export class Film {
  constructor(canvas) {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }))
    r.outputColorSpace = THREE.SRGBColorSpace
    r.toneMapping = THREE.ACESFilmicToneMapping
    r.toneMappingExposure = 1.05
    r.shadowMap.enabled = true
    r.shadowMap.type = THREE.PCFSoftShadowMap
    r.localClippingEnabled = true

    const s = (this.scene = new THREE.Scene())
    this.bg = new THREE.Color('#e9dfd1')
    s.background = this.bg
    const pmrem = new THREE.PMREMGenerator(r)
    s.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    s.environmentIntensity = 0.55
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60)
    this.target = new THREE.Vector3()

    // light: warm sun through the window on the left, soft fill from the room
    this.hemi = new THREE.HemisphereLight('#fff4e4', '#b08a63', 0.9)
    this.sun = new THREE.DirectionalLight('#ffd7a1', 3.2)
    this.sun.position.set(-6, 7, 3)
    this.sun.castShadow = true
    const shadowRes = window.innerWidth < 820 ? 1024 : 2048 // lighter on phones
    this.sun.shadow.mapSize.set(shadowRes, shadowRes)
    Object.assign(this.sun.shadow.camera, { left: -10, right: 11, top: 7, bottom: -7, near: 1, far: 30 })
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.radius = 4
    s.add(this.hemi, this.sun)

    // room
    this.wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.95 })
    // back wall with a real window opening, so the street outside has depth
    const wallShape = new THREE.Shape()
    wallShape.moveTo(-15, -6).lineTo(15, -6).lineTo(15, 6).lineTo(-15, 6).closePath()
    const hole = new THREE.Path()
    hole.moveTo(WIN_X - 2.5, -3.4).lineTo(WIN_X - 2.5, 0.2).lineTo(WIN_X + 2.5, 0.2).lineTo(WIN_X + 2.5, -3.4).closePath()
    wallShape.holes.push(hole)
    const wallGeo = new THREE.ShapeGeometry(wallShape)
    const wp = wallGeo.attributes.position
    for (let i = 0; i < wp.count; i++) wallGeo.attributes.uv.setXY(i, (wp.getX(i) + 15) / 30, (wp.getY(i) + 6) / 12)
    const wall = new THREE.Mesh(wallGeo, this.wallMat)
    wall.position.set(0, 4, -4)
    wall.receiveShadow = true
    const desk = new THREE.Mesh(new THREE.BoxGeometry(20, 0.12, 6), new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.6 }))
    desk.position.set(0.5, -0.06, -0.5)
    desk.receiveShadow = true
    // outside: a sunlit backdrop far behind, a road, and faint glass in the opening
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(40, 18), new THREE.MeshBasicMaterial({ map: outdoorTexture(), toneMapped: false }))
    outside.position.set(WIN_X, 4, -21)
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 18),
      new THREE.MeshStandardMaterial({
        map: canvasTexture(512, 256, (ctx, w, h) => {
          ctx.fillStyle = '#c9c1b4'
          ctx.fillRect(0, 0, w, h)
          ctx.fillStyle = '#6a6c6e'
          ctx.fillRect(0, h * 0.3, w, h * 0.42)
          ctx.fillStyle = '#ece6d8'
          for (let x = 0; x < w; x += 64) ctx.fillRect(x, h * 0.5, 34, 4)
        }),
        roughness: 0.95,
      }),
    )
    road.rotation.x = -Math.PI / 2
    road.position.set(WIN_X, -0.6, -12.5)
    road.receiveShadow = true
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, roughness: 0.05, clearcoat: 1, depthWrite: false }))
    pane.position.set(WIN_X, 2.4, -4.02)
    const frameMat = new THREE.MeshStandardMaterial({ color: '#f6f1e9', roughness: 0.7 })
    const bars = [[0, 1.8, 5.2, 0.12], [0, -1.8, 5.2, 0.12], [-2.5, 0, 0.12, 3.7], [2.5, 0, 0.12, 3.7], [0, 0, 0.08, 3.6], [0, 0.2, 5, 0.06]]
    for (const [x, y, w, h] of bars) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameMat)
      b.position.set(WIN_X + x, 2.4 + y, -3.95)
      s.add(b)
    }
    // sun shafts
    const shaftTex = canvasTexture(64, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(255,232,196,0.5)')
      g.addColorStop(0.6, 'rgba(255,232,196,0.12)')
      g.addColorStop(1, 'rgba(255,232,196,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
    })
    this.shafts = new THREE.Group()
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.35 + i * 0.1, 6), new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
      m.position.set(WIN_X - 1 + i * 0.55, 2.4, -3 + i * 0.25)
      m.rotation.set(0, 0.6, 0.62)
      this.shafts.add(m)
    }
    s.add(wall, desk, outside, road, pane, this.shafts)

    // the courier van pulls up outside the window when the parcel is ready
    this.delivery = makeVan()
    this.delivery.van.rotation.y = Math.PI // drives right to left, nose first
    s.add(this.delivery.van)

    // studio clutter for scale
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.34, 32), new THREE.MeshStandardMaterial({ color: '#d7cfc3', roughness: 0.6 }))
    mug.position.set(3.7, 0.17, 1.0)
    const book = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.08, 0.7, 2, 0.02), new THREE.MeshStandardMaterial({ color: '#7d8a6a', roughness: 0.8 }))
    book.position.set(-1.4, 0.04, 1.5)
    book.rotation.y = 0.3
    for (const m of [mug, book]) m.castShadow = m.receiveShadow = true
    s.add(mug, book)

    // phone held up to the camera, later lying on the desk
    this.screen = phoneScreen()
    this.phone = makePhone(this.screen.tex)
    this.phoneRig = new THREE.Group()
    this.phoneRig.add(this.phone)
    s.add(this.phoneRig)

    // the studio PC: a modelling app on the monitor (screen added when the PC model loads)
    this.cad = makeCad()
    this.monitor = { centre: MONITOR.clone(), w: 3.3, h: 1.85 }

    // particles: photo from the phone into the PC, then the model from the PC into the printer
    const N = 1400
    this.N = N
    this.pDelay = new Float32Array(N)
    this.pJitter = new Float32Array(N * 2)
    for (let i = 0; i < N; i++) {
      this.pDelay[i] = Math.random() * 0.4
      this.pJitter.set([Math.random() - 0.5, Math.random() - 0.5], i * 2)
    }
    this.pA0 = new Float32Array(N * 3) // phone screen
    this.pA1 = new Float32Array(N * 3) // monitor
    this.pB1 = new Float32Array(N * 3) // printed vase on the bed
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    // soft glowing dots in TOBOR green, readable against both the bright studio and the dark screen
    const dot = canvasTexture(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.35, 'rgba(160,255,205,0.95)')
      g.addColorStop(1, 'rgba(18,112,72,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 64, 64)
    })
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ map: dot, color: '#3fd394', size: 0.05, transparent: true, depthWrite: false }))
    s.add(this.particles)

    this.sample = buildShape('spiralVase', VASE_WHITE)
    this.sample.traverse((o) => o.isMesh && (o.castShadow = true))
    s.add(this.sample)
    this.spools = new THREE.Group()
    this.spools.add(makeSpool('#efece6', 1.6, -0.6), makeSpool('#1d6b4a', 2.5, -1.2), makeSpool('#d8c39d', 3.3, -0.5))
    this.spools.scale.setScalar(0.85)
    s.add(this.spools)

    this.printPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0)
    this.printed = buildShape('spiralVase', VASE_WHITE)
    this.printed.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = true
      o.material.clippingPlanes = [this.printPlane]
      o.material.clipShadows = true
    })
    this.printedMat = []
    this.printed.traverse((o) => o.isMesh && this.printedMat.push(o.material))
    this.printed.scale.setScalar(0.95)
    for (const m of this.printedMat) m.userData.uniforms.uLayer.value = 150 // fine 0.2 mm-style layer lines
    s.add(this.printed)
    // molten strand between nozzle and part, purge line along the bed edge, and a brim round the base
    const molten = new THREE.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffb04a', emissiveIntensity: 1.6 })
    this.strand = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.03, 10), molten)
    this.purge = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.006, 0.014), new THREE.MeshStandardMaterial({ color: VASE_WHITE, roughness: 0.5 }))
    this.purge.geometry.translate(0.31, 0, 0) // grows from its left end
    this.outline = vaseOutline
    this.brim = new THREE.Mesh(brimGeometry(this.outline), new THREE.MeshStandardMaterial({ color: VASE_WHITE, roughness: 0.5 }))
    this.brim.rotation.x = -Math.PI / 2
    for (const m of [this.purge, this.brim]) m.receiveShadow = true
    s.add(this.strand, this.purge, this.brim)
    this.setPrinter(proceduralPrinter(makePrinter()))

    this.box = makeBox()
    this.box.group.position.copy(BOX_AT)
    this.boxed = buildShape('spiralVase', VASE_WHITE)
    this.boxed.scale.setScalar(0.52) // fits under the closed flaps
    this.boxed.position.copy(BOX_AT)
    s.add(this.box.group, this.boxed)

    Object.assign(this, cameraRig())
    this.tmp = new THREE.Vector3()
    this.tmpColor = new THREE.Color()
    this.time = 0
    this.loadModels()
  }

  setPrinter(rig) {
    if (this.printerRig) this.scene.remove(this.printerRig.group)
    rig.rest = rig.group.position.clone() // for the running-machine vibration
    this.printerRig = rig
    this.scene.add(rig.group)
    this.flowTargets = null // the upload particles aim at this printer's bed
  }

  /** Swap in the real models as they arrive; the film keeps running with stand-ins meanwhile. */
  loadModels() {
    loadPhone()
      .then(({ root, screenBox }) => {
        if (this.disposed) return
        const size = screenBox.getSize(new THREE.Vector3())
        const centre = screenBox.getCenter(new THREE.Vector3())
        const display = new THREE.Mesh(
          roundedPlane(size.x * 0.99, size.y * 0.99, size.x * 0.13),
          new THREE.MeshPhysicalMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: this.screen.tex, emissiveIntensity: 1.05, roughness: 0.12, clearcoat: 1 }),
        )
        display.position.set(centre.x, centre.y, screenBox.max.z + 0.0002)
        root.add(display)
        this.phoneRig.remove(this.phone)
        this.phone = root
        this.phoneRig.add(root)
      })
      .catch(() => {})
    loadPc()
      .then(({ root, screen }) => {
        if (this.disposed) return
        // place it so its monitor sits where the stand-in monitor was planned
        const box = new THREE.Box3().setFromObject(screen)
        const c = box.getCenter(new THREE.Vector3())
        root.position.set(MONITOR.x - c.x, 0, MONITOR.z - c.z)
        root.updateMatrixWorld(true)
        box.setFromObject(screen)
        const size = box.getSize(new THREE.Vector3())
        box.getCenter(c)
        const w = size.x
        const h = size.y
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.cad.rt.texture, toneMapped: false }))
        glass.position.set(c.x, c.y, box.max.z + 0.012)
        const ui = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.cad.ui, transparent: true, toneMapped: false }))
        ui.position.set(c.x, c.y, box.max.z + 0.016)
        this.monitor = { centre: new THREE.Vector3(c.x, c.y, box.max.z + 0.02), w, h }
        this.scene.add(root, glass, ui)
        this.pcReady = true
        this.flowTargets = null
      })
      .catch(() => {})
    loadPrinter()
      .then((rig) => {
        if (this.disposed) return
        this.setPrinter(glbPrinter(rig))
      })
      .catch(() => {})
    loadPiece()
      .then((geometry) => !this.disposed && this.usePiece(geometry))
      .catch(() => {})
  }

  /** Make `geometry` the piece of the story: the photo, the model on screen, the sample, the print, the parcel. */
  usePiece(geometry) {
    const solid = (material) => {
      const m = new THREE.Mesh(geometry, material)
      m.castShadow = true
      m.receiveShadow = true
      return new THREE.Group().add(m)
    }
    const swap = (old, next) => {
      next.position.copy(old.position)
      next.scale.copy(old.scale)
      next.visible = old.visible
      this.scene.remove(old)
      this.scene.add(next)
      return next
    }
    const printed = printMaterial(VASE_WHITE, { layers: 150 })
    printed.clippingPlanes = [this.printPlane]
    printed.clipShadows = true
    this.printed = swap(this.printed, solid(printed))
    this.printedMat = [printed]
    this.sample = swap(this.sample, solid(printMaterial(VASE_WHITE, { layers: 150 })))
    this.boxed = swap(this.boxed, solid(printMaterial(VASE_WHITE, { layers: 150 })))

    // the modelling app shows the same piece, inside a cage the size of its bounds
    const cad = this.cad
    cad.vase.clear()
    cad.vase.add(new THREE.Mesh(geometry, cad.mat))
    geometry.computeBoundingBox()
    const size = geometry.boundingBox.getSize(new THREE.Vector3())
    cad.wire.geometry.dispose()
    cad.wire.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x * 1.3, 1.02, size.z * 1.3))
    cad.wire.position.y = 0.51 * 1.25
    cad.wire.scale.setScalar(1.25)

    // the toolpath and brim follow the piece's real outline
    this.outline = outlineFromGeometry(geometry)
    this.brim.geometry.dispose()
    this.brim.geometry = brimGeometry(this.outline)
    this.flowTargets = null

    // and the customer's photo on the phone is of this piece
    const url = renderObjectThumb(solid(printMaterial(VASE_WHITE, { layers: 150 })))
    if (url) this.screen.setPhoto(url)
  }

  resize(width, height, dpr) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.portrait = width / height < 1
    this.camera.fov = this.portrait ? 52 : 34
    // Wide screens: push the subject right of the caption and hero copy. Phones: lift it above the caption.
    if (this.portrait) this.camera.setViewOffset(width, height, 0, height * 0.12, width, height)
    else this.camera.setViewOffset(width, height, -width * 0.16, 0, width, height)
    this.camera.updateProjectionMatrix()
  }

  cameraAt(t) {
    this.camPath.getPointAt(clamp01(this.camAlong(t)), this.camera.position)
    this.aimPath.getPointAt(clamp01(this.aimAlong(t)), this.target)
    if (this.portrait) this.camera.position.lerp(this.target, -0.25)
    this.camera.lookAt(this.target)
  }

  update(t, dt = 0, still = false) {
    if (!still) this.time += dt
    const time = this.time
    this.cameraAt(t)

    // the room dims a little while the monitor is the star, then the sun comes back
    const dim = seg(t, 0.2, 0.26) * (1 - seg(t, 0.4, 0.46))
    this.sun.intensity = mix(3.2, 1.5, dim)
    this.hemi.intensity = mix(0.9, 0.45, dim)
    this.scene.environmentIntensity = mix(0.55, 0.3, dim)
    this.bg.set('#e9dfd1').lerp(this.tmpColor.set('#6f6a62'), dim)
    this.wallMat.color.set('#ffffff').lerp(this.tmpColor.set('#9a948b'), dim)
    this.shafts.traverse((m) => m.material && (m.material.opacity = 0.12 * (1 - dim)))

    // 1. the phone: held up, typing, uploaded; later lying on the desk with the result
    const held = 1 - seg(t, 0.19, 0.24)
    const onDesk = seg(t, 0.72, 0.76) * (1 - seg(t, 0.84, 0.87))
    this.phoneRig.visible = held > 0.001 || onDesk > 0.001
    if (held > 0.001) {
      this.phoneRig.position.set(0.05, 0.95 + Math.sin(time * 1.1) * 0.006 - (1 - held) * 0.4, 1.2)
      this.phoneRig.rotation.set(-0.1, -0.34 + Math.sin(time * 0.6) * 0.02, 0.04)
      this.screen.draw(t > 0.15 ? 'uploaded' : 'form', seg(t, 0.03, 0.12))
    } else {
      this.phoneRig.position.copy(PHONE_DESK)
      this.phoneRig.rotation.set(-Math.PI / 2, 0, 0.35)
      this.screen.draw('done')
    }

    // 2. the photo streams from the phone into the PC; the model builds on the monitor;
    //    then it streams from the PC into the printer.
    this.flowPoints()
    const pa = clamp01((t - 0.165) / 0.07)
    const pb = clamp01((t - 0.265) / 0.055)
    const flowA = pa > 0 && pa < 1
    const flowB = pb > 0 && pb < 1
    this.particles.visible = flowA || flowB
    if (this.particles.visible) {
      const arr = this.particles.geometry.attributes.position.array
      const [from, to, k, arc] = flowA ? [this.pA0, this.pA1, pa, 0.9] : [this.pA1, this.pB1, pb, 1.8]
      this.particles.material.size = flowA ? 0.06 : 0.13 // the upload is seen from further away
      for (let i = 0; i < this.N; i++) {
        const u = ease(clamp01((k - this.pDelay[i] * 0.5) / 0.55))
        const j = i * 3
        arr[j] = mix(from[j], to[j], u)
        arr[j + 1] = mix(from[j + 1], to[j + 1], u) + Math.sin(u * Math.PI) * arc
        arr[j + 2] = mix(from[j + 2], to[j + 2], u)
      }
      this.particles.geometry.attributes.position.needsUpdate = true
      this.particles.material.opacity = Math.min(1, k * 6) * (1 - seg(k, 0.8, 1))
    }

    const cad = this.cad
    const onScreen = t > 0.15 && t < 0.5
    if (onScreen) {
      const build = seg(t, 0.21, 0.265)
      const approved = false
      cad.plane.constant = mix(0, 1.7, build)
      cad.mat.uniforms.uAlpha.value = seg(t, 0.205, 0.22)
      cad.mat.uniforms.uTime.value = time
      cad.mat.uniforms.uColor.value.set(approved ? '#7dffc4' : '#5cffb5')
      cad.vase.rotation.y = time * 0.4 + t * 6
      cad.wire.visible = build < 1
      const status =
        t < 0.21 ? 'Receiving 3 photos from Raghul…'
        : t < 0.265 ? `Modelling from photos… ${Math.round(build * 100)}%`
        : t < 0.32 ? 'Sending to printer: sliced into 250 layers'
        : 'Sliced into 250 layers, queued for printing'
      const progress = t < 0.21 ? seg(t, 0.165, 0.21) : t < 0.265 ? build : t < 0.32 ? seg(t, 0.265, 0.32) : 1
      cad.drawUi(status, progress, approved)
      this.renderer.setRenderTarget(cad.rt)
      this.renderer.render(cad.scene, cad.camera)
      this.renderer.setRenderTarget(null)
    }

    // 4. solid sample floats over the desk next to the filament; payment happens here
    const sampleIn = seg(t, 0.4, 0.44) * (1 - seg(t, 0.53, 0.56))
    setOpacity(this.sample, sampleIn)
    this.sample.position.set(0.6, 0.15 + Math.sin(time * 1.4) * 0.03, 0.2)
    this.sample.rotation.y = t * 7
    this.sample.scale.setScalar(0.95)
    this.spools.visible = t > 0.38 && t < 0.84

    // 5. printing, like a real FDM machine: a purge line first, then layer after layer at a steady
    //    rate. Within each pass the nozzle traces the piece's outline at that height, the toolhead
    //    moving in x and the bed in z, and plastic appears only where the nozzle has been.
    const VASE_H = PRINT_SCALE
    const LAYER_H = VASE_H / FILM_LAYERS
    const PASS = 6 // layers shown per trip round the outline, so each trip is visible while scrolling
    const purgeT = seg(t, 0.553, 0.562)
    const printT = clamp01((t - 0.562) / 0.148) // constant layer rate, no easing
    const printing = printT > 0 && printT < 1
    const layers = printT * FILM_LAYERS
    const h = printT * VASE_H
    const theta = printing ? ((layers / PASS) % 1) * Math.PI * 2 : 0
    const v = Math.min(h, VASE_H - LAYER_H) / VASE_H
    const radius = this.outline(v, theta) * PRINT_SCALE
    const park = seg(t, 0.71, 0.75)
    const rig = this.printerRig
    const sweep = -0.31 + purgeT * 0.62 // the purge stroke runs along the gantry near the bed's front edge
    const toolX = printT > 0 ? radius * Math.cos(theta) * (1 - park) : rig.front.x * 0.3 + rig.along.x * sweep
    const toolZ = printT > 0 ? radius * Math.sin(theta) * (1 - park) : rig.front.z * 0.3 + rig.along.z * sweep
    const showPrinted = t > 0.53 && t < 0.86
    this.printed.visible = showPrinted && printT > 0
    const hot = seg(t, 0.55, 0.56) * (1 - seg(t, 0.71, 0.73))
    const bedShift = rig.pose(h, toolX, toolZ, park, hot)
    const px = rig.bed.x + bedShift.x
    const pz = rig.bed.z + bedShift.z
    this.printed.position.set(px, rig.bed.y, pz)
    this.printPlane.constant = rig.bed.y + h + 0.001
    const nozzle = this.tmp.set(px + toolX, rig.bed.y + h, pz + toolZ)
    for (const m of this.printedMat) {
      const u = m.userData.uniforms
      u.uCut.value = rig.bed.y + h
      u.uGlow.value = hot
      u.uBand.value = printing ? PASS * LAYER_H : 0
      u.uAngle.value = printing ? theta : 10
      u.uCenter.value.set(px, pz)
      u.uNozzle.value.copy(nozzle)
    }
    // molten strand under the nozzle while it is extruding
    this.strand.visible = showPrinted && hot > 0.2 && park < 0.5
    this.strand.position.set(nozzle.x, nozzle.y + 0.012, nozzle.z)
    // purge line on the bed's front edge, and a brim round the base; both ride on the bed
    this.purge.visible = showPrinted && purgeT > 0
    this.purge.scale.x = Math.max(0.001, purgeT)
    this.purge.position.set(px + rig.front.x * 0.3 - rig.along.x * 0.31, rig.bed.y + 0.003, pz + rig.front.z * 0.3 - rig.along.z * 0.31)
    this.purge.rotation.y = Math.atan2(-rig.along.z, rig.along.x) // lie along the gantry
    this.brim.visible = showPrinted && layers > 0.5
    this.brim.position.set(px, rig.bed.y + 0.001, pz)
    // a running printer shakes very slightly
    const shake = hot * (1 - park) * (printing ? 1 : 0)
    rig.group.position.set(
      rig.rest.x + Math.sin(time * 97) * 0.0016 * shake,
      rig.rest.y,
      rig.rest.z + Math.sin(time * 83 + 1) * 0.0012 * shake,
    )

    // 6/7. the print goes into a labelled box; flaps fold; the courier van waits outside
    const boxIn = seg(t, 0.85, 0.875)
    this.box.group.visible = boxIn > 0.001
    this.box.group.scale.setScalar(0.6 + 0.4 * boxIn)
    this.boxed.visible = t > 0.86
    this.boxed.position.y = mix(0.9, 0.04, seg(t, 0.86, 0.885))
    const close = seg(t, 0.885, 0.915)
    for (const [i, f] of this.box.flaps.entries()) {
      // open: leaning outward; closed: folded flat inward. Short side flaps first, then the long ones.
      const fold = i < 2 ? seg(t, 0.9, 0.93) : close
      f.rotation.x = mix(f.userData.s * 0.6, -f.userData.s * (Math.PI / 2), fold)
    }

    // 8. the courier van drives along the street outside and stops in the window
    const { van, body, wheels } = this.delivery
    const u = clamp01((t - 0.9) / 0.075)
    van.visible = u > 0
    const drive = 1 - (1 - u) ** 3 // eases to a stop
    const travel = 13.4 * drive // from behind the wall on the right to the middle of the window
    van.position.set(WIN_X + 12.8 - travel, -0.6, -11)
    for (const w of wheels) w.spin.rotation.z = -w.side * (travel / 0.4)
    const brake = Math.sin(Math.PI * clamp01((u - 0.72) / 0.28))
    body.rotation.z = -0.022 * brake // nose dips as it brakes, then settles
    body.position.y = -0.015 * brake

    this.renderer.render(this.scene, this.camera)
  }

  /** Particle start/end points; recomputed once the real PC and printer are in place. */
  flowPoints() {
    const key = `${this.pcReady}|${this.printerRig.kind}`
    if (this.flowTargets === key) return
    this.flowTargets = key
    const { centre, w, h } = this.monitor
    for (let i = 0; i < this.N; i++) {
      const jx = this.pJitter[i * 2]
      const jy = this.pJitter[i * 2 + 1]
      this.pA0.set([0.05 + jx * 0.3, 0.95 + jy * 0.6, 1.25], i * 3)
      this.pA1.set([centre.x + jx * w * 0.8, centre.y + jy * h * 0.75, centre.z], i * 3)
    }
    // the upload lands where the vase will print, at its finished size
    const rig = this.printerRig
    this.printed.position.set(rig.bed.x, rig.bed.y, rig.bed.z)
    this.pB1.set(sampleSurface(this.printed, this.N))
  }

  dispose() {
    this.disposed = true
    this.cad.rt.dispose()
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) [].concat(o.material).forEach((m) => {
        m.map?.dispose()
        m.dispose()
      })
    })
    this.scene.environment?.dispose()
    this.renderer.dispose()
  }
}
