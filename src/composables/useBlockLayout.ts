import type { DiffuserConfig } from '../types'
import { createSeededRandom, seededRandomInRange } from './useSeededRandom'

export interface BlockSpec {
  row: number
  col: number
  angle: number       // degrees (0–45)
  rotation: number    // radians (0–2π)
  pairIndex: number
  pairSide: 'A' | 'B'
}

// Snap angle to nearest 5-degree increment within min/max range
function snapAngle(angle: number, min: number, max: number): number {
  const snapped = Math.round(angle / 5) * 5
  return Math.max(min, Math.min(max, snapped))
}

// ─── Angle grid generators ───
// Each returns a 2D array of angles (degrees). Rotation is assigned separately.

function randomAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      // Pair-based: even indices get new angle, odd reuse previous
      const idx = r * cols + c
      if (idx % 2 === 0) {
        row.push(seededRandomInRange(rng, min, max, 5))
      } else {
        row.push(grid.length > 0 && row.length === 0
          ? grid[r - 1][cols - 1]  // last of previous row
          : row[row.length - 1])    // previous in same row
      }
    }
    grid.push(row)
  }
  return grid
}

function qrdAngles(
  rows: number, cols: number,
  min: number, max: number,
  prime: number
): number[][] {
  // 1D QRD sequence tiled across columns, repeated per row
  // depth[n] = (n²) mod prime, mapped to angle range
  const maxDepth = prime - 1
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const n = c % prime
      const depth = (n * n) % prime
      const t = maxDepth > 0 ? depth / maxDepth : 0
      row.push(snapAngle(min + t * (max - min), min, max))
    }
    grid.push(row)
  }
  return grid
}

function mirrorHAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const halfCols = Math.ceil(cols / 2)
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    // Generate left half
    for (let c = 0; c < halfCols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
    // Mirror to right half
    for (let c = halfCols; c < cols; c++) {
      row.push(row[cols - 1 - c])
    }
    grid.push(row)
  }
  return grid
}

function mirrorVAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const halfRows = Math.ceil(rows / 2)
  const grid: number[][] = []
  // Generate top half
  for (let r = 0; r < halfRows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
    grid.push(row)
  }
  // Mirror to bottom half
  for (let r = halfRows; r < rows; r++) {
    grid.push([...grid[rows - 1 - r]])
  }
  return grid
}

function quadAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const halfRows = Math.ceil(rows / 2)
  const halfCols = Math.ceil(cols / 2)
  const grid: number[][] = []
  // Generate top-left quadrant
  for (let r = 0; r < halfRows; r++) {
    const row: number[] = []
    for (let c = 0; c < halfCols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
    grid.push(row)
  }
  // Mirror horizontally to fill top half
  for (let r = 0; r < halfRows; r++) {
    for (let c = halfCols; c < cols; c++) {
      grid[r][c] = grid[r][cols - 1 - c]
    }
  }
  // Mirror vertically to fill bottom half
  for (let r = halfRows; r < rows; r++) {
    grid.push([...grid[rows - 1 - r]])
  }
  return grid
}

function rotationalAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const total = rows * cols
  const half = Math.ceil(total / 2)
  // Generate first half
  const flat: number[] = []
  for (let i = 0; i < half; i++) {
    flat.push(seededRandomInRange(rng, min, max, 5))
  }
  // Fill second half with 180° rotational mapping
  for (let i = half; i < total; i++) {
    flat.push(flat[total - 1 - i])
  }
  // Convert to 2D
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    grid.push(flat.slice(r * cols, (r + 1) * cols))
  }
  return grid
}

function gaussianAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const mid = (min + max) / 2
  const sigma = (max - min) / 4
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      // Box-Muller transform
      const u1 = Math.max(1e-10, rng())
      const u2 = rng()
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const angle = mid + z * sigma
      row.push(snapAngle(angle, min, max))
    }
    grid.push(row)
  }
  return grid
}

function perlinAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  // Simple 2D value noise with cosine interpolation
  const gridSize = 4 // noise grid cells — gives smooth variation across ~4 blocks
  const noiseW = Math.ceil(cols / gridSize) + 2
  const noiseH = Math.ceil(rows / gridSize) + 2
  const noise: number[] = []
  for (let i = 0; i < noiseW * noiseH; i++) noise.push(rng())

  function cosLerp(a: number, b: number, t: number): number {
    const f = (1 - Math.cos(t * Math.PI)) * 0.5
    return a * (1 - f) + b * f
  }

  function sample(x: number, y: number): number {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const v00 = noise[iy * noiseW + ix] ?? 0.5
    const v10 = noise[iy * noiseW + ix + 1] ?? 0.5
    const v01 = noise[(iy + 1) * noiseW + ix] ?? 0.5
    const v11 = noise[(iy + 1) * noiseW + ix + 1] ?? 0.5
    const top = cosLerp(v00, v10, fx)
    const bot = cosLerp(v01, v11, fx)
    return cosLerp(top, bot, fy)
  }

  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const t = sample(c / gridSize, r / gridSize)
      row.push(snapAngle(min + t * (max - min), min, max))
    }
    grid.push(row)
  }
  return grid
}

function radialAngles(
  rows: number, cols: number,
  min: number, max: number
): number[][] {
  const centerR = (rows - 1) / 2
  const centerC = (cols - 1) / 2
  const maxDist = Math.sqrt(centerR * centerR + centerC * centerC) || 1
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const dr = r - centerR
      const dc = c - centerC
      const t = Math.sqrt(dr * dr + dc * dc) / maxDist
      row.push(snapAngle(min + t * (max - min), min, max))
    }
    grid.push(row)
  }
  return grid
}

function waveAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const phaseX = rng() * Math.PI * 2
  const phaseY = rng() * Math.PI * 2
  const freqX = (2 * Math.PI) / Math.max(cols - 1, 1)
  const freqY = (2 * Math.PI) / Math.max(rows - 1, 1)
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const v = (Math.sin(c * freqX + phaseX) * Math.sin(r * freqY + phaseY) + 1) / 2
      row.push(snapAngle(min + v * (max - min), min, max))
    }
    grid.push(row)
  }
  return grid
}

// ─── Main entry point ───

export function generateBlockLayout(config: DiffuserConfig): BlockSpec[] {
  const { panelCols: cols, panelRows: rows, minAngle, maxAngle, layoutMode, qrdPrime, randomSeed } = config
  const rng = createSeededRandom(randomSeed)

  // Generate angle grid based on layout mode
  let angleGrid: number[][]
  switch (layoutMode) {
    case 'QRD':
      angleGrid = qrdAngles(rows, cols, minAngle, maxAngle, qrdPrime)
      break
    case 'Mirror H':
      angleGrid = mirrorHAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Mirror V':
      angleGrid = mirrorVAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Quad':
      angleGrid = quadAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Rotational':
      angleGrid = rotationalAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Gaussian':
      angleGrid = gaussianAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Perlin':
      angleGrid = perlinAngles(rows, cols, minAngle, maxAngle, rng)
      break
    case 'Radial':
      angleGrid = radialAngles(rows, cols, minAngle, maxAngle)
      break
    case 'Wave':
      angleGrid = waveAngles(rows, cols, minAngle, maxAngle, rng)
      break
    default: // Random — pair-based
      angleGrid = randomAngles(rows, cols, minAngle, maxAngle, rng)
  }

  // Generate rotation per block (always random, seeded)
  const rotRng = createSeededRandom(randomSeed + 3571)

  // Build block specs
  const blocks: BlockSpec[] = []
  let pairIdx = 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const angle = angleGrid[r][c]
      const rotation = rotRng() * Math.PI * 2

      // For Random mode, pair consecutive blocks (same angle, opposite rotation)
      if (layoutMode === 'Random') {
        if (idx % 2 === 0) {
          blocks.push({ row: r, col: c, angle, rotation, pairIndex: pairIdx, pairSide: 'A' })
        } else {
          const prev = blocks[blocks.length - 1]
          blocks.push({
            row: r, col: c,
            angle: prev.angle,
            rotation: (prev.rotation + Math.PI) % (Math.PI * 2),
            pairIndex: pairIdx,
            pairSide: 'B',
          })
          pairIdx++
        }
      } else {
        // Non-random modes: each block is independent
        blocks.push({ row: r, col: c, angle, rotation, pairIndex: idx, pairSide: 'A' })
      }
    }
  }
  // Handle last unpaired block for Random mode
  if (layoutMode === 'Random' && blocks.length > 0 && blocks[blocks.length - 1].pairSide === 'A') {
    // It's already set up as 'A', just won't have a 'B' partner — that's fine
  }

  return blocks
}
