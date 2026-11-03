// Live 3D models for "Design your own": a name keychain, a desk name stand, and a stand-in
// figure for the Mini-Me. Built in millimetres, then scaled so a 60 mm keychain is 0.6 units
// wide, in scale with the shop models. Every model stands on y = 0, centred on x and z.
import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { printMaterial } from './materials.js'
import { buildShape } from './shapes.js'
import { FONTS, TEXT_PRODUCTS, MINIME } from '../../shared/designs.js'
import { COLORS, byId } from '../../shared/pricing.js'

const MM = 0.01
const fonts = new Map()

/** The typeface for a font id, fetched once and shared by every preview. */
export function loadFont(id) {
  const f = byId(FONTS, id) ?? FONTS[0]
  if (!fonts.has(f.id)) fonts.set(f.id, new FontLoader().loadAsync(f.file))
  return fonts.get(f.id)
}

const hex = (id) => byId(COLORS, id)?.hex ?? COLORS[0].hex
const material = (colorId) => printMaterial(hex(colorId), { layers: 160 })

function mesh(geo, mat) {
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/**
 * Extruded text in mm: `width` wide (or shorter when that would make it taller than `maxHeight`),
 * with its left, bottom and back faces at the origin. Returns the mesh and its ink size.
 */
function textMesh(text, font, { width, maxHeight }, depth, mat) {
  const geo = new TextGeometry(text, { font, size: 10, depth, curveSegments: 5, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 2 })
  geo.computeBoundingBox()
  let b = geo.boundingBox
  const w0 = b.max.x - b.min.x
  const h0 = b.max.y - b.min.y
  const s = Math.min(width / w0, maxHeight / h0)
  geo.scale(s, s, 1)
  geo.computeBoundingBox()
  b = geo.boundingBox
  geo.translate(-b.min.x, -b.min.y, -b.min.z)
  return { mesh: mesh(geo, mat), w: b.max.x - b.min.x, h: b.max.y - b.min.y }
}

/** Centre the group on x/z, stand it on y = 0, scale to scene units, and report the size in mm. */
function finish(group) {
  const box = new THREE.Box3().setFromObject(group)
  const size = box.getSize(new THREE.Vector3())
  const c = box.getCenter(new THREE.Vector3())
  group.position.set(-c.x, -box.min.y, -c.z)
  const wrap = new THREE.Group()
  wrap.add(group)
  wrap.scale.setScalar(MM)
  return { object: wrap, mm: { width: Math.round(size.x), height: Math.round(size.y), depth: Math.round(size.z) } }
}

/** A tag with raised letters in a second colour and a solid keyring loop on the left. */
function keychain(font, design, size) {
  const pad = 4
  const loopR = 4.5
  const tube = 1.3
  const plateW = size.width - loopR
  const plateT = 3
  const letters = material(design.textColor)
  const tag = material(design.baseColor)
  const { mesh: t, w, h } = textMesh(design.text, font, { width: plateW - pad * 2, maxHeight: 24 }, 2, letters)
  const plateH = Math.max(18, h + pad * 2)
  const g = new THREE.Group()
  g.add(mesh(new RoundedBoxGeometry(plateW, plateH, plateT, 4, 3), tag))
  t.position.set(-w / 2, -h / 2, plateT / 2 - 0.2)
  g.add(t)
  const loop = mesh(new THREE.TorusGeometry(loopR, tube, 10, 28), tag)
  loop.position.set(-plateW / 2 - loopR + tube, 0, 0)
  g.add(loop)
  return finish(g)
}

/** Standing letters, 12 mm thick, on a rounded base in the second colour. */
function stand(font, design, size) {
  const letters = material(design.textColor)
  const base = material(design.baseColor)
  const { mesh: t, w } = textMesh(design.text, font, { width: size.width - 10, maxHeight: size.width * 0.34 }, 12, letters)
  const baseH = 5
  const g = new THREE.Group()
  const slab = mesh(new RoundedBoxGeometry(w + 14, baseH, 20, 3, 2), base)
  slab.position.y = baseH / 2
  g.add(slab)
  t.position.set(-w / 2, baseH - 0.5, -6)
  g.add(t)
  return finish(g)
}

/** The keychain or stand for a normalised text design. Waits for the font on first use. */
export async function buildTextModel(design) {
  const product = TEXT_PRODUCTS[design.product]
  const size = byId(product.sizes, design.size) ?? product.sizes[0]
  const font = await loadFont(design.font)
  return design.product === 'stand' ? stand(font, design, size) : keychain(font, design, size)
}

/**
 * A stand-in for the Mini-Me preview: the TOBOR mascot in the chosen accent colour, with the
 * loop, base or magnet plate of the chosen style. The real figure is modelled from the customer's photos.
 */
export function buildMiniMe(design) {
  const style = byId(MINIME.styles, design.style) ?? MINIME.styles[0]
  const figure = buildShape('robot', hex(design.accent))
  const white = printMaterial(COLORS[1].hex, { layers: 70 })
  const g = new THREE.Group()
  g.add(figure)
  if (style.id === 'standee') {
    const disc = mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.05, 40), white)
    disc.position.y = 0.025
    figure.position.y = 0.05
    g.add(disc)
  } else if (style.id === 'keychain') {
    const loop = mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 24), white)
    loop.position.set(0, 1.06, 0)
    g.add(loop)
  } else {
    const plate = mesh(new RoundedBoxGeometry(0.9, 1.02, 0.06, 3, 0.08), white)
    plate.position.set(0, 0.51, -0.32)
    g.add(plate)
  }
  g.scale.setScalar(style.height * MM)
  const wrap = new THREE.Group()
  wrap.add(g)
  return { object: wrap, mm: { width: Math.round(style.height * 0.6), height: style.height, depth: Math.round(style.height * 0.4) } }
}
