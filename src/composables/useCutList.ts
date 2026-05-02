import type { DiffuserConfig } from '../types'
import { generateBlockLayout } from './useBlockLayout'

export interface AngleGroup {
  angle: number
  pairCount: number
  blockCount: number
  stockDepth: number
  stopDistance: number
  slopeHeight: number
  // For mixed mode — footprint label
  sizeLabel?: string
}

export type Direction = 'U' | 'D' | 'L' | 'R'

export interface AssemblyCell {
  group: number
  dir: Direction
  angle: number
  spanCols: number
  spanRows: number
  isOrigin: boolean  // true for the top-left cell of a multi-span block
}

export interface AssemblyMap {
  rows: number
  cols: number
  cells: AssemblyCell[][]
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
  isMixed: boolean
}

function rotationToDirection(radians: number): Direction {
  const deg = ((radians * 180 / Math.PI) % 360 + 360) % 360
  if (deg >= 315 || deg < 45) return 'R'
  if (deg >= 45 && deg < 135) return 'U'
  if (deg >= 135 && deg < 225) return 'L'
  return 'D'
}

export function generateCutList(config: DiffuserConfig): CutList {
  const layout = generateBlockLayout(config)
  const totalBlocks = layout.length
  const isMixed = config.layoutMode === 'Mixed'

  // For mixed mode, group by angle + size. For standard, group by angle only.
  const groupKey = (angle: number, spanC: number, spanR: number) =>
    isMixed ? `${angle}-${spanC}x${spanR}` : `${angle}`

  const groupData = new Map<string, {
    angle: number
    count: number
    spanCols: number
    spanRows: number
  }>()

  for (const block of layout) {
    const key = groupKey(block.angle, block.spanCols, block.spanRows)
    if (!groupData.has(key)) {
      groupData.set(key, { angle: block.angle, count: 0, spanCols: block.spanCols, spanRows: block.spanRows })
    }
    groupData.get(key)!.count++
  }

  const angleGroups: AngleGroup[] = Array.from(groupData.entries())
    .sort((a, b) => a[1].angle - b[1].angle || a[0].localeCompare(b[0]))
    .map(([, data]) => {
      const footprintW = data.spanCols * config.blockWidth + (data.spanCols - 1) * config.gap
      const footprintH = data.spanRows * config.blockHeight + (data.spanRows - 1) * config.gap
      const blockDim = Math.max(footprintW, footprintH)
      const slopeHeight = blockDim * Math.tan(data.angle * Math.PI / 180)
      const stockDepth = Math.ceil(2 * config.minBlockDepth + slopeHeight)
      const stopDistance = Math.ceil(config.minBlockDepth + slopeHeight)
      const pairCount = Math.ceil(data.count / 2)
      return {
        angle: data.angle,
        pairCount,
        blockCount: data.count,
        stockDepth,
        stopDistance,
        slopeHeight: Math.round(slopeHeight * 10) / 10,
        ...(isMixed && (data.spanCols > 1 || data.spanRows > 1)
          ? { sizeLabel: `${footprintW}×${footprintH}mm` }
          : {}),
      }
    })

  // Build angle → group index map (using the same key)
  const keyToGroup = new Map<string, number>()
  // Re-derive sorted keys matching angleGroups order
  const sortedKeys = Array.from(groupData.entries())
    .sort((a, b) => a[1].angle - b[1].angle || a[0].localeCompare(b[0]))
    .map(([k]) => k)
  sortedKeys.forEach((k, i) => keyToGroup.set(k, i + 1))

  // Build assembly map
  const rows = config.panelRows
  const cols = config.panelCols
  const cells: AssemblyCell[][] = []
  for (let r = 0; r < rows; r++) {
    const row: AssemblyCell[] = []
    for (let c = 0; c < cols; c++) {
      row.push({ group: 0, dir: 'U', angle: 0, spanCols: 1, spanRows: 1, isOrigin: false })
    }
    cells.push(row)
  }

  for (const block of layout) {
    const key = groupKey(block.angle, block.spanCols, block.spanRows)
    const groupNum = keyToGroup.get(key) ?? 1
    const dir = block.angle === 0 ? 'U' as Direction : rotationToDirection(block.rotation)

    // Mark origin cell
    cells[block.row][block.col] = {
      group: groupNum,
      dir,
      angle: block.angle,
      spanCols: block.spanCols,
      spanRows: block.spanRows,
      isOrigin: true,
    }

    // Mark spanned cells (non-origin)
    for (let dr = 0; dr < block.spanRows; dr++) {
      for (let dc = 0; dc < block.spanCols; dc++) {
        if (dr === 0 && dc === 0) continue
        if (block.row + dr < rows && block.col + dc < cols) {
          cells[block.row + dr][block.col + dc] = {
            group: groupNum,
            dir,
            angle: block.angle,
            spanCols: 0, // marks as "occupied by span"
            spanRows: 0,
            isOrigin: false,
          }
        }
      }
    }
  }

  const totalPairs = angleGroups.reduce((s, g) => s + g.pairCount, 0)
  const flatPairs = angleGroups.filter(g => g.angle === 0).reduce((s, g) => s + g.pairCount, 0)

  return {
    totalBlocks,
    totalPairs,
    blockWidth: config.blockWidth,
    blockHeight: config.blockHeight,
    minBlockDepth: config.minBlockDepth,
    angleGroups,
    flatPairs,
    assembly: { rows, cols, cells },
    isMixed,
  }
}
