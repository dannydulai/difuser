import type { DiffuserConfig } from '../types'
import { generateBlockLayout, type BlockSpec } from './useBlockLayout'

export interface BlockPair {
  pairIndex: number
  angle: number
  rotationDeg: number   // rotation of side A in degrees
  stockDepth: number    // depth of rectangular stock piece (mm)
  blockA: { row: number; col: number }
  blockB: { row: number; col: number } | null  // null if odd block out
}

export interface AngleGroup {
  angle: number
  pairs: BlockPair[]
}

export interface CutList {
  totalBlocks: number
  totalPairs: number
  blockWidth: number
  blockHeight: number
  minBlockDepth: number
  maxStockDepth: number   // thickest stock piece needed
  angleGroups: AngleGroup[]
  flatCount: number       // pairs with 0° angle (no angled cut needed)
}

function computeStockDepth(
  angle: number,
  rotation: number,
  blockWidth: number,
  blockHeight: number,
  minBlockDepth: number
): number {
  const halfW = blockWidth / 2
  const halfH = blockHeight / 2
  const cosR = Math.cos(rotation)
  const sinR = Math.sin(rotation)
  const maxProj = Math.abs(halfW * cosR) + Math.abs(halfH * sinR)
  const slopeHeight = maxProj > 0 ? 2 * maxProj * Math.tan(angle * Math.PI / 180) : 0
  // Two mirrored wedges from one stock piece:
  // Each wedge has minDepth on thin side, minDepth + slope on thick side
  // Stock = minDepth + slopeHeight + minDepth
  return 2 * minBlockDepth + slopeHeight
}

export function generateCutList(config: DiffuserConfig): CutList {
  const layout = generateBlockLayout(config)
  const totalBlocks = layout.length

  // Group blocks by pair
  const pairMap = new Map<number, BlockSpec[]>()
  for (const block of layout) {
    if (!pairMap.has(block.pairIndex)) pairMap.set(block.pairIndex, [])
    pairMap.get(block.pairIndex)!.push(block)
  }

  const pairs: BlockPair[] = []
  for (const [pairIndex, blocks] of pairMap) {
    const a = blocks.find(b => b.pairSide === 'A')!
    const b = blocks.find(b => b.pairSide === 'B') ?? null

    const stockDepth = Math.round(
      computeStockDepth(a.angle, a.rotation, config.blockWidth, config.blockHeight, config.minBlockDepth) * 10
    ) / 10

    pairs.push({
      pairIndex,
      angle: a.angle,
      rotationDeg: Math.round((a.rotation * 180 / Math.PI) % 360),
      stockDepth,
      blockA: { row: a.row + 1, col: a.col + 1 },
      blockB: b ? { row: b.row + 1, col: b.col + 1 } : null,
    })
  }

  // Group by angle
  const groupMap = new Map<number, BlockPair[]>()
  for (const pair of pairs) {
    if (!groupMap.has(pair.angle)) groupMap.set(pair.angle, [])
    groupMap.get(pair.angle)!.push(pair)
  }

  const angleGroups: AngleGroup[] = Array.from(groupMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([angle, gPairs]) => ({
      angle,
      pairs: gPairs.sort((a, b) => a.rotationDeg - b.rotationDeg),
    }))

  const maxStockDepth = Math.ceil(Math.max(...pairs.map(p => p.stockDepth)))
  const flatCount = pairs.filter(p => p.angle === 0).length

  return {
    totalBlocks,
    totalPairs: pairs.length,
    blockWidth: config.blockWidth,
    blockHeight: config.blockHeight,
    minBlockDepth: config.minBlockDepth,
    maxStockDepth,
    angleGroups,
    flatCount,
  }
}
