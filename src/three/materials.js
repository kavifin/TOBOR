import * as THREE from 'three'

/**
 * A plastic material that shows printed layer lines. For the printing scene it can also show
 * the part mid-print: everything above `uCut` is clipped by the caller's clipping plane, the top
 * band of height `uBand` is only drawn where the nozzle has already passed (angle around
 * `uCenter` up to `uAngle`), and the plastic glows hot right around `uNozzle`.
 */
export function printMaterial(color = '#2e46f2', { layers = 90, side = THREE.FrontSide, flat = false } = {}) {
  const uniforms = {
    uLayer: { value: layers },
    uCut: { value: 1e6 },
    uGlow: { value: 0 },
    uHot: { value: new THREE.Color('#ffb627') },
    uBand: { value: 0 }, // height of the layer(s) being laid down; 0 = whole part shown
    uAngle: { value: 10 }, // how far round the nozzle has gone on that band, 0..2π
    uCenter: { value: new THREE.Vector2() }, // part axis (world x, z)
    uNozzle: { value: new THREE.Vector3(1e6, 1e6, 1e6) }, // nozzle tip in world space
  }
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.02, side, flatShading: flat })
  mat.userData.uniforms = uniforms
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        uniform float uLayer; uniform float uCut; uniform float uGlow; uniform vec3 uHot;
        uniform float uBand; uniform float uAngle; uniform vec2 uCenter; uniform vec3 uNozzle;`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (uBand > 0.0 && vWPos.y > uCut - uBand) {
          float ang = atan(vWPos.z - uCenter.y, vWPos.x - uCenter.x);
          if (ang < 0.0) ang += 6.2831853;
          if (ang > uAngle) discard; // the nozzle hasn't reached here yet
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float ln = abs(fract(vWPos.y * uLayer) - 0.5) * 2.0;
        diffuseColor.rgb *= 0.9 + 0.1 * smoothstep(0.15, 0.85, ln);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float band = 1.0 - smoothstep(0.0, 0.035, uCut - vWPos.y);
        float tip = 1.0 - smoothstep(0.0, 0.1, distance(vWPos, uNozzle));
        totalEmissiveRadiance += uHot * uGlow * (band * 0.45 + tip * 2.4);`,
      )
  }
  mat.customProgramCacheKey = () => 'print-material-v2'
  return mat
}

export function setMaterialColor(object, hex) {
  object.traverse((o) => {
    if (o.isMesh && !o.userData.keepColor) o.material.color.set(hex)
  })
}
