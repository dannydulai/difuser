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

export type Direction = 'U' | 'D' | 'L' | 'R'

export interface AssemblyCell {
  group: number    // 1-based group index
  dir: Direction   // which way the thick side faces
  angle: number
}

export interface AssemblyMap {
  rows: number
  cols: number
  cells: AssemblyCell[][]  // [row][col]
}

export interface CutList {
  totalBlocks: number
  totalPairs: number
  blockWidth: number
  blockHeight: number
  minBlockDepth: number
  angleGroups: AngleGroup[]
  flatPairs: number
  assembly: AssemblyMap
}

function rotationToDirection(radians: number): Direction {
  // Quantize to nearest 90°
  // rotation=0 → thick side right, π/2 → thick side up, π → left, 3π/2 → down
  const deg = ((radians * 180 / Math.PI) % 360 + 360) % 360
  if (deg >= 315 || deg < 45) return 'R'
  if (deg >= 45 && deg < 135) return 'U'
  if (deg >= 135 && deg < 225) return 'L'
  return 'D'
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

  // Stock depth per angle
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

  // Build angle → group index map
  const angleToGroup = new Map<number, number>()
  angleGroups.forEach((g, i) => angleToGroup.set(g.angle, i + 1))

  // Build assembly map
  const rows = config.panelRows
  const cols = config.panelCols
  const cells: AssemblyCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: AssemblyCell[] = []
    for (let c = 0; c < cols; c++) {
      row.push({ group: 0, dir: 'U', angle: 0 })
    }
    cells.push(row)
  }

  for (const block of layout) {
    cells[block.row][block.col] = {
      group: angleToGroup.get(block.angle) ?? 1,
      dir: block.angle === 0 ? 'U' : rotationToDirection(block.rotation),
      angle: block.angle,
    }
  }

  const flatPairs = angleGroups.find(g => g.angle === 0)?.pairCount ?? 0

  return {
    totalBlocks,
    totalPairs,
    blockWidth: config.blockWidth,
    blockHeight: config.blockHeight,
    minBlockDepth: config.minBlockDepth,
    angleGroups,
    flatPairs,
    assembly: { rows, cols, cells },
  }
}
