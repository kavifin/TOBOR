// The TOBOR courier van: a high-roof panel van in TOBOR livery, seen through the studio
// window when the parcel is out for delivery. Units are metres-ish; the film scales it.
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { logos, drawLogo } from '../lib/brand.js'


function canvasTexture(w, h, paint, repeat) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  paint(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}

const shadowed = (m) => {
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// ---------- the van ----------
function vanProfile() {
  // Side silhouette of a high-roof panel van, front at +x. Wheel arches are cut into the sill.
  const s = new THREE.Shape()
  s.moveTo(-2.95, 0.42)
  s.lineTo(-2.95, 2.3)
  s.quadraticCurveTo(-2.95, 2.48, -2.75, 2.48)
  s.lineTo(0.95, 2.5)
  s.quadraticCurveTo(1.38, 2.5, 1.5, 2.28)
  s.lineTo(2.32, 1.4)
  s.quadraticCurveTo(2.44, 1.28, 2.62, 1.25)
  s.lineTo(2.88, 1.17)
  s.quadraticCurveTo(3.0, 1.12, 3.0, 0.98)
  s.lineTo(3.0, 0.5)
  s.quadraticCurveTo(3.0, 0.38, 2.88, 0.38)
  s.lineTo(2.32, 0.38)
  s.absarc(1.83, 0.38, 0.49, 0, Math.PI, false)
  s.lineTo(-1.34, 0.38)
  s.absarc(-1.83, 0.38, 0.49, 0, Math.PI, false)
  s.lineTo(-2.85, 0.38)
  s.quadraticCurveTo(-2.95, 0.38, -2.95, 0.42)
  return s
}

function liveryTexture() {
  // Side decal over the cargo area: door seams, handle, brand stripe and wordmark.
  return canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(40,40,40,0.55)'
    ctx.lineWidth = 3
    ctx.strokeRect(560, 40, 330, 440) // sliding door
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(590, 250, 70, 14) // handle
    const band = ctx.createLinearGradient(0, 0, w, 0)
    band.addColorStop(0, '#127048')
    band.addColorStop(1, '#0b5636')
    ctx.fillStyle = band
    ctx.fillRect(0, 330, w, 54)
    ctx.fillStyle = '#f2a93b'
    ctx.fillRect(0, 384, w, 10)
    drawLogo(ctx, logos.dark, 36, 96, 160)
    ctx.fillStyle = '#2e2823'
    ctx.font = '600 38px "Instrument Sans", system-ui, sans-serif'
    ctx.fillText('3D printed. Delivered to your door.', 44, 305)
  })
}

function rearTexture() {
  return canvasTexture(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = 'rgba(40,40,40,0.6)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(w / 2, 30)
    ctx.lineTo(w / 2, h - 20)
    ctx.stroke()
    ctx.fillStyle = '#1a2329'
    ctx.beginPath()
    ctx.roundRect(60, 60, 170, 130, 16)
    ctx.roundRect(282, 60, 170, 130, 16)
    ctx.fill()
    drawLogo(ctx, logos.dark, 116, 268, 72)
  })
}

function plateTexture(text) {
  return canvasTexture(256, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f6f6f2'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, w - 4, h - 4)
    ctx.fillStyle = '#151515'
    ctx.font = '700 36px "Instrument Sans", system-ui, sans-serif'
    ctx.fillText(text, (w - ctx.measureText(text).width) / 2, 46)
  })
}

function quad(points, mat) {
  const g = new THREE.BufferGeometry()
  const [a, b, c, d] = points
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3))
  g.computeVertexNormals()
  return new THREE.Mesh(g, mat)
}

function makeWheel() {
  const spin = new THREE.Group()
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.26, 40), new THREE.MeshStandardMaterial({ color: '#19191b', roughness: 0.92 }))
  tyre.rotation.x = Math.PI / 2
  const wall = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.075, 12, 40), new THREE.MeshStandardMaterial({ color: '#202022', roughness: 0.85 }))
  wall.position.z = 0.1
  const rimMat = new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 0.9, roughness: 0.28 })
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 40), rimMat)
  rim.rotation.x = Math.PI / 2
  rim.position.z = 0.13
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20), new THREE.MeshStandardMaterial({ color: '#5a5d62', metalness: 0.8, roughness: 0.3 }))
  hub.rotation.x = Math.PI / 2
  hub.position.z = 0.15
  spin.add(tyre, wall, rim, hub)
  for (let i = 0; i < 6; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: '#3b3d41', metalness: 0.6, roughness: 0.4 }))
    const a = (i / 6) * Math.PI * 2
    spoke.position.set(Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.155)
    spoke.rotation.z = a + Math.PI / 2
    spin.add(spoke)
  }
  spin.traverse((o) => o.isMesh && (o.castShadow = true))
  return spin
}

export function makeVan() {
  const van = new THREE.Group() // drives and turns
  const body = new THREE.Group() // pitches when braking
  van.add(body)

  const paint = new THREE.MeshPhysicalMaterial({ color: '#f3f2ee', metalness: 0.15, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 })
  const trim = new THREE.MeshStandardMaterial({ color: '#2b2d30', roughness: 0.7 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#16212a', metalness: 0.3, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide })
  const chrome = new THREE.MeshStandardMaterial({ color: '#d8dbe0', metalness: 1, roughness: 0.18 })

  const W = 2.0
  const shell = new THREE.Mesh(
    new THREE.ExtrudeGeometry(vanProfile(), { depth: W - 0.14, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 24 }),
    paint,
  )
  shell.position.z = -(W - 0.14) / 2
  body.add(shadowed(shell))
  const side = W / 2 + 0.002

  // glass: windscreen, cab side windows, rear door windows
  body.add(quad([[1.53, 2.24, -0.9], [1.53, 2.24, 0.9], [2.29, 1.44, 0.9], [2.29, 1.44, -0.9]].map(([x, y, z]) => [x + 0.025, y + 0.02, z]), glass))
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape()
    shape.moveTo(0.78, 1.5)
    shape.lineTo(0.78, 2.3)
    shape.lineTo(1.38, 2.3)
    shape.lineTo(2.12, 1.5)
    shape.closePath()
    const win = new THREE.Mesh(new THREE.ShapeGeometry(shape), glass)
    win.position.z = s * side
    if (s < 0) win.scale.z = -1 // mirror onto the far side
    body.add(win)
    // livery decal over the cargo side
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.75), new THREE.MeshStandardMaterial({ map: liveryTexture(), transparent: true, roughness: 0.35 }))
    decal.position.set(-1.0, 1.42, s * (side + 0.001))
    if (s < 0) decal.rotation.y = Math.PI // reads front-to-back on that side, like real livery
    body.add(decal)
    // cab door seam + handle
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 1.55), trim)
    seam.position.set(0.72, 1.38, s * (side + 0.002))
    if (s < 0) seam.rotation.y = Math.PI
    const handle = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.04, 0.03, 2, 0.012), trim)
    handle.position.set(1.0, 1.32, s * (side + 0.01))
    // side skirt between the wheels
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.04), trim)
    skirt.position.set(0, 0.5, s * (side + 0.01))
    // mirror
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.22), trim)
    arm.position.set(1.62, 1.62, s * (side + 0.1))
    const mirror = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.32, 0.2, 3, 0.04), trim)
    mirror.position.set(1.6, 1.62, s * (side + 0.24))
    body.add(seam, handle, shadowed(skirt), shadowed(arm), shadowed(mirror))
  }

  // front: grille, bumper, headlights, plate
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.34, 1.05, 3, 0.03), trim)
  grille.position.set(3.04, 0.82, 0)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 1.0), chrome)
  bar.position.set(3.075, 0.86, 0)
  const bumper = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.3, W + 0.1, 3, 0.08), trim)
  bumper.position.set(2.98, 0.5, 0)
  body.add(grille, bar, shadowed(bumper))
  const headMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dc', emissiveIntensity: 1.6 })
  const tailMat = new THREE.MeshStandardMaterial({ color: '#7a0f0f', emissive: '#d11a1a', emissiveIntensity: 0.9 })
  for (const s of [-1, 1]) {
    const lamp = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.16, 0.4, 3, 0.03), headMat)
    lamp.position.set(3.02, 1.04, s * 0.7)
    lamp.rotation.y = -s * 0.25
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.62, 0.11, 3, 0.02), tailMat)
    tail.position.set(-2.99, 1.25, s * 0.96)
    body.add(lamp, tail)
  }
  const plateF = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.13), new THREE.MeshBasicMaterial({ map: plateTexture('TB 1042') }))
  plateF.position.set(3.125, 0.5, 0)
  plateF.rotation.y = Math.PI / 2
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 1.95), new THREE.MeshStandardMaterial({ map: rearTexture(), transparent: true, roughness: 0.3 }))
  rear.position.set(-3.022, 1.45, 0)
  rear.rotation.y = -Math.PI / 2
  const rearBumper = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.24, W + 0.06, 3, 0.06), trim)
  rearBumper.position.set(-2.98, 0.48, 0)
  body.add(plateF, rear, shadowed(rearBumper))

  // wheels (outside the pitching body, so they stay on the road)
  const wheels = []
  for (const x of [-1.83, 1.83]) {
    for (const s of [-1, 1]) {
      const holder = new THREE.Group()
      holder.position.set(x, 0.4, s * 0.88)
      if (s < 0) holder.rotation.y = Math.PI
      const w = makeWheel()
      holder.add(w)
      van.add(holder)
      wheels.push({ spin: w, side: s })
    }
  }

  // soft contact shadow under the chassis
  const ao = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 2.6),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(256, 128, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2)
        g.addColorStop(0, 'rgba(0,0,0,0.55)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, w, h)
      }),
      transparent: true,
      depthWrite: false,
    }),
  )
  ao.rotation.x = -Math.PI / 2
  ao.position.y = 0.012
  van.add(ao)

  return { van, body, wheels, headMat }
}
