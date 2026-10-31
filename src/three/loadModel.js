// Parse customer model files in the browser for the live preview and instant price.
import * as THREE from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { ThreeMFLoader } from 'three/addons/loaders/3MFLoader.js'
import { printMaterial } from './materials.js'

export const ACCEPTED = '.stl,.obj,.3mf,.step,.stp'
export const MAX_BYTES = 100 * 1024 * 1024
export const extOf = (name) => name.split('.').pop().toLowerCase()
export const previewable = (name) => ['stl', 'obj', '3mf'].includes(extOf(name))

const a = new THREE.Vector3()
const b = new THREE.Vector3()
const c = new THREE.Vector3()

function meshVolume(geometry, matrix) {
  const pos = geometry.attributes.position
  const idx = geometry.index
  const tri = idx ? idx.count / 3 : pos.count / 3
  let vol = 0
  for (let i = 0; i < tri; i++) {
    const [i0, i1, i2] = idx ? [idx.getX(i * 3), idx.getX(i * 3 + 1), idx.getX(i * 3 + 2)] : [i * 3, i * 3 + 1, i * 3 + 2]
    a.fromBufferAttribute(pos, i0).applyMatrix4(matrix)
    b.fromBufferAttribute(pos, i1).applyMatrix4(matrix)
    c.fromBufferAttribute(pos, i2).applyMatrix4(matrix)
    vol += a.dot(b.clone().cross(c)) / 6
  }
  return { vol, tri }
}

/**
 * Returns { object, volumeCm3, sizeMm: {x,y,z}, triangles }. Units are assumed to be millimetres;
 * Z-up files (most slicers) are turned Y-up for display. The object is scaled to 1 unit tall.
 */
export async function loadModelFile(file) {
  const ext = extOf(file.name)
  let root
  if (ext === 'stl') {
    const geo = new STLLoader().parse(await file.arrayBuffer())
    root = new THREE.Group().add(new THREE.Mesh(geo))
  } else if (ext === 'obj') {
    root = new OBJLoader().parse(await file.text())
  } else if (ext === '3mf') {
    root = new ThreeMFLoader().parse(await file.arrayBuffer())
  } else {
    throw new Error('Preview is not available for this file type.')
  }
  root.updateMatrixWorld(true)

  let volume = 0
  let triangles = 0
  const meshes = []
  root.traverse((o) => {
    if (o.isMesh) {
      const r = meshVolume(o.geometry, o.matrixWorld)
      volume += r.vol
      triangles += r.tri
      meshes.push(o)
    }
  })
  if (!meshes.length) throw new Error('We could not find any geometry in this file.')

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())

  // Display copy: Z-up → Y-up, standing on the floor, 1 unit tall.
  const material = printMaterial('#2e46f2', { layers: 80, side: THREE.DoubleSide })
  meshes.forEach((m) => {
    m.material = material
    // Many exporters write zero or wrong normals into STL files; recompute them from the faces.
    if (ext === 'stl' || !m.geometry.attributes.normal) m.geometry.computeVertexNormals()
  })
  const display = new THREE.Group()
  display.add(root)
  if (ext !== 'obj') display.rotation.x = -Math.PI / 2
  display.updateMatrixWorld(true)
  const dbox = new THREE.Box3().setFromObject(display)
  const dsize = dbox.getSize(new THREE.Vector3())
  const s = 1 / Math.max(dsize.x, dsize.y, dsize.z)
  const wrap = new THREE.Group()
  wrap.add(display)
  display.scale.setScalar(s)
  const center = dbox.getCenter(new THREE.Vector3())
  display.position.set(-center.x * s, -dbox.min.y * s, -center.z * s)

  return {
    object: wrap,
    volumeCm3: Math.abs(volume) / 1000,
    sizeMm: { x: Math.round(size.x), y: Math.round(size.y), z: Math.round(size.z) },
    triangles,
  }
}
