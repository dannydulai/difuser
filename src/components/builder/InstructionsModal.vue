<script setup lang="ts">
import { computed } from 'vue'
import type { DiffuserConfig } from '../../types'
import { generateCutList } from '../../composables/useCutList'

const props = defineProps<{ config: DiffuserConfig }>()
defineEmits<{ close: [] }>()

const cutList = computed(() => generateCutList(props.config))

function rotationLabel(deg: number): string {
  // Express as compass-like direction for intuitive orientation
  const dirs = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘']
  const idx = Math.round(deg / 45) % 8
  return `${deg}° ${dirs[idx]}`
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
        <!-- Step 1: Stock -->
        <section class="step">
          <h3 class="step-number">Step 1</h3>
          <h4 class="step-title">Prepare Stock</h4>
          <p class="step-desc">
            Cut <strong>{{ cutList.totalBlocks }}</strong> blocks to
            <strong>{{ cutList.blockWidth }} &times; {{ cutList.blockHeight }} &times; {{ cutList.stockDepth }} mm</strong>
          </p>
          <p class="step-note">
            Stock depth of {{ cutList.stockDepth }}mm accommodates the steepest angled cut.
            All blocks start at this thickness, then get trimmed by the angle cuts below.
          </p>
        </section>

        <!-- Step 2: Angle cuts -->
        <section class="step">
          <h3 class="step-number">Step 2</h3>
          <h4 class="step-title">Angle Cuts</h4>
          <p class="step-desc">
            Group cuts by saw angle to minimize adjustments.
            For each block, rotate it on the sled to the listed direction before cutting.
          </p>

          <div
            v-for="group in cutList.angleGroups"
            :key="group.angle"
            class="angle-group"
          >
            <div class="group-header">
              <span class="group-angle" :class="{ flat: group.angle === 0 }">
                {{ group.angle === 0 ? 'No cut' : `${group.angle}°` }}
              </span>
              <span class="group-count">{{ group.blocks.length }} block{{ group.blocks.length > 1 ? 's' : '' }}</span>
            </div>

            <p v-if="group.angle === 0" class="group-note">
              These blocks remain flat — no angle cut needed.
            </p>

            <table v-else class="cut-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Rotation</th>
                  <th>Max Depth</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="block in group.blocks" :key="`${block.row}-${block.col}`">
                  <td class="cell-pos">R{{ block.row }} C{{ block.col }}</td>
                  <td class="cell-rot">{{ rotationLabel(block.rotation) }}</td>
                  <td class="cell-depth">{{ block.maxDepth }}mm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Step 3: Assembly -->
        <section class="step">
          <h3 class="step-number">Step 3</h3>
          <h4 class="step-title">Assembly</h4>
          <p class="step-desc">
            Arrange blocks in the grid ({{ props.config.panelCols }} columns &times; {{ props.config.panelRows }} rows)
            with {{ props.config.gap }}mm gaps.
            Glue blocks flat-side down onto the backplate.
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
}

.angle-group {
  margin-top: 16px;
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
  color: var(--text-muted);
}
</style>
