<script setup lang="ts">
import { computed } from 'vue'
import type { DiffuserConfig } from '../../types'
import { generateCutList } from '../../composables/useCutList'
import CutDiagram from './CutDiagram.vue'

const props = defineProps<{ config: DiffuserConfig }>()
defineEmits<{ close: [] }>()

const cutList = computed(() => generateCutList(props.config))
const angledPairs = computed(() => cutList.value.totalPairs - cutList.value.flatPairs)
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
            <span class="summary-label">stock pieces</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ cutList.totalPairs }}</span>
            <span class="summary-label">straight cuts</span>
          </div>
          <div class="summary-item">
            <span class="summary-value">{{ angledPairs }}</span>
            <span class="summary-label">angled cuts</span>
          </div>
        </section>

        <!-- Step 1 -->
        <section class="step">
          <h3 class="step-number">Step 1 — Straight Cuts</h3>
          <h4 class="step-title">Cut rectangular stock pieces</h4>
          <p class="step-desc">
            All pieces are
            <strong>{{ cutList.blockWidth }} &times; {{ cutList.blockHeight }}mm</strong>
            in footprint. Cut to the lengths below.
          </p>

          <div class="cut-cards">
            <div v-for="(group, i) in cutList.angleGroups" :key="group.angle" class="cut-card">
              <div class="cut-card-label">Group {{ i + 1 }}</div>
              <div class="cut-card-row">
                <span class="cut-card-qty">{{ group.pairCount }}</span>
                <span class="cut-card-at">@</span>
                <span class="cut-card-length">{{ group.stockDepth }}mm</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Step 2 -->
        <section class="step">
          <h3 class="step-number">Step 2 — Angled Cuts</h3>
          <h4 class="step-title">Split each stock piece into two wedge blocks</h4>
          <p class="step-desc">
            Set your saw to the angle listed for each group. Position the fence
            at the stop distance shown, then cut each stock piece. Each cut
            produces two mirrored wedge blocks.
          </p>

          <template v-if="cutList.flatPairs > 0">
            <p class="step-note">
              The {{ cutList.flatPairs }} piece{{ cutList.flatPairs > 1 ? 's' : '' }}
              at 0° just need a flat split at {{ cutList.minBlockDepth }}mm — no angle.
            </p>
          </template>

          <div class="angle-cuts">
            <div
              v-for="group in cutList.angleGroups.filter(g => g.angle > 0)"
              :key="group.angle"
              class="angle-cut-group"
            >
              <div class="angle-cut-header">
                <span class="angle-cut-title">Group {{ cutList.angleGroups.indexOf(group) + 1 }}</span>
                <span class="angle-cut-summary">{{ group.pairCount }} cuts @ {{ group.angle }}°</span>
              </div>
              <div class="angle-cut-body">
                <div class="angle-cut-info">
                  <div class="angle-cut-stat">
                    <span class="stat-label">Saw angle</span>
                    <span class="stat-value">{{ group.angle }}°</span>
                  </div>
                  <div class="angle-cut-stat">
                    <span class="stat-label">Stop distance</span>
                    <span class="stat-value highlight">{{ group.stopDistance }}mm</span>
                  </div>
                </div>
                <CutDiagram
                  :angle="group.angle"
                  :min-depth="cutList.minBlockDepth"
                  :stop-distance="group.stopDistance"
                  :stock-depth="group.stockDepth"
                />
              </div>
            </div>
          </div>
        </section>

        <!-- Step 3 -->
        <section class="step">
          <h3 class="step-number">Step 3 — Assembly</h3>
          <h4 class="step-title">Arrange and glue</h4>
          <p class="step-desc">
            Place blocks in a
            {{ props.config.panelCols }} &times; {{ props.config.panelRows }} grid
            with {{ props.config.gap }}mm gaps, rotating each wedge to a random
            orientation. Glue flat-side down onto the backplate.
            <template v-if="props.config.frameDepth > 0">
              Attach the frame around the perimeter.
            </template>
          </p>
          <p class="step-note">
            The exact rotation of each block doesn't matter for acoustics —
            random placement diffuses sound effectively.
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
  width: min(540px, 90vw);
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
  margin-bottom: 10px;
}
.step-desc strong {
  color: var(--text-primary);
  font-weight: 500;
}
.step-note {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 10px;
}

.cut-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cut-card {
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 140px;
  flex: 1;
}
.cut-card-label {
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.cut-card-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.cut-card-qty {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 500;
  color: var(--accent);
}
.cut-card-at {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--text-muted);
}
.cut-card-length {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  color: var(--text-primary);
}

/* Step 2 angle cut groups */
.angle-cuts {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.angle-cut-group {
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.angle-cut-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--surface-2);
}
.angle-cut-title {
  font-family: 'Outfit', sans-serif;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.angle-cut-summary {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}
.angle-cut-body {
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 16px;
}
.angle-cut-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}
.angle-cut-stat {
  display: flex;
  flex-direction: column;
}
.stat-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
}
.stat-value.highlight {
  color: var(--accent);
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
  .cut-cards {
    flex-direction: column;
  }
  .angle-cut-body {
    flex-direction: column;
    align-items: stretch;
  }
  .angle-cut-info {
    flex-direction: row;
    gap: 20px;
  }
}
</style>
