import * as THREE from 'three'

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  return [canvas, ctx]
}

function canvasToTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function canvasToLinearTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.LinearSRGBColorSpace
  return tex
}

// ─── Simplex-like value noise for organic patterns ───

function smoothNoise(rng: () => number, size: number): Float32Array {
  // Low-res noise grid, bicubic-ish interpolation
  const grid = 32
  const raw = new Float32Array(grid * grid)
  for (let i = 0; i < raw.length; i++) raw[i] = rng()

  const out = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = (x / size) * grid
      const gy = (y / size) * grid
      const ix = Math.floor(gx) % grid
      const iy = Math.floor(gy) % grid
      const fx = gx - Math.floor(gx)
      const fy = gy - Math.floor(gy)
      // Smoothstep
      const sx = fx * fx * (3 - 2 * fx)
      const sy = fy * fy * (3 - 2 * fy)
      const ix1 = (ix + 1) % grid
      const iy1 = (iy + 1) % grid
      const v00 = raw[iy * grid + ix]
      const v10 = raw[iy * grid + ix1]
      const v01 = raw[iy1 * grid + ix]
      const v11 = raw[iy1 * grid + ix1]
      out[y * size + x] = v00 * (1 - sx) * (1 - sy) + v10 * sx * (1 - sy) +
                           v01 * (1 - sx) * sy + v11 * sx * sy
    }
  }
  return out
}

// ─── Wood grain texture ───

interface WoodColors {
  base: string
  grain: string
}

export function generateWoodTextures(
  colors: WoodColors,
  size = 512
): { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const w = size
  const h = size
  const rng = mulberry32(hashColor(colors.base))

  const baseRgb = hexToRgb(colors.base)
  const grainRgb = hexToRgb(colors.grain)
  // A lighter highlight between base and grain
  const lightRgb = {
    r: Math.min(255, baseRgb.r + 25),
    g: Math.min(255, baseRgb.g + 18),
    b: Math.min(255, baseRgb.b + 8),
  }

  const [colorCanvas, cCtx] = createCanvas(w, h)
  const colorData = cCtx.createImageData(w, h)
  const cd = colorData.data

  const [normalCanvas, nCtx] = createCanvas(w, h)
  const normalData = nCtx.createImageData(w, h)
  const nd = normalData.data

  const [roughCanvas, rCtx] = createCanvas(w, h)
  const roughData = rCtx.createImageData(w, h)
  const rd = roughData.data

  // Multiple octaves of smooth noise for organic variation
  const noise1 = smoothNoise(rng, w)
  const noise2 = smoothNoise(rng, w)
  const noise3 = smoothNoise(rng, w)

  // Fine per-pixel noise
  const fineNoise = new Float32Array(w * h)
  for (let i = 0; i < fineNoise.length; i++) fineNoise[i] = rng()

  // Generate grain line positions with varying spacing
  const grainLines: { x: number; width: number; intensity: number }[] = []
  let gx = rng() * 6
  while (gx < w) {
    const spacing = 4 + rng() * 12
    const lineWidth = 1 + rng() * 4
    const intensity = 0.3 + rng() * 0.7
    grainLines.push({ x: gx, width: lineWidth, intensity })
    gx += spacing
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      const ni = y * w + x

      // Large-scale wobble from smooth noise
      const wobbleX = (noise1[ni] - 0.5) * 16
      const wobbleY = (noise2[ni] - 0.5) * 8
      const wx = x + wobbleX + Math.sin(y * 0.012) * 5
      const wy = y + wobbleY

      // Accumulate grain influence
      let grainVal = 0
      for (const line of grainLines) {
        const dx = wx - line.x
        // Wrap distance
        const d = Math.min(
          Math.abs(dx),
          Math.abs(dx + w),
          Math.abs(dx - w)
        )
        if (d < line.width * 3) {
          const falloff = Math.exp(-(d * d) / (line.width * line.width * 0.8))
          grainVal += falloff * line.intensity
        }
      }
      grainVal = Math.min(1, grainVal)

      // Growth ring pattern — concentric ellipses with wobble
      const ringX = (wx - w / 2) * 0.008
      const ringY = (wy - h / 2) * 0.015
      const ringDist = Math.sqrt(ringX * ringX + ringY * ringY * 0.6)
      const ring = (Math.sin(ringDist * 20 + noise3[ni] * 4) * 0.5 + 0.5)
      const ringVal = ring * 0.25

      // Fine texture noise
      const fine = (fineNoise[ni] - 0.5) * 0.06

      // Compose color: base ← grain lines darken, rings add subtle bands
      const darkT = Math.min(1, grainVal * 0.8 + ringVal + fine)
      const lightT = Math.max(0, (1 - grainVal) * ringVal * 0.5)

      // Interpolate: base → grain (dark), with some light highlights
      let r = baseRgb.r + (grainRgb.r - baseRgb.r) * darkT + (lightRgb.r - baseRgb.r) * lightT
      let g = baseRgb.g + (grainRgb.g - baseRgb.g) * darkT + (lightRgb.g - baseRgb.g) * lightT
      let b = baseRgb.b + (grainRgb.b - baseRgb.b) * darkT + (lightRgb.b - baseRgb.b) * lightT

      cd[idx] = Math.round(Math.max(0, Math.min(255, r)))
      cd[idx + 1] = Math.round(Math.max(0, Math.min(255, g)))
      cd[idx + 2] = Math.round(Math.max(0, Math.min(255, b)))
      cd[idx + 3] = 255

      // Normal map — grain lines create tangent-space bumps perpendicular to grain direction
      // Grain runs vertically, so bumps are in X
      const bumpX = grainVal * 60 * (fineNoise[ni] > 0.5 ? 1 : -1)
      const bumpY = (noise3[ni] - 0.5) * 10
      nd[idx] = Math.round(Math.max(0, Math.min(255, 128 + bumpX)))
      nd[idx + 1] = Math.round(Math.max(0, Math.min(255, 128 + bumpY)))
      nd[idx + 2] = 255
      nd[idx + 3] = 255

      // Roughness — grain lines are smoother (polished channels), base is rougher
      const roughness = 0.55 - grainVal * 0.15 + fine * 0.3
      const rv = Math.round(Math.max(0, Math.min(255, roughness * 255)))
      rd[idx] = rv
      rd[idx + 1] = rv
      rd[idx + 2] = rv
      rd[idx + 3] = 255
    }
  }

  cCtx.putImageData(colorData, 0, 0)
  nCtx.putImageData(normalData, 0, 0)
  rCtx.putImageData(roughData, 0, 0)

  return {
    map: canvasToTexture(colorCanvas),
    normalMap: canvasToLinearTexture(normalCanvas),
    roughnessMap: canvasToLinearTexture(roughCanvas),
  }
}

// ─── Brushed aluminum texture ───

export function generateBrushedAluminumTextures(
  size = 512
): { normalMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const w = size
  const h = size
  const rng = mulberry32(54321)

  const [normalCanvas, nCtx] = createCanvas(w, h)
  const normalData = nCtx.createImageData(w, h)
  const nd = normalData.data

  const [roughCanvas, rCtx] = createCanvas(w, h)
  const roughData = rCtx.createImageData(w, h)
  const rd = roughData.data

  // Generate continuous horizontal scratch lines.
  // Each scratch spans the full width with consistent depth.
  // Scratches are defined per-row with varying depth and clustering.

  const scratchDepth = new Float32Array(h)
  // Create scratch lines — clusters of fine parallel lines
  for (let y = 0; y < h; y++) {
    // Base fine brush texture — every row has slight variation
    scratchDepth[y] = (rng() - 0.5) * 0.3

    // Deeper scratches at random positions (10% of rows)
    if (rng() > 0.90) {
      const depth = 0.5 + rng() * 0.5
      const sign = rng() > 0.5 ? 1 : -1
      scratchDepth[y] = depth * sign
      // Make 1-3 pixel wide scratches
      const width = 1 + Math.floor(rng() * 2)
      for (let dy = 1; dy <= width && y + dy < h; dy++) {
        scratchDepth[y + dy] = depth * sign * (1 - dy / (width + 1))
      }
    }
  }

  // Medium scratches (30% of rows)
  for (let y = 0; y < h; y++) {
    if (Math.abs(scratchDepth[y]) < 0.3 && rng() > 0.70) {
      scratchDepth[y] += (rng() - 0.5) * 0.6
    }
  }

  for (let y = 0; y < h; y++) {
    // Per-row values are constant across x — this is key for the linear look
    const depth = scratchDepth[y]
    const normalY = Math.round(Math.max(0, Math.min(255, 128 + depth * 80)))
    const rough = 0.3 + Math.abs(depth) * 0.25 + (rng() * 0.02)
    const rv = Math.round(Math.max(0, Math.min(255, rough * 255)))

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4

      // X normal is constant (no variation along scratch direction)
      nd[idx] = 128
      nd[idx + 1] = normalY
      nd[idx + 2] = 255
      nd[idx + 3] = 255

      rd[idx] = rv
      rd[idx + 1] = rv
      rd[idx + 2] = rv
      rd[idx + 3] = 255
    }
  }

  nCtx.putImageData(normalData, 0, 0)
  rCtx.putImageData(roughData, 0, 0)

  return {
    normalMap: canvasToLinearTexture(normalCanvas),
    roughnessMap: canvasToLinearTexture(roughCanvas),
  }
}

// ─── Helpers ───

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = parseInt(hex.replace('#', ''), 16)
  return { r: (c >> 16) & 255, g: (c >> 8) & 255, b: c & 255 }
}

function hashColor(hex: string): number {
  let h = 0
  for (let i = 0; i < hex.length; i++) {
    h = ((h << 5) - h + hex.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
