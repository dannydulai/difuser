import type { DiffuserConfig } from '../types'
import { generateBlockLayout } from './useBlockLayout'

export interface AngleGroup {
  angle: number
  pairCount: number
  blockCount: number
  stockDepth: number    // mm — depth of rectangular stock piece for this angle
  stopDistance: number   // mm — fence-to-blade distance (thick side of wedge)
  slopeHeight: number   // mm — height added by the angle
}

export interface CutList {
  totalBlocks: number
  totalPairs: number
  blockWidth: number
  blockHeight: number
  minBlockDepth: number
  angleGroups: AngleGroup[]
  flatPairs: number
}

export function generateCutList(config: DiffuserConfig): CutList {
  const layout = generateBlockLayout(config)
  const totalBlocks = layout.length
  const totalPairs = Math.ceil(totalBlocks / 2)

  // Count blocks per angle
  const angleCounts = new Map<number, number>()
  for (const block of layout) {
    angleCounts.set(block.angle, (angleCounts.get(block.angle) ?? 0) + 1)
  }

  // Stock depth per angle: cut straight across the block width
  // slopeHeight = blockWidth * tan(angle)
  // stockDepth = 2 * minBlockDepth + slopeHeight
  const blockDim = Math.max(config.blockWidth, config.blockHeight)

  const angleGroups: AngleGroup[] = Array.from(angleCounts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([angle, count]) => {
      const slopeHeight = blockDim * Math.tan(angle * Math.PI / 180)
      const stockDepth = Math.ceil(2 * config.minBlockDepth + slopeHeight)
      const stopDistance = Math.ceil(config.minBlockDepth + slopeHeight)
      const pairCount = Math.ceil(count / 2)
      return { angle, pairCount, blockCount: count, stockDepth, stopDistance, slopeHeight: Math.round(slopeHeight * 10) / 10 }
    })

  const flatPairs = angleGroups.find(g => g.angle === 0)?.pairCount ?? 0

  return {
    totalBlocks,
    totalPairs,
    blockWidth: config.blockWidth,
    blockHeight: config.blockHeight,
    minBlockDepth: config.minBlockDepth,
    angleGroups,
    flatPairs,
  }
}
