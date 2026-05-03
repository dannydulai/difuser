import type { DiffuserConfig } from '../types'
import { createSeededRandom, seededRandomInRange } from './useSeededRandom'

export interface BlockSpec {
  row: number
  col: number
  spanCols: number    // how many grid columns this block spans (default 1)
  spanRows: number    // how many grid rows this block spans (default 1)
  angle: number       // degrees (0–45)
  rotation: number    // radians (0–2π)
  pairIndex: number
  pairSide: 'A' | 'B'
}

function snapAngle(angle: number, min: number, max: number): number {
  const snapped = Math.round(angle / 5) * 5
  return Math.max(min, Math.min(max, snapped))
}

// ─── Angle grid generators ───

function randomAngles(
  rows: number, cols: number,
  min: number, max: number,
  rng: () => number
): number[][] {
  const grid: number[][] = []
  for (let r = 0; r < rows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (idx % 2 === 0) {
        row.push(seededRandomInRange(rng, min, max, 5))
      } else {
        row.push(grid.length > 0 && row.length === 0
          ? grid[r - 1][cols - 1]
          : row[row.length - 1])
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
    for (let c = 0; c < halfCols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
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
  for (let r = 0; r < halfRows; r++) {
    const row: number[] = []
    for (let c = 0; c < cols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
    grid.push(row)
  }
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
  for (let r = 0; r < halfRows; r++) {
    const row: number[] = []
    for (let c = 0; c < halfCols; c++) {
      row.push(seededRandomInRange(rng, min, max, 5))
    }
    grid.push(row)
  }
  for (let r = 0; r < halfRows; r++) {
    for (let c = halfCols; c < cols; c++) {
      grid[r][c] = grid[r][cols - 1 - c]
    }
  }
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
  const flat: number[] = []
  for (let i = 0; i < half; i++) {
    flat.push(seededRandomInRange(rng, min, max, 5))
  }
  for (let i = half; i < total; i++) {
    flat.push(flat[total - 1 - i])
  }
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
  const gridSize = 4
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
    return cosLerp(cosLerp(v00, v10, fx), cosLerp(v01, v11, fx), fy)
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

// ─── Mixed block sizes ───

interface PackedBlock {
  row: number
  col: number
  spanCols: number
  spanRows: number
}

function generateMixedPacking(
  rows: number, cols: number,
  variety: number, // 0–100
  rng: () => number
): PackedBlock[] {
  // Probability of trying a larger block
  const prob = variety / 100

  // Track which cells are occupied
  const occupied: boolean[][] = []
  for (let r = 0; r < rows; r++) {
    occupied.push(new Array(cols).fill(false))
  }

  const blocks: PackedBlock[] = []

  function canPlace(r: number, c: number, sr: number, sc: number): boolean {
    if (r + sr > rows || c + sc > cols) return false
    for (let dr = 0; dr < sr; dr++) {
      for (let dc = 0; dc < sc; dc++) {
        if (occupied[r + dr][c + dc]) return false
      }
    }
    return true
  }

  function place(r: number, c: number, sr: number, sc: number) {
    for (let dr = 0; dr < sr; dr++) {
      for (let dc = 0; dc < sc; dc++) {
        occupied[r + dr][c + dc] = true
      }
    }
    blocks.push({ row: r, col: c, spanRows: sr, spanCols: sc })
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied[r][c]) continue

      if (rng() < prob) {
        // Try to place a larger block. Pick a random size.
        const roll = rng()
        if (roll < 0.15 && canPlace(r, c, 2, 2)) {
          place(r, c, 2, 2)
          continue
        } else if (roll < 0.5 && canPlace(r, c, 1, 2)) {
          place(r, c, 1, 2)
          continue
        } else if (roll < 0.85 && canPlace(r, c, 2, 1)) {
          place(r, c, 2, 1)
          continue
        }
      }

      // Default: 1x1
      place(r, c, 1, 1)
    }
  }

  return blocks
}

// ─── Main entry point ───

export function generateBlockLayout(config: DiffuserConfig): BlockSpec[] {
  const { panelCols: cols, panelRows: rows, minAngle, maxAngle, layoutMode, qrdPrime, randomSeed } = config

  // Mixed mode has its own path — packing + per-block angles
  if (layoutMode === 'Mixed') {
    return generateMixedLayout(config)
  }

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
    default:
      angleGrid = randomAngles(rows, cols, minAngle, maxAngle, rng)
  }

  // Generate rotation per block
  const rotRng = createSeededRandom(randomSeed + 3571)

  const blocks: BlockSpec[] = []
  let pairIdx = 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      const angle = angleGrid[r][c]
      const rotation = rotRng() * Math.PI * 2

      if (layoutMode === 'Random') {
        if (idx % 2 === 0) {
          blocks.push({ row: r, col: c, spanCols: 1, spanRows: 1, angle, rotation, pairIndex: pairIdx, pairSide: 'A' })
        } else {
          const prev = blocks[blocks.length - 1]
          blocks.push({
            row: r, col: c, spanCols: 1, spanRows: 1,
            angle: prev.angle,
            rotation: (prev.rotation + Math.PI) % (Math.PI * 2),
            pairIndex: pairIdx,
            pairSide: 'B',
          })
          pairIdx++
        }
      } else {
        blocks.push({ row: r, col: c, spanCols: 1, spanRows: 1, angle, rotation, pairIndex: idx, pairSide: 'A' })
      }
    }
  }

  return applyDensity(blocks, config)
}

// ─── Fade filter ───
// Directional fade: 100% dense at one edge, 0% at the opposite

function applyDensity(blocks: BlockSpec[], config: DiffuserConfig): BlockSpec[] {
  if (config.blockFade === 'None') return blocks

  const { panelCols: cols, panelRows: rows, randomSeed } = config

  // Generate smooth noise for dithered transition
  const noiseRng = createSeededRandom(randomSeed + 5881)
  const gridSize = 3
  const noiseW = Math.ceil(cols / gridSize) + 2
  const noiseH = Math.ceil(rows / gridSize) + 2
  const noise: number[] = []
  for (let i = 0; i < noiseW * noiseH; i++) noise.push(noiseRng())

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
    return cosLerp(cosLerp(v00, v10, fx), cosLerp(v01, v11, fx), fy)
  }

  const fineRng = createSeededRandom(randomSeed + 7727)

  return blocks.filter((block) => {
    // t: 0 at the solid edge, 1 at the empty edge
    let t: number
    switch (config.blockFade) {
      case 'Left to Right':
        t = cols > 1 ? block.col / (cols - 1) : 0
        break
      case 'Right to Left':
        t = cols > 1 ? 1 - block.col / (cols - 1) : 0
        break
      case 'Top to Bottom':
        t = rows > 1 ? block.row / (rows - 1) : 0
        break
      case 'Bottom to Top':
        t = rows > 1 ? 1 - block.row / (rows - 1) : 0
        break
      default:
        return true
    }

    // keepProb: 1 at solid edge (t=0), 0 at empty edge (t=1)
    const keepProb = 1 - t

    // Noise dithers the boundary
    const noiseVal = sample(block.col / gridSize, block.row / gridSize) * 0.7
      + fineRng() * 0.3

    return noiseVal < keepProb
  })
}

function generateMixedLayout(config: DiffuserConfig): BlockSpec[] {
  const { panelCols: cols, panelRows: rows, minAngle, maxAngle, randomSeed, mixedVariety } = config
  const rng = createSeededRandom(randomSeed)

  // Generate the packing
  const packed = generateMixedPacking(rows, cols, mixedVariety, rng)

  // Assign angles and rotations
  const angleRng = createSeededRandom(randomSeed + 1013)
  const rotRng = createSeededRandom(randomSeed + 3571)

  const blocks: BlockSpec[] = []
  for (let i = 0; i < packed.length; i++) {
    const p = packed[i]
    const angle = seededRandomInRange(angleRng, minAngle, maxAngle, 5)
    const rotation = rotRng() * Math.PI * 2

    blocks.push({
      row: p.row,
      col: p.col,
      spanCols: p.spanCols,
      spanRows: p.spanRows,
      angle,
      rotation,
      pairIndex: i,
      pairSide: 'A',
    })
  }

  return blocks
}
