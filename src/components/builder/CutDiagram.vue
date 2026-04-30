<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  angle: number
  minDepth: number
  stopDistance: number
  stockDepth: number
}>()

// Diagram geometry — normalized to fit in the SVG viewbox
const svgW = 280
const svgH = 140
const pad = 30
const blockW = svgW - pad * 2   // horizontal = stock depth
const blockH = svgH - pad * 2 - 10  // vertical = block height (visual)

const diagram = computed(() => {
  const sd = props.stockDepth
  const stop = props.stopDistance
  const minD = props.minDepth

  // Block rectangle
  const bx = pad
  const by = pad
  const bw = blockW
  const bh = blockH

  // Cut line: angled from bottom to top
  // At bottom (table), cut is at stopDistance from the left (fence side)
  // At top, cut exits at minDepth from the left
  // (The blade tilts, so thick side is at the bottom near the fence)

  // Normalize positions to block width
  const cutBottomX = bx + (stop / sd) * bw  // thick side (bottom, fence side)
  const cutTopX = bx + (minD / sd) * bw      // thin side (top)

  // Dimension lines
  const dimY = by + bh + 18  // below the block

  // Stop distance marker (from left edge to cut at bottom)
  const stopLineX1 = bx
  const stopLineX2 = cutBottomX

  return {
    bx, by, bw, bh,
    cutBottomX, cutTopX,
    dimY,
    stopLineX1, stopLineX2,
    // Fence position
    fenceX: bx,
    // Blade position (at bottom)
    bladeBottomX: cutBottomX,
    // Labels
    stopMidX: (stopLineX1 + stopLineX2) / 2,
    minDepthMidX: (bx + cutTopX) / 2,
  }
})
</script>

<template>
  <svg :viewBox="`0 0 ${svgW} ${svgH}`" class="cut-diagram">
    <!-- Block outline -->
    <rect
      :x="diagram.bx" :y="diagram.by"
      :width="diagram.bw" :height="diagram.bh"
      fill="#2a2a2e" stroke="#555" stroke-width="1"
      rx="2"
    />

    <!-- Wedge A (fence side) — filled -->
    <polygon
      :points="`${diagram.bx},${diagram.by} ${diagram.cutTopX},${diagram.by} ${diagram.cutBottomX},${diagram.by + diagram.bh} ${diagram.bx},${diagram.by + diagram.bh}`"
      fill="var(--accent)" opacity="0.2"
    />
    <!-- Wedge B (blade side) — filled -->
    <polygon
      :points="`${diagram.cutTopX},${diagram.by} ${diagram.bx + diagram.bw},${diagram.by} ${diagram.bx + diagram.bw},${diagram.by + diagram.bh} ${diagram.cutBottomX},${diagram.by + diagram.bh}`"
      fill="var(--accent)" opacity="0.1"
    />

    <!-- Cut line -->
    <line
      :x1="diagram.cutTopX" :y1="diagram.by"
      :x2="diagram.cutBottomX" :y2="diagram.by + diagram.bh"
      stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"
    />

    <!-- Fence line -->
    <line
      :x1="diagram.fenceX - 4" :y1="diagram.by - 6"
      :x2="diagram.fenceX - 4" :y2="diagram.by + diagram.bh + 6"
      stroke="#888" stroke-width="2"
    />
    <text
      :x="diagram.fenceX - 7" :y="diagram.by + diagram.bh / 2"
      text-anchor="end" class="label-small" transform-origin="center"
      :transform="`rotate(-90 ${diagram.fenceX - 7} ${diagram.by + diagram.bh / 2})`"
    >FENCE</text>

    <!-- Stop distance dimension -->
    <line
      :x1="diagram.stopLineX1" :y1="diagram.dimY"
      :x2="diagram.stopLineX2" :y2="diagram.dimY"
      stroke="var(--accent)" stroke-width="1.5"
    />
    <!-- Ticks -->
    <line :x1="diagram.stopLineX1" :y1="diagram.dimY - 4" :x2="diagram.stopLineX1" :y2="diagram.dimY + 4" stroke="var(--accent)" stroke-width="1.5" />
    <line :x1="diagram.stopLineX2" :y1="diagram.dimY - 4" :x2="diagram.stopLineX2" :y2="diagram.dimY + 4" stroke="var(--accent)" stroke-width="1.5" />
    <!-- Label -->
    <text :x="diagram.stopMidX" :y="diagram.dimY + 14" text-anchor="middle" class="label-dim">
      {{ stopDistance }}mm
    </text>

    <!-- Angle label on cut line -->
    <text
      :x="(diagram.cutTopX + diagram.cutBottomX) / 2 + 12"
      :y="diagram.by + diagram.bh / 2 + 4"
      class="label-angle"
    >{{ angle }}°</text>

    <!-- Min depth label (thin side, top) -->
    <text
      :x="diagram.minDepthMidX"
      :y="diagram.by - 6"
      text-anchor="middle"
      class="label-small"
    >{{ minDepth }}mm</text>

    <!-- Top dimension line for min depth -->
    <line
      :x1="diagram.bx" :y1="diagram.by - 2"
      :x2="diagram.cutTopX" :y2="diagram.by - 2"
      stroke="#777" stroke-width="0.75"
    />
  </svg>
</template>

<style scoped>
.cut-diagram {
  width: 100%;
  max-width: 280px;
  height: auto;
  display: block;
  margin: 8px auto 4px;
}
.label-dim {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  fill: var(--accent);
  font-weight: 500;
}
.label-angle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  fill: var(--text-secondary);
}
.label-small {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  fill: var(--text-muted);
}
</style>
