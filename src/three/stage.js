// Shared lighting and floor for product renders, thumbnails and the quote preview.
import * as THREE from 'three'

let shadowTexture
function contactShadow() {
  if (shadowTexture) return shadowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(70,48,22,0.32)')
  g.addColorStop(1, 'rgba(70,48,22,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  shadowTexture = new THREE.CanvasTexture(c)
  return shadowTexture
}

export function createStage() {
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#fff8ee', '#c9b49a', 1.6))
  const key = new THREE.DirectionalLight('#fff1dc', 2.3)
  key.position.set(2.5, 4, 3)
  scene.add(key)
  const rim = new THREE.DirectionalLight('#cfe9dc', 1.2)
  rim.position.set(-3, 2, -3)
  scene.add(rim)
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false }))
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.001
  scene.add(shadow)
  return { scene, shadow }
}

/** Place the camera so the object (standing on y=0) fills the frame. */
export function frameObject(camera, object, { distance = 1, elevation = 0.42 } = {}) {
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(size.x, size.y, size.z) * 0.62
  const fov = THREE.MathUtils.degToRad(camera.fov)
  const d = (radius / Math.sin(fov / 2)) * distance
  camera.position.set(center.x + d * 0.62, center.y + d * elevation, center.z + d * 0.78)
  camera.near = d / 50
  camera.far = d * 20
  camera.updateProjectionMatrix()
  camera.lookAt(center)
  return center
}

export function disposeObject(object) {
  object.traverse((o) => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) [].concat(o.material).forEach((m) => m.dispose())
  })
}
