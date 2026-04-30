import type { DiffuserConfig } from '../types'
import { createSeededRandom, seededRandomInRange } from './useSeededRandom'

export interface BlockCut {
  row: number
  col: number
  angle: number        // degrees
  rotation: number     // degrees (0–360)
  maxDepth: number     // mm — tallest point of this block
}

export interface AngleGroup {
  angle: number
  blocks: BlockCut[]
}

export interface CutList {
  // Stock
  totalBlocks: number
  blockWidth: number
  blockHeight: number
  stockDepth: number   // mm — stock thickness needed (max depth across all blocks)
  minBlockDepth: number

  // Grouped by angle, sorted
  angleGroups: AngleGroup[]

  // Flat blocks (0° angle)
  flatCount: number
}

export function generateCutList(config: DiffuserConfig): CutList {
  const c = config
  const cols = c.panelCols
  const rows = c.panelRows
  const rng = createSeededRandom(c.randomSeed)

  const halfW = c.blockWidth / 2
  const halfH = c.blockHeight / 2

  const blocks: BlockCut[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const angle = seededRandomInRange(rng, c.minAngle, c.maxAngle, 5)
      const rotation = rng() * Math.PI * 2

      // Compute max depth for this block
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      const maxProj = Math.abs(halfW * cosR) + Math.abs(halfH * sinR)
      const slopeHeight = maxProj > 0 ? 2 * maxProj * Math.tan(angle * Math.PI / 180) : 0
      const maxDepth = c.minBlockDepth + slopeHeight

      blocks.push({
        row: row + 1,
        col: col + 1,
        angle,
        rotation: Math.round((rotation * 180 / Math.PI) % 360),
        maxDepth: Math.round(maxDepth * 10) / 10,
      })
    }
  }

  // Group by angle
  const groupMap = new Map<number, BlockCut[]>()
  for (const b of blocks) {
    if (!groupMap.has(b.angle)) groupMap.set(b.angle, [])
    groupMap.get(b.angle)!.push(b)
  }

  const angleGroups: AngleGroup[] = Array.from(groupMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([angle, gBlocks]) => ({
      angle,
      blocks: gBlocks.sort((a, b) => a.rotation - b.rotation),
    }))

  const stockDepth = Math.ceil(Math.max(...blocks.map(b => b.maxDepth)))
  const flatCount = blocks.filter(b => b.angle === 0).length

  return {
    totalBlocks: blocks.length,
    blockWidth: c.blockWidth,
    blockHeight: c.blockHeight,
    stockDepth,
    minBlockDepth: c.minBlockDepth,
    angleGroups,
    flatCount,
  }
}
