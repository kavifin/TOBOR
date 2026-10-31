import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createStage, frameObject, disposeObject } from './stage.js'
import { setMaterialColor } from './materials.js'
import { prefersReducedMotion } from '../lib/smooth.js'

/**
 * Interactive 3D viewer. `object` is a THREE.Object3D standing on y=0 (the viewer takes
 * ownership and disposes it when replaced, unless `keep` is set). Drag to rotate, scroll or pinch to zoom.
 */
export default function Viewer({ object, color, keep = false, label = '3D model preview', className = '' }) {
  const host = useRef(null)
  const state = useRef(null)
  const keepRef = useRef(keep)
  keepRef.current = keep

  useEffect(() => {
    const el = host.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const { scene, shadow } = createStage()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = false
    controls.autoRotate = !prefersReducedMotion()
    controls.autoRotateSpeed = 1.2
    controls.addEventListener('start', () => (controls.autoRotate = false))

    const resize = () => {
      const { width, height } = el.getBoundingClientRect()
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(el)
    resize()

    let raf
    const loop = () => {
      controls.update()
      renderer.render(scene, camera)
      raf = requestAnimationFrame(loop)
    }
    loop()
    state.current = { scene, camera, controls, shadow, current: null }
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      controls.dispose()
      if (state.current.current && !keepRef.current) disposeObject(state.current.current)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  useEffect(() => {
    const s = state.current
    if (!s || !object) return
    if (s.current) {
      s.scene.remove(s.current)
      if (!keep) disposeObject(s.current)
    }
    s.scene.add(object)
    s.current = object
    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    s.shadow.scale.setScalar(Math.max(size.x, size.z) * 1.3)
    const center = frameObject(s.camera, object, { distance: 1.15 })
    s.controls.target.copy(center)
    s.controls.minDistance = s.camera.position.distanceTo(center) * 0.4
    s.controls.maxDistance = s.camera.position.distanceTo(center) * 2.5
  }, [object])

  useEffect(() => {
    if (state.current?.current && color) setMaterialColor(state.current.current, color)
  }, [color, object])

  return <div ref={host} className={`viewer ${className}`} role="img" aria-label={label} />
}
