import * as THREE from 'three'

// Simple seeded PRNG for texture generation
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

function canvasToTexture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function canvasToLinearTexture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }
  tex.colorSpace = THREE.LinearSRGBColorSpace
  return tex
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

  // Parse colors
  const baseRgb = hexToRgb(colors.base)
  const grainRgb = hexToRgb(colors.grain)

  // ── Color map ──
  const [colorCanvas, cCtx] = createCanvas(w, h)
  const colorData = cCtx.createImageData(w, h)
  const cd = colorData.data

  // ── Normal map ──
  const [normalCanvas, nCtx] = createCanvas(w, h)
  const normalData = nCtx.createImageData(w, h)
  const nd = normalData.data

  // ── Roughness map ──
  const [roughCanvas, rCtx] = createCanvas(w, h)
  const roughData = rCtx.createImageData(w, h)
  const rd = roughData.data

  // Generate grain lines (vertical with wobble)
  const grainLines: number[] = []
  for (let i = 0; i < 40; i++) {
    grainLines.push(rng() * w)
  }
  grainLines.sort((a, b) => a - b)

  // Precompute some noise
  const noise = new Float32Array(w * h)
  for (let i = 0; i < noise.length; i++) {
    noise[i] = rng()
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4

      // Wobble x based on y for organic feel
      const wobble = Math.sin(y * 0.02 + x * 0.005) * 3 + Math.sin(y * 0.05) * 1.5
      const wx = x + wobble

      // Distance to nearest grain line
      let minDist = w
      for (const gx of grainLines) {
        const d = Math.abs(wx - gx)
        const dWrap = Math.abs(wx - gx + w)
        const dWrap2 = Math.abs(wx - gx - w)
        minDist = Math.min(minDist, d, dWrap, dWrap2)
      }

      // Grain intensity (0 = on grain line, 1 = between)
      const grainT = Math.min(1, minDist / 8)
      const grainFactor = grainT * grainT

      // Fine noise for texture
      const n = noise[y * w + x]
      const fineNoise = (n - 0.5) * 0.08

      // Yearly ring pattern (subtle)
      const ringPhase = Math.sin(wx * 0.015 + y * 0.003) * 0.5 + 0.5
      const ringFactor = ringPhase * 0.1

      // Mix base and grain color
      const t = (1 - grainFactor) * 0.7 + ringFactor + fineNoise
      const tClamped = Math.max(0, Math.min(1, t))

      cd[idx] = Math.round(baseRgb.r + (grainRgb.r - baseRgb.r) * tClamped)
      cd[idx + 1] = Math.round(baseRgb.g + (grainRgb.g - baseRgb.g) * tClamped)
      cd[idx + 2] = Math.round(baseRgb.b + (grainRgb.b - baseRgb.b) * tClamped)
      cd[idx + 3] = 255

      // Normal map — grain creates subtle bumps
      const bumpStrength = (1 - grainFactor) * 0.3
      const nx2 = 128 + bumpStrength * (grainT > 0.5 ? 30 : -30)
      nd[idx] = Math.round(nx2)
      nd[idx + 1] = Math.round(128 + Math.sin(y * 0.03) * 8)
      nd[idx + 2] = 255
      nd[idx + 3] = 255

      // Roughness — grain lines are slightly smoother
      const roughness = 0.5 + grainFactor * 0.15 + (n - 0.5) * 0.05
      const rv = Math.round(Math.max(0, Math.min(1, roughness)) * 255)
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
  const rng = mulberry32(12345)

  const [normalCanvas, nCtx] = createCanvas(w, h)
  const normalData = nCtx.createImageData(w, h)
  const nd = normalData.data

  const [roughCanvas, rCtx] = createCanvas(w, h)
  const roughData = rCtx.createImageData(w, h)
  const rd = roughData.data

  // Generate horizontal brush strokes
  // Each row has a slight random offset in brightness/normal
  const rowNoise = new Float32Array(h)
  for (let y = 0; y < h; y++) {
    rowNoise[y] = rng()
  }

  for (let y = 0; y < h; y++) {
    // Each row is a brush stroke — subtle variation
    const rowVal = rowNoise[y]

    // Cluster strokes in bands of 1-3 pixels
    const bandNoise = rowNoise[Math.floor(y / 2) % h]

    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4

      // Fine horizontal scratches
      const scratchNoise = rng()
      const isScratch = scratchNoise > 0.92 // ~8% of pixels are deeper scratches

      // Normal map — scratches create vertical displacement
      const scratchBump = isScratch ? (rng() > 0.5 ? 40 : -40) : 0
      const bandBump = (bandNoise - 0.5) * 20

      nd[idx] = 128 // X normal is neutral (brushing is horizontal)
      nd[idx + 1] = Math.round(Math.max(0, Math.min(255, 128 + bandBump + scratchBump)))
      nd[idx + 2] = 255
      nd[idx + 3] = 255

      // Roughness — scratches are rougher, base is smooth
      const baseRough = 0.3 + (rowVal - 0.5) * 0.1
      const scratchRough = isScratch ? 0.6 : baseRough
      const rv = Math.round(Math.max(0, Math.min(1, scratchRough)) * 255)
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
