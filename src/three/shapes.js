// Procedural models for the shop catalog and the story mascot. Each builder returns a Group
// standing on y = 0, centred on x/z, and exactly 1 unit tall (see `normalize`).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js'
import { printMaterial } from './materials.js'

const mesh = (geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) => {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(...pos)
  m.rotation.set(...rot)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

export function normalize(group, height = 1) {
  const box = new THREE.Box3().setFromObject(group)
  const size = box.getSize(new THREE.Vector3())
  const s = height / size.y
  group.scale.setScalar(s)
  const c = box.getCenter(new THREE.Vector3())
  group.position.set(-c.x * s, -box.min.y * s, -c.z * s)
  const wrap = new THREE.Group()
  wrap.add(group)
  return wrap
}

// ---------- the mascot ----------
export function robot(mat, accent = mat) {
  const g = new THREE.Group()
  const rb = (w, h, d, r = 0.05) => new RoundedBoxGeometry(w, h, d, 4, r)
  for (const x of [-0.15, 0.15]) {
    g.add(mesh(rb(0.22, 0.1, 0.3, 0.04), mat, [x, 0.05, 0.03]))
    g.add(mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.28, 24), mat, [x, 0.24, 0]))
  }
  g.add(mesh(rb(0.64, 0.56, 0.44, 0.09), mat, [0, 0.64, 0]))
  const panel = mesh(rb(0.3, 0.17, 0.05, 0.02), accent, [0, 0.66, 0.22])
  panel.userData.part = 'panel'
  g.add(panel)
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 16), mat, [s * 0.41, 0.62, 0], [0, 0, s * 0.22]))
    g.add(mesh(new THREE.SphereGeometry(0.085, 20, 16), mat, [s * 0.46, 0.4, 0]))
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 20), mat, [s * 0.29, 1.2, 0], [0, 0, Math.PI / 2]))
  }
  g.add(mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.09, 20), mat, [0, 0.96, 0]))
  g.add(mesh(rb(0.54, 0.42, 0.42, 0.1), mat, [0, 1.2, 0]))
  for (const x of [-0.11, 0.11]) {
    const eye = mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.04, 24), accent, [x, 1.22, 0.205], [Math.PI / 2, 0, 0])
    eye.userData.part = 'eye'
    g.add(eye)
  }
  g.add(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.18, 10), mat, [0, 1.49, 0]))
  const bulb = mesh(new THREE.SphereGeometry(0.045, 16, 12), accent, [0, 1.6, 0])
  bulb.userData.part = 'bulb'
  g.add(bulb)
  return normalize(g)
}

// ---------- catalog ----------
function lathe(profile, segments) {
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), segments)
}

function spiralVase(mat) {
  mat.side = THREE.DoubleSide
  mat.flatShading = true
  const pts = [[0, 0]]
  for (let i = 0; i <= 40; i++) {
    const y = (i / 40) * 2
    pts.push([0.42 + 0.16 * Math.sin(y * 1.7 + 0.4) - (y > 1.6 ? (y - 1.6) * 0.25 : 0), y])
  }
  const geo = lathe(pts, 6)
  const p = geo.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const a = v.y * 0.9
    p.setXYZ(i, v.x * Math.cos(a) - v.z * Math.sin(a), v.y, v.x * Math.sin(a) + v.z * Math.cos(a))
  }
  geo.computeVertexNormals()
  return normalize(new THREE.Group().add(mesh(geo, mat)))
}

function hexPlanter(mat) {
  mat.side = THREE.DoubleSide
  mat.flatShading = true
  const body = lathe([[0, 0.08], [0.5, 0.08], [0.6, 0.85], [0.54, 0.85], [0.46, 0.2], [0, 0.2]], 6)
  const tray = lathe([[0, 0], [0.7, 0], [0.72, 0.1], [0.66, 0.1], [0.64, 0.04], [0, 0.04]], 6)
  return normalize(new THREE.Group().add(mesh(body, mat), mesh(tray, mat)))
}

function ribbedLamp(mat) {
  mat.side = THREE.DoubleSide
  const geo = new ParametricGeometry(
    (u, v, t) => {
      const th = u * Math.PI * 2
      const r = 0.42 + 0.14 * Math.sin(v * Math.PI) + 0.03 * Math.sin(th * 18 + v * 5)
      t.set(r * Math.cos(th), v * 1.15, r * Math.sin(th))
    },
    160,
    40,
  )
  const ring = new THREE.TorusGeometry(0.43, 0.02, 8, 64)
  return normalize(new THREE.Group().add(mesh(geo, mat), mesh(ring, mat, [0, 1.15, 0], [Math.PI / 2, 0, 0])))
}

function extrude(shape, depth, bevel = 0.015) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24 })
}

function phoneStand(mat) {
  const s = new THREE.Shape()
  s.moveTo(0, 0).lineTo(1, 0).lineTo(1, 0.08).lineTo(0.84, 0.08).lineTo(0.84, 0.22).lineTo(0.76, 0.22).lineTo(0.76, 0.08)
  s.lineTo(0.52, 0.08).lineTo(0.16, 1).lineTo(0.04, 0.97).lineTo(0, 0.4).lineTo(0, 0)
  const hole = new THREE.Path().moveTo(0.1, 0.12).lineTo(0.38, 0.12).lineTo(0.12, 0.72).lineTo(0.1, 0.12)
  s.holes.push(hole)
  const geo = extrude(s, 0.7)
  geo.translate(-0.5, 0, -0.35)
  return normalize(new THREE.Group().add(mesh(geo, mat, [0, 0, 0], [0, 0.45, 0])))
}

function headphoneStand(mat) {
  const g = new THREE.Group()
  g.add(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.09, 64), mat, [0, 0.045, 0]))
  g.add(mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.4, 32), mat, [0, 0.75, 0]))
  const arc = mesh(new THREE.TorusGeometry(0.34, 0.06, 16, 48, Math.PI), mat, [0, 1.36, 0], [0, Math.PI / 2, 0])
  arc.scale.set(1, 0.45, 1)
  g.add(arc)
  return normalize(g)
}

function roundedRect(path, x, y, w, h, r) {
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y).quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + h - r).quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  path.lineTo(x + r, y + h).quadraticCurveTo(x, y + h, x, y + h - r)
  path.lineTo(x, y + r).quadraticCurveTo(x, y, x + r, y)
  return path
}

function deskTray(mat) {
  const outer = () => roundedRect(new THREE.Shape(), -1, -0.6, 2, 1.2, 0.14)
  const walls = outer()
  const cells = [[-0.94, -0.54, 0.56, 1.08], [-0.32, 0.04, 0.6, 0.5], [-0.32, -0.54, 0.6, 0.52], [0.34, 0.12, 0.6, 0.42], [0.34, -0.54, 0.6, 0.6]]
  for (const [x, y, w, h] of cells) walls.holes.push(roundedRect(new THREE.Path(), x, y, w, h, 0.08))
  const g = new THREE.Group()
  g.add(mesh(extrude(walls, 0.42, 0.01), mat, [0, 0.06, 0], [-Math.PI / 2, 0, 0]))
  g.add(mesh(extrude(outer(), 0.06, 0.01), mat, [0, 0, 0], [-Math.PI / 2, 0, 0]))
  return normalize(g)
}

function penHive(mat) {
  mat.side = THREE.DoubleSide
  mat.flatShading = true
  const g = new THREE.Group()
  const r = 0.24
  const spots = [[0, 0, 1], [1, 0, 0.82], [-1, 0, 0.7], [0.5, 1, 0.9], [-0.5, 1, 0.62], [0.5, -1, 0.74], [-0.5, -1, 0.86]]
  for (const [cx, cz, h] of spots) {
    const x = cx * r * 1.74
    const z = cz * r * 1.5
    g.add(mesh(new THREE.CylinderGeometry(r, r, h, 6, 1, true), mat, [x, h / 2, z], [0, Math.PI / 6, 0]))
    g.add(mesh(new THREE.CylinderGeometry(r, r, 0.04, 6), mat, [x, 0.02, z], [0, Math.PI / 6, 0]))
  }
  return normalize(g)
}

function piCase(mat) {
  const g = new THREE.Group()
  g.add(mesh(new RoundedBoxGeometry(1.9, 0.5, 1.3, 4, 0.08), mat, [0, 0.25, 0]))
  const lid = roundedRect(new THREE.Shape(), -0.95, -0.65, 1.9, 1.3, 0.1)
  for (let i = 0; i < 7; i++) lid.holes.push(roundedRect(new THREE.Path(), -0.8 + i * 0.12, -0.45, 0.06, 0.9, 0.03))
  lid.holes.push(new THREE.Path().absarc(0.45, 0, 0.3, 0, Math.PI * 2, true))
  g.add(mesh(extrude(lid, 0.06, 0.01), mat, [0, 0.5, 0], [-Math.PI / 2, 0, 0]))
  return normalize(g)
}

function gearShape(teeth, root, tip, bore) {
  const s = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts = [[root, a], [tip, a + step * 0.18], [tip, a + step * 0.42], [root, a + step * 0.6]]
    pts.forEach(([r, t], k) => (i === 0 && k === 0 ? s.moveTo(r * Math.cos(t), r * Math.sin(t)) : s.lineTo(r * Math.cos(t), r * Math.sin(t))))
  }
  s.closePath()
  s.holes.push(new THREE.Path().absarc(0, 0, bore, 0, Math.PI * 2, true))
  if (root > 0.5) for (let i = 0; i < 5; i++) {
    const t = (i / 5) * Math.PI * 2
    s.holes.push(new THREE.Path().absarc(Math.cos(t) * root * 0.55, Math.sin(t) * root * 0.55, root * 0.17, 0, Math.PI * 2, true))
  }
  return s
}

function gear(mat) {
  const g = new THREE.Group()
  g.add(mesh(extrude(gearShape(20, 0.82, 0.95, 0.12), 0.2), mat, [0, 0, 0], [-Math.PI / 2, 0, 0]))
  g.add(mesh(extrude(gearShape(12, 0.46, 0.58, 0.1), 0.2), mat, [1.45, 0.0, 0.25], [-Math.PI / 2, 0, 0.13]))
  return normalize(g, 0.4)
}

function cableClip(mat) {
  const clip = () => {
    const s = new THREE.Shape()
    s.moveTo(-0.4, 0).lineTo(0.4, 0).lineTo(0.4, 0.08).lineTo(0.2, 0.08)
    s.absarc(0, 0.36, 0.3, -Math.PI / 2 + 0.75, Math.PI * 0.32, false)
    s.absarc(0, 0.36, 0.2, Math.PI * 0.32, -Math.PI / 2 + 0.85, true)
    s.lineTo(-0.2, 0.08).lineTo(-0.4, 0.08).closePath()
    return extrude(s, 0.35, 0.02)
  }
  const g = new THREE.Group()
  ;[-0.95, 0, 0.95].forEach((x, i) => g.add(mesh(clip(), mat, [x, 0, -0.17 + i * 0.05])))
  return normalize(g, 0.55)
}

function chessKing(mat) {
  const g = new THREE.Group()
  const prof = [[0, 0], [0.42, 0], [0.42, 0.08], [0.36, 0.12], [0.34, 0.18], [0.24, 0.24], [0.17, 0.5], [0.14, 0.8], [0.24, 0.84], [0.24, 0.88], [0.15, 0.92], [0.24, 1.15], [0.2, 1.22], [0, 1.24]]
  g.add(mesh(lathe(prof, 48), mat))
  g.add(mesh(new THREE.BoxGeometry(0.07, 0.3, 0.07), mat, [0, 1.38, 0]))
  g.add(mesh(new THREE.BoxGeometry(0.22, 0.07, 0.07), mat, [0, 1.42, 0]))
  return normalize(g)
}

const BUILDERS = {
  robot: (m) => robot(m),
  spiralVase,
  hexPlanter,
  ribbedLamp,
  phoneStand,
  headphoneStand,
  deskTray,
  penHive,
  piCase,
  gear,
  cableClip,
  chessKing,
}

/** Build a catalog model in the given colour. */
export function buildShape(name, color) {
  const mat = printMaterial(color, { layers: 70 })
  return (BUILDERS[name] ?? BUILDERS.robot)(mat)
}
