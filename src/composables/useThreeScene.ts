import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
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
    case 'Gloss': return 0.1
    case 'Satin': return 0.3
    case 'Matte': return 0.6
    case 'Natural': return 0.8
    default: return 0.5
  }
}

/**
 * Builds a MeshStandardMaterial from the unified surface config.
 */
function buildSurfaceMaterial(
  surfaceType: SurfaceType,
  woodType: WoodType,
  finish: Finish,
  color: string
): THREE.MeshStandardMaterial {
  switch (surfaceType) {
    case 'Wood': {
      const wc = WOOD_COLORS[woodType]
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(wc.base),
        roughness: finishToRoughness(finish),
        metalness: 0.05,
      })
    }
    case 'Metal':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.3,
        metalness: 0.85,
      })
    case 'Brushed Aluminum':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color('#c0c0c0'),
        roughness: 0.4,
        metalness: 0.95,
      })
    case 'Painted Wood':
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: finishToRoughness(finish),
        metalness: 0.02,
      })
    default:
      return new THREE.MeshStandardMaterial({ color: new THREE.Color(color) })
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
  let animationId: number
  let diffuserGroup: THREE.Group
  let resizeObserver: ResizeObserver

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
    const woodColors = WOOD_COLORS[c.blockMaterial]

    // Precompute gradient palette if needed
    const totalBlocks = rows * cols
    const gradSteps = Math.max(2, c.gradientSteps)
    const gradDither = c.gradientDither / 100 // normalize 0–1

    // Build blocks
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
            // Linear position across grid
            let t = (row * cols + col) / (totalBlocks - 1 || 1)

            // Apply dither: random offset to t
            if (gradDither > 0) {
              t += (rng() - 0.5) * gradDither
              t = Math.max(0, Math.min(1, t))
            }

            // Quantize to steps
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

        const mat = new THREE.MeshStandardMaterial({
          color: blockColor,
          roughness: blockRoughness,
          metalness: 0.05,
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

      const totalW = gridW + 2 * fo + 2 * fw
      const totalH = gridH + 2 * fo + 2 * fw

      const sides = [
        { w: totalW, h: fw, x: 0, y: -(totalH / 2 - fw / 2) },
        { w: totalW, h: fw, x: 0, y: totalH / 2 - fw / 2 },
        { w: fw, h: totalH - 2 * fw, x: -(totalW / 2 - fw / 2), y: 0 },
        { w: fw, h: totalH - 2 * fw, x: totalW / 2 - fw / 2, y: 0 },
      ]

      for (const s of sides) {
        const geo = new THREE.BoxGeometry(s.w, s.h, fd)
        const mesh = new THREE.Mesh(geo, frameMat)
        mesh.position.set(s.x, s.y, fd / 2)
        mesh.castShadow = true
        mesh.receiveShadow = true
        diffuserGroup.add(mesh)
      }
    }

    // Backplate
    const bpW = hasFrame ? gridW + 2 * fo : gridW
    const bpH = hasFrame ? gridH + 2 * fo : gridH
    const backMat = buildSurfaceMaterial(
      c.backplateSurfaceType, c.backplateWoodType, c.backplateFinish, c.backplateColor
    )
    const backGeo = new THREE.BoxGeometry(bpW, bpH, 0.02)
    const backMesh = new THREE.Mesh(backGeo, backMat)
    backMesh.position.set(0, 0, 0.01)
    backMesh.receiveShadow = true
    diffuserGroup.add(backMesh)
  }

  function init() {
    const container = containerRef.value!
    const rect = container.getBoundingClientRect()

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(rect.width, rect.height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    scene = new THREE.Scene()
    scene.background = new THREE.Color('#1a1a1e')
    scene.fog = new THREE.FogExp2('#1a1a1e', 0.08)

    camera = new THREE.PerspectiveCamera(40, rect.width / rect.height, 0.1, 100)
    camera.position.set(0, 0, 14)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 3
    controls.maxDistance = 30
    controls.target.set(0, 0, 0)

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight('#fff5e6', 1.8)
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
    keyLight.shadow.bias = -0.001
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight('#b8c4ff', 0.5)
    fillLight.position.set(-4, 3, 5)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight('#ffd4a3', 0.6)
    rimLight.position.set(0, -2, -8)
    scene.add(rimLight)

    const groundGeo = new THREE.PlaneGeometry(40, 40)
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.position.z = -0.5
    ground.receiveShadow = true
    scene.add(ground)

    diffuserGroup = new THREE.Group()
    scene.add(diffuserGroup)

    buildDiffuser()

    resizeObserver = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      camera.aspect = r.width / r.height
      camera.updateProjectionMatrix()
      renderer.setSize(r.width, r.height)
    })
    resizeObserver.observe(container)

    function animate() {
      animationId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
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
  })

  watch(config, () => {
    if (diffuserGroup) buildDiffuser()
  }, { deep: true })

  return { rebuild: () => { if (diffuserGroup) buildDiffuser() } }
}
