import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'

import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { DiffuserConfig, SurfaceType, WoodType, Finish } from '../types'
import { WOOD_COLORS } from '../types'
import { createSeededRandom, seededRandomInRange } from './useSeededRandom'

const DEG2RAD = Math.PI / 180

function createWedgeGeometry(
  w: number,
  h: number,
  minDepth: number,
  cutAngleDeg: number,
  cutRotation: number
): THREE.BufferGeometry {
  const cutAngle = Math.min(Math.abs(cutAngleDeg), 45) * DEG2RAD
  const halfW = w / 2
  const halfH = h / 2

  const corners = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ]

  const cosR = Math.cos(cutRotation)
  const sinR = Math.sin(cutRotation)
  const maxProj = Math.abs(halfW * cosR) + Math.abs(halfH * sinR)
  const slopeHeight = maxProj > 0 ? 2 * maxProj * Math.tan(cutAngle) : 0

  const frontZ = corners.map(([cx, cy]) => {
    const proj = cx * cosR + cy * sinR
    const t = maxProj > 0 ? (proj / maxProj + 1) * 0.5 : 0.5
    return minDepth + t * slopeHeight
  })

  const positions: number[] = []
  const indices: number[] = []
  const normals: number[] = []

  function addFace(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) {
    const base = positions.length / 3
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]
    const e2 = [p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]]
    const nx = e1[1] * e2[2] - e1[2] * e2[1]
    const ny = e1[2] * e2[0] - e1[0] * e2[2]
    const nz = e1[0] * e2[1] - e1[1] * e2[0]
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    const fnx = nx / len, fny = ny / len, fnz = nz / len

    for (const p of [p0, p1, p2, p3]) {
      positions.push(p[0], p[1], p[2])
      normals.push(fnx, fny, fnz)
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  const bc: [number, number, number][] = corners.map(([cx, cy]) => [cx, cy, 0])
  const fc: [number, number, number][] = corners.map(([cx, cy], i) => [cx, cy, frontZ[i]])

  addFace(bc[3], bc[2], bc[1], bc[0])
  addFace(fc[0], fc[1], fc[2], fc[3])
  addFace(bc[0], bc[1], fc[1], fc[0])
  addFace(bc[1], bc[2], fc[2], fc[1])
  addFace(bc[2], bc[3], fc[3], fc[2])
  addFace(bc[3], bc[0], fc[0], fc[3])

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  return geo
}

function finishToRoughness(finish: Finish): number {
  switch (finish) {
    case 'Gloss': return 0.08
    case 'Satin': return 0.25
    case 'Matte': return 0.55
    case 'Natural': return 0.75
    default: return 0.5
  }
}

function finishToClearcoat(finish: Finish): number {
  switch (finish) {
    case 'Gloss': return 0.8
    case 'Satin': return 0.4
    case 'Matte': return 0.0
    case 'Natural': return 0.05
    default: return 0.0
  }
}

function buildSurfaceMaterial(
  surfaceType: SurfaceType,
  woodType: WoodType,
  finish: Finish,
  color: string
): THREE.MeshPhysicalMaterial {
  switch (surfaceType) {
    case 'Wood': {
      const wc = WOOD_COLORS[woodType]
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(wc.base),
        roughness: finishToRoughness(finish),
        metalness: 0.0,
        clearcoat: finishToClearcoat(finish),
        clearcoatRoughness: 0.3,
        sheen: 0.3,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color(wc.grain),
      })
    }
    case 'Metal':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: 0.25,
        metalness: 0.9,
        clearcoat: 0.1,
        clearcoatRoughness: 0.2,
      })
    case 'Brushed Aluminum':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#c0c0c0'),
        roughness: 0.35,
        metalness: 0.95,
        anisotropy: 0.8,
      })
    case 'Painted Wood':
      return new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        roughness: finishToRoughness(finish),
        metalness: 0.0,
        clearcoat: finishToClearcoat(finish),
        clearcoatRoughness: 0.15,
      })
    default:
      return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color) })
  }
}

export function useThreeScene(
  containerRef: Ref<HTMLElement | null>,
  config: Ref<DiffuserConfig>
) {
  let renderer: THREE.WebGLRenderer
  let scene: THREE.Scene
  let camera: THREE.PerspectiveCamera
  let controls: OrbitControls
  let composer: EffectComposer
  let gtaoPass: GTAOPass
  let animationId: number
  let diffuserGroup: THREE.Group
  let resizeObserver: ResizeObserver
  let envMap: THREE.Texture

  function buildDiffuser() {
    while (diffuserGroup.children.length) {
      const child = diffuserGroup.children[0] as THREE.Mesh
      child.geometry?.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
      diffuserGroup.remove(child)
    }

    const c = config.value
    const scale = 0.01

    const cols = c.panelCols
    const rows = c.panelRows
    const bw = c.blockWidth * scale
    const bh = c.blockHeight * scale
    const minBd = c.minBlockDepth * scale
    const gap = c.gap * scale
    const fw = c.frameWidth * scale
    const fd = c.frameDepth * scale
    const fo = c.frameOffset * scale
    const hasFrame = c.frameDepth > 0

    const gridW = cols * bw + (cols - 1) * gap
    const gridH = rows * bh + (rows - 1) * gap

    const startX = -gridW / 2
    const startY = -gridH / 2

    const rng = createSeededRandom(c.randomSeed)
    const blockRoughness = finishToRoughness(c.blockFinish)
    const blockClearcoat = finishToClearcoat(c.blockFinish)
    const woodColors = WOOD_COLORS[c.blockMaterial]

    const totalBlocks = rows * cols
    const gradSteps = Math.max(2, c.gradientSteps)
    const gradDither = c.gradientDither / 100

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cutAngle = seededRandomInRange(rng, c.minAngle, c.maxAngle, 5)
        const cutRotation = rng() * Math.PI * 2

        let blockColor: THREE.Color

        switch (c.colorMode) {
          case 'Solid color':
            blockColor = new THREE.Color(c.blockColor)
            break
          case 'Gradient': {
            let t = (row * cols + col) / (totalBlocks - 1 || 1)
            if (gradDither > 0) {
              t += (rng() - 0.5) * gradDither
              t = Math.max(0, Math.min(1, t))
            }
            const stepIndex = Math.round(t * (gradSteps - 1))
            const quantized = stepIndex / (gradSteps - 1)
            blockColor = new THREE.Color(c.blockColor).lerp(
              new THREE.Color(c.blockColorSecondary),
              quantized
            )
            break
          }
          case 'Random': {
            const hue = rng()
            blockColor = new THREE.Color().setHSL(hue, 0.5, 0.5)
            break
          }
          default: {
            const variation = rng() * 0.15 - 0.075
            blockColor = new THREE.Color(woodColors.base)
            blockColor.r = Math.max(0, Math.min(1, blockColor.r + variation))
            blockColor.g = Math.max(0, Math.min(1, blockColor.g + variation))
            blockColor.b = Math.max(0, Math.min(1, blockColor.b + variation))
          }
        }

        const mat = new THREE.MeshPhysicalMaterial({
          color: blockColor,
          roughness: blockRoughness,
          metalness: 0.0,
          clearcoat: blockClearcoat,
          clearcoatRoughness: 0.3,
          sheen: c.colorMode === 'Natural wood' ? 0.3 : 0.0,
          sheenRoughness: 0.6,
          sheenColor: c.colorMode === 'Natural wood'
            ? new THREE.Color(woodColors.grain)
            : undefined,
          envMapIntensity: 0.3,
        })

        const geo = createWedgeGeometry(bw, bh, minBd, cutAngle, cutRotation)
        const mesh = new THREE.Mesh(geo, mat)

        const x = startX + col * (bw + gap) + bw / 2
        const y = startY + row * (bh + gap) + bh / 2
        mesh.position.set(x, y, 0)

        mesh.castShadow = true
        mesh.receiveShadow = true
        diffuserGroup.add(mesh)
      }
    }

    // Frame
    if (hasFrame) {
      const frameMat = buildSurfaceMaterial(
        c.frameSurfaceType, c.frameWoodType, c.frameFinish, c.frameColor
      )
      frameMat.envMapIntensity = 0.08

      const totalW = gridW + 2 * fo + 2 * fw
      const totalH = gridH + 2 * fo + 2 * fw

      // Single extruded shape — no corner seams
      const outerW = totalW / 2
      const outerH = totalH / 2
      const innerW = outerW - fw
      const innerH = outerH - fw

      const frameShape = new THREE.Shape()
      frameShape.moveTo(-outerW, -outerH)
      frameShape.lineTo(outerW, -outerH)
      frameShape.lineTo(outerW, outerH)
      frameShape.lineTo(-outerW, outerH)
      frameShape.closePath()

      const hole = new THREE.Path()
      hole.moveTo(-innerW, -innerH)
      hole.lineTo(innerW, -innerH)
      hole.lineTo(innerW, innerH)
      hole.lineTo(-innerW, innerH)
      hole.closePath()
      frameShape.holes.push(hole)

      const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
        depth: fd,
        bevelEnabled: false,
      })
      const frameMesh = new THREE.Mesh(frameGeo, frameMat)
      frameMesh.castShadow = true
      frameMesh.receiveShadow = true
      diffuserGroup.add(frameMesh)
    }

    // Backplate
    const bpW = hasFrame ? gridW + 2 * fo : gridW
    const bpH = hasFrame ? gridH + 2 * fo : gridH
    const backMat = buildSurfaceMaterial(
      c.backplateSurfaceType, c.backplateWoodType, c.backplateFinish, c.backplateColor
    )
    backMat.envMapIntensity = 0.05
    const backGeo = new THREE.BoxGeometry(bpW, bpH, 0.02)
    const backMesh = new THREE.Mesh(backGeo, backMat)
    backMesh.position.set(0, 0, 0.01)
    backMesh.receiveShadow = true
    diffuserGroup.add(backMesh)
  }

  function init() {
    const container = containerRef.value!
    const rect = container.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.8
    container.appendChild(renderer.domElement)

    // Scene
    scene = new THREE.Scene()
    // Environment map — procedural studio HDRI for reflections + blurred background
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    pmremGenerator.compileEquirectangularShader()
    const roomEnv = new RoomEnvironment()
    envMap = pmremGenerator.fromScene(roomEnv, 0.04).texture
    scene.environment = envMap
    scene.background = envMap
    scene.backgroundBlurriness = 0.8
    scene.backgroundIntensity = 0.15
    pmremGenerator.dispose()

    // Camera
    camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100)
    camera.position.set(0, 0, 14)

    // Controls
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 3
    controls.maxDistance = 30
    controls.target.set(0, 0, 0)

    // Lighting — key + fill + rim, environment map handles ambient
    const keyLight = new THREE.DirectionalLight('#fff5e6', 1.2)
    keyLight.position.set(5, 8, 10)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.width = 2048
    keyLight.shadow.mapSize.height = 2048
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 50
    keyLight.shadow.camera.left = -10
    keyLight.shadow.camera.right = 10
    keyLight.shadow.camera.top = 10
    keyLight.shadow.camera.bottom = -10
    keyLight.shadow.bias = -0.0005
    keyLight.shadow.normalBias = 0.02
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#b8c4ff', 0.4)
    fillLight.position.set(-6, 4, 8)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight('#ffd4a3', 0.3)
    rimLight.position.set(0, -3, -8)
    scene.add(rimLight)


    // Diffuser group
    diffuserGroup = new THREE.Group()
    scene.add(diffuserGroup)

    // Post-processing pipeline
    composer = new EffectComposer(renderer)

    const renderPass = new RenderPass(scene, camera)
    composer.addPass(renderPass)

    // GTAO (Ground Truth Ambient Occlusion) — better than SSAO
    gtaoPass = new GTAOPass(scene, camera, w, h)
    gtaoPass.output = GTAOPass.OUTPUT.Default
    // @ts-ignore — three.js typing gaps
    gtaoPass.updateGtaoMaterial({
      radius: 0.3,
      distanceExponent: 2.0,
      thickness: 2.0,
      scale: 1.0,
      samples: 16,
    })
    // @ts-ignore
    gtaoPass.updatePdMaterial({
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      rings: 4,
      samples: 16,
    })
    composer.addPass(gtaoPass)

    // SMAA anti-aliasing (since we disabled renderer AA for composer)
    const smaaPass = new SMAAPass()
    composer.addPass(smaaPass)

    // Output pass for tone mapping
    const outputPass = new OutputPass()
    composer.addPass(outputPass)

    buildDiffuser()

    // Resize handling
    resizeObserver = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      const rw = r.width
      const rh = r.height
      camera.aspect = rw / rh
      camera.updateProjectionMatrix()
      renderer.setSize(rw, rh)
      composer.setSize(rw, rh)
    })
    resizeObserver.observe(container)

    // Render loop
    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      composer.render()
    }
    animate()
  }

  onMounted(() => {
    if (containerRef.value) init()
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationId)
    resizeObserver?.disconnect()
    controls?.dispose()
    renderer?.dispose()
    composer?.dispose()
  })

  watch(config, () => {
    if (diffuserGroup) buildDiffuser()
  }, { deep: true })

  return { rebuild: () => { if (diffuserGroup) buildDiffuser() } }
}
