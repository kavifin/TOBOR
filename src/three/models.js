// Real 3D models for the scroll film (public/models, optimised with gltf-transform + meshopt).
// Each loader returns ready-to-place objects plus the parts the film animates.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

// Film units per real-world metre: the 0.147 m phone is 0.82 units tall, like the vase scale.
const UNITS_PER_METRE = 5.6

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)

async function load(name) {
  const gltf = await loader.loadAsync(`/models/${name}.glb`)
  const root = gltf.scene
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  root.updateMatrixWorld(true)
  return root
}

const find = (root, test) => {
  let hit = null
  root.traverse((o) => {
    if (!hit && o.isMesh && test(o)) hit = o
  })
  return hit
}

/** Bounding box of `part` in `root`'s own coordinates (root assumed at identity when called). */
function localBox(part) {
  return new THREE.Box3().setFromObject(part)
}

/** Phone (front faces +z). Returns the root and the screen rectangle to cover with the live UI. */
export async function loadPhone() {
  const root = await load('phone')
  const screen = find(root, (o) => o.material?.name === 'Phone_Emission')
  const box = screen ? localBox(screen) : new THREE.Box3(new THREE.Vector3(-0.034, -0.07, 0), new THREE.Vector3(0.034, 0.07, 0.004))
  if (screen) screen.visible = false
  root.scale.setScalar(UNITS_PER_METRE)
  return { root, screenBox: box }
}

/** Gaming PC setup, turned so the monitor faces +z. Its own desk board is hidden (ours is used). */
export async function loadPc() {
  const root = await load('pc')
  const board = find(root, (o) => o.name === 'Cube_Material_0')
  if (board) board.visible = false
  const screen = find(root, (o) => o.name.startsWith('MY_SCREEN'))
  const holder = new THREE.Group()
  holder.add(root)
  root.rotation.y = -Math.PI / 2
  root.scale.setScalar(0.56) // model units are ~10 cm: 0.1 m x 5.6 units per metre
  root.position.y = -0.25 * 0.56 // its desk top sits at y = 0.25 model units
  holder.updateMatrixWorld(true)
  return { root: holder, screen }
}

/**
 * The piece TOBOR prints in the film ("Circle of Love", converted from the Bambu Studio 3MF).
 * Returns one geometry standing on y = 0, centred on x/z and 1 unit tall, like buildShape().
 */
export async function loadPiece() {
  const root = await load('love')
  const mesh = find(root, () => true)
  const geometry = mesh.geometry.clone()
  geometry.applyMatrix4(mesh.matrixWorld)
  geometry.computeBoundingBox()
  const { min, max } = geometry.boundingBox
  geometry.translate(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2)
  geometry.scale(1 / (max.y - min.y), 1 / (max.y - min.y), 1 / (max.y - min.y))
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Bambu Lab A1 mini. Parts were merged by material when optimised, which gives us
 * the toolhead, the X gantry (motors + arm) and the heatbed as separate meshes.
 */
export async function loadPrinter() {
  const root = await load('printer')
  const toolhead = find(root, (o) => o.material?.name === 'Toolhead')
  const gantry = []
  root.traverse((o) => o.isMesh && o.material?.name === 'Motor' && gantry.push(o))
  const bed = find(root, (o) => o.material?.name === 'Heatbed')
  if (!toolhead || !bed) throw new Error('printer parts not found')

  const bedBox = localBox(bed)
  const headBox = localBox(toolhead)
  const rig = {
    root,
    toolhead,
    gantry,
    bed,
    base: new Map([toolhead, bed, ...gantry].map((m) => [m, m.position.clone()])),
    bedTop: bedBox.max.y,
    bedCentre: new THREE.Vector3((bedBox.min.x + bedBox.max.x) / 2, bedBox.max.y, (bedBox.min.z + bedBox.max.z) / 2),
    nozzleTip: headBox.min.y,
    nozzleXZ: new THREE.Vector3((headBox.min.x + headBox.max.x) / 2, 0, (headBox.min.z + headBox.max.z) / 2),
    // the model is built at half scale (its 0.36-unit bed is the A1 mini's 18 cm plate)
    scale: UNITS_PER_METRE * 0.5,
  }
  root.scale.setScalar(rig.scale)
  return rig
}
