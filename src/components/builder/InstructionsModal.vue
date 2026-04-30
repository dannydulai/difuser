<script setup lang="ts">
import { computed } from 'vue'
import type { DiffuserConfig } from '../../types'
import { generateCutList } from '../../composables/useCutList'

const props = defineProps<{ config: DiffuserConfig }>()
defineEmits<{ close: [] }>()

const cutList = computed(() => generateCutList(props.config))

const angledPairCount = computed(() => cutList.value.totalPairs - cutList.value.flatCount)

function rotationArrow(deg: number): string {
  const dirs = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘']
  return dirs[Math.round(deg / 45) % 8]
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2 class="modal-title">Cut Instructions</h2>
        <button class="btn-close" @click="$emit('close')">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <!-- Summary -->
        <section class="summary">
          <div class="summary-item">
            <span class="summary-value">{{ cutList.totalBlocks }}</span>
            <span class="summary-label">blocks</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ cutList.totalPairs }}</span>
            <span class="summary-label">pairs</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ cutList.totalPairs }}</span>
            <span class="summary-label">straight cuts</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ angledPairCount }}</span>
            <span class="summary-label">angled cuts</span>
          </div>
        </section>

        <!-- Step 1: Straight cuts -->
        <section class="step">
          <h3 class="step-number">Step 1 — Straight Cuts</h3>
          <h4 class="step-title">Cut {{ cutList.totalPairs }} rectangular stock pieces</h4>
          <p class="step-desc">
            Each piece is
            <strong>{{ cutList.blockWidth }} &times; {{ cutList.blockHeight }}mm</strong>
            in footprint. The depth varies per pair based on its angle
            (max <strong>{{ cutList.maxStockDepth }}mm</strong>).
          </p>
          <p class="step-note">
            Each stock piece will be cut in half with an angled cut in Step 2,
            yielding two wedge blocks. The {{ cutList.minBlockDepth }}mm minimum depth
            appears on the thin side of each wedge.
          </p>

          <div v-for="group in cutList.angleGroups" :key="group.angle" class="angle-group">
            <div class="group-header">
              <span class="group-angle">{{ group.angle }}°</span>
              <span class="group-count">{{ group.pairs.length }} pair{{ group.pairs.length > 1 ? 's' : '' }}</span>
            </div>
            <table class="cut-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Stock Depth</th>
                  <th>Positions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pair in group.pairs" :key="pair.pairIndex">
                  <td class="cell-pair">#{{ pair.pairIndex + 1 }}</td>
                  <td class="cell-depth">{{ pair.stockDepth }}mm</td>
                  <td class="cell-pos">
                    R{{ pair.blockA.row }}C{{ pair.blockA.col }}
                    <template v-if="pair.blockB">
                      + R{{ pair.blockB.row }}C{{ pair.blockB.col }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Step 2: Angled cuts -->
        <section class="step">
          <h3 class="step-number">Step 2 — Angled Cuts</h3>
          <h4 class="step-title">Cut each stock piece in half at an angle</h4>
          <p class="step-desc">
            Set your saw to the listed angle, orient the stock piece to the listed
            rotation, and cut through the middle. Each cut produces two mirrored
            wedge blocks.
          </p>
          <p class="step-note">
            Group cuts by angle to minimize saw adjustments.
            <template v-if="cutList.flatCount > 0">
              {{ cutList.flatCount }} pair{{ cutList.flatCount > 1 ? 's are' : ' is' }}
              at 0° — no angled cut needed, just split in half.
            </template>
          </p>

          <div
            v-for="group in cutList.angleGroups"
            :key="'angle-' + group.angle"
            class="angle-group"
          >
            <div class="group-header">
              <span class="group-angle" :class="{ flat: group.angle === 0 }">
                {{ group.angle === 0 ? '0° — flat split' : `${group.angle}°` }}
              </span>
              <span class="group-count">{{ group.pairs.length }} pair{{ group.pairs.length > 1 ? 's' : '' }}</span>
            </div>
            <table v-if="group.angle > 0" class="cut-table">
              <thead>
                <tr>
                  <th>Pair</th>
                  <th>Rotation</th>
                  <th>Positions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pair in group.pairs" :key="pair.pairIndex">
                  <td class="cell-pair">#{{ pair.pairIndex + 1 }}</td>
                  <td class="cell-rot">{{ pair.rotationDeg }}° {{ rotationArrow(pair.rotationDeg) }}</td>
                  <td class="cell-pos">
                    R{{ pair.blockA.row }}C{{ pair.blockA.col }}
                    <template v-if="pair.blockB">
                      + R{{ pair.blockB.row }}C{{ pair.blockB.col }}
                    </template>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="group-note">
              Cut straight through the middle — no angle needed. Yields {{ group.pairs.length * 2 }} flat blocks.
            </p>
          </div>
        </section>

        <!-- Step 3: Assembly -->
        <section class="step">
          <h3 class="step-number">Step 3 — Assembly</h3>
          <h4 class="step-title">Arrange and glue</h4>
          <p class="step-desc">
            Arrange the {{ cutList.totalBlocks }} blocks in a
            {{ props.config.panelCols }} &times; {{ props.config.panelRows }} grid
            with {{ props.config.gap }}mm gaps between blocks.
            Glue each block flat-side down onto the backplate.
            <template v-if="props.config.frameDepth > 0">
              Attach the frame around the perimeter.
            </template>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: min(640px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-title {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}
.btn-close {
  width: 28px;
  height: 28px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-close:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}
.btn-close svg {
  width: 14px;
  height: 14px;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-3) transparent;
}

/* Summary bar */
.summary {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
.summary-item {
  flex: 1;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 12px 10px;
  text-align: center;
}
.summary-value {
  display: block;
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 500;
  color: var(--text-primary);
}
.summary-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 2px;
}

.step {
  margin-bottom: 28px;
}
.step:last-child {
  margin-bottom: 0;
}
.step-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 4px;
}
.step-title {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.step-desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 6px;
}
.step-desc strong {
  color: var(--text-primary);
  font-weight: 500;
}
.step-note {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 12px;
}

.angle-group {
  margin-top: 12px;
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-2);
}
.group-angle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.group-angle.flat {
  color: var(--text-muted);
}
.group-count {
  font-size: 12px;
  color: var(--text-muted);
}
.group-note {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-muted);
}

.cut-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.cut-table th {
  text-align: left;
  padding: 6px 14px;
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.cut-table td {
  padding: 5px 14px;
  border-bottom: 1px solid var(--border);
}
.cut-table tr:last-child td {
  border-bottom: none;
}
.cell-pair {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent);
  font-weight: 500;
}
.cell-pos {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-primary);
}
.cell-rot {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}
.cell-depth {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .modal {
    width: calc(100vw - 16px);
    max-height: 90vh;
    border-radius: 12px;
  }
  .modal-header {
    padding: 16px;
  }
  .modal-body {
    padding: 16px;
  }
  .summary {
    flex-wrap: wrap;
  }
  .summary-item {
    min-width: calc(50% - 4px);
  }
}
</style>
