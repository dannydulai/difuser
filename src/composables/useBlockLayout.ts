import type { DiffuserConfig } from '../types'
import { createSeededRandom, seededRandomInRange } from './useSeededRandom'

export interface BlockSpec {
  row: number
  col: number
  angle: number       // degrees (0–45)
  rotation: number    // radians (0–2π)
  pairIndex: number   // which pair this block belongs to
  pairSide: 'A' | 'B' // A = first block, B = mirrored block
}

/**
 * Generates block layout with pair-based randomization.
 * Every two consecutive blocks (in row-major order) form a pair:
 * same angle, opposite rotation (offset by π). This means each
 * pair can be cut from a single rectangular stock piece with one
 * angled cut through the middle.
 */
export function generateBlockLayout(config: DiffuserConfig): BlockSpec[] {
  const cols = config.panelCols
  const rows = config.panelRows
  const totalBlocks = rows * cols
  const rng = createSeededRandom(config.randomSeed)

  const blocks: BlockSpec[] = []

  for (let i = 0; i < totalBlocks; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols

    if (i % 2 === 0) {
      // First block of pair — generate new angle + rotation
      const angle = seededRandomInRange(rng, config.minAngle, config.maxAngle, 5)
      const rotation = rng() * Math.PI * 2
      blocks.push({
        row, col, angle, rotation,
        pairIndex: Math.floor(i / 2),
        pairSide: 'A',
      })
    } else {
      // Second block of pair — same angle, rotation + π
      const prev = blocks[i - 1]
      blocks.push({
        row, col,
        angle: prev.angle,
        rotation: (prev.rotation + Math.PI) % (Math.PI * 2),
        pairIndex: prev.pairIndex,
        pairSide: 'B',
      })
      // Consume the same RNG calls so sequence stays deterministic
      // (the pair reuses prev values, but we need to advance rng for color consistency)
    }
  }

  return blocks
}
