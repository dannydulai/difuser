<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useThreeScene } from '../composables/useThreeScene'
import { buildShareUrl } from '../composables/useShare'
import ControlPanel from '../components/builder/ControlPanel.vue'
import InstructionsModal from '../components/builder/InstructionsModal.vue'
import type { DiffuserConfig } from '../types'

const props = defineProps<{ id: string }>()
const router = useRouter()
const store = useProjectsStore()

const project = computed(() => store.getProject(props.id))
const config = computed(() => project.value?.config)

const viewportRef = ref<HTMLElement | null>(null)
const editingName = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const editName = ref('')

onMounted(() => {
  if (!project.value) {
    router.replace({ name: 'home' })
  }
})

const { fitToView, exportOBJ } = useThreeScene(viewportRef, config as any)

function onUpdate(key: keyof DiffuserConfig, value: any) {
  if (project.value) {
    store.updateConfig(props.id, { [key]: value })
  }
}

function randomizeSeed() {
  store.updateConfig(props.id, { randomSeed: Math.floor(Math.random() * 10000) })
}

function startEditName() {
  editName.value = project.value?.name ?? ''
  editingName.value = true
  setTimeout(() => nameInput.value?.select(), 50)
}

function saveName() {
  editingName.value = false
  if (editName.value.trim()) {
    store.updateProject(props.id, { name: editName.value.trim() })
  }
}

const totalSize = computed(() => {
  if (!config.value) return { w: 0, h: 0 }
  const c = config.value
  const gridW = c.panelCols * c.blockWidth + (c.panelCols - 1) * c.gap
  const gridH = c.panelRows * c.blockHeight + (c.panelRows - 1) * c.gap
  const hasFrame = c.frameDepth > 0
  const totalW = hasFrame ? gridW + 2 * c.frameOffset + 2 * c.frameWidth : gridW
  const totalH = hasFrame ? gridH + 2 * c.frameOffset + 2 * c.frameWidth : gridH
  return { w: Math.round(totalW), h: Math.round(totalH) }
})

const blockCount = computed(() => {
  if (!config.value) return 0
  return config.value.panelCols * config.value.panelRows
})

const isDraft = computed(() => props.id === 'draft')
const showInstructions = ref(false)
const panelOpen = ref(false)

const shareCopied = ref(false)
async function shareProject() {
  if (!project.value) return
  const url = await buildShareUrl(project.value.name, project.value.config)
  await navigator.clipboard.writeText(url)
  shareCopied.value = true
  setTimeout(() => { shareCopied.value = false }, 2000)
}

function saveDraft() {
  const saved = store.saveDraft()
  if (saved) {
    router.replace({ name: 'builder', params: { id: saved.id } })
  }
}

watch(panelOpen, async (open) => {
  await nextTick()
  // Wait for CSS transition to settle, then fit camera to visible area
  setTimeout(() => {
    fitToView()
    if (!open) {
      // Drawer closing — fit again after transition completes
      setTimeout(() => fitToView(), 320)
    }
  }, 50)
})

function goBack() {
  if (isDraft.value) store.clearDraft()
  router.push({ name: 'home' })
}
</script>

<template>
  <div v-if="project" class="builder">
    <header class="builder-header">
      <button class="btn-back" @click="goBack" title="Back to projects">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="header-title" @dblclick="startEditName">
        <template v-if="!editingName">
          <h1 class="project-name">{{ project.name }}</h1>
          <button class="btn-edit-name" @click="startEditName" title="Rename">
            <svg viewBox="0 0 12 12" fill="none">
              <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </template>
        <input
          v-else
          ref="nameInput"
          v-model="editName"
          class="name-edit-input"
          @blur="saveName"
          @keydown.enter="saveName"
          @keydown.escape="editingName = false"
        />
      </div>

      <div class="header-stats">
        <span>{{ totalSize.w }}mm &times; {{ totalSize.h }}mm</span>
        <span class="stat-divider">&middot;</span>
        <span>{{ blockCount }} blocks</span>
      </div>

      <span v-if="isDraft" class="draft-badge">SHARED</span>

      <button v-if="isDraft" class="btn-save" @click="saveDraft">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M12.5 14h-9A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H10l4 4v6.5a1.5 1.5 0 01-1.5 1.5z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M11 14V9H5v5M5 2v3h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Save to My Projects</span>
      </button>

      <button class="btn-instructions" @click="showInstructions = true" title="Cut instructions">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M2 3h12M2 6.5h8M2 10h10M2 13.5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="btn-label">Instructions</span>
      </button>

      <button class="btn-export" @click="exportOBJ(project?.name ?? 'difuser')" title="Export OBJ for SketchUp">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        <span class="btn-label">Export</span>
      </button>

      <button class="btn-share" @click="shareProject" :title="shareCopied ? 'Copied!' : 'Copy share link'">
        <svg v-if="!shareCopied" viewBox="0 0 16 16" fill="none">
          <circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.3"/>
          <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.3"/>
          <path d="M5.7 7.1L10.3 4.9M5.7 8.9L10.3 11.1" stroke="currentColor" stroke-width="1.3"/>
        </svg>
        <svg v-else viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="btn-label">{{ shareCopied ? 'Copied!' : 'Share' }}</span>
      </button>

      <div class="header-brand">
        <span class="brand-mark">difuser</span>
        <svg class="brand-logo" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.9" transform="rotate(5 8 8)"/>
          <rect x="18" y="2" width="12" height="12" rx="1" fill="currentColor" opacity="0.7" transform="rotate(-8 24 8)"/>
          <rect x="2" y="18" width="12" height="12" rx="1" fill="currentColor" opacity="0.6" transform="rotate(-3 8 24)"/>
          <rect x="18" y="18" width="12" height="12" rx="1" fill="currentColor" opacity="0.8" transform="rotate(10 24 24)"/>
        </svg>
      </div>
    </header>

    <div class="builder-body">
      <aside class="sidebar" :class="{ open: panelOpen }">
        <ControlPanel
          v-if="config"
          :config="config"
          @update="onUpdate"
          @randomize="randomizeSeed"
        />
      </aside>

      <!-- Mobile panel toggle -->
      <button class="btn-panel-toggle" @click="panelOpen = !panelOpen">
        <svg viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>{{ panelOpen ? 'Close' : 'Controls' }}</span>
      </button>

      <main class="viewport" :class="{ 'drawer-open': panelOpen }" ref="viewportRef" />
    </div>

    <Teleport to="body">
      <InstructionsModal
        v-if="showInstructions && config"
        :config="config"
        @close="showInstructions = false"
      />
    </Teleport>
  </div>
</template>

<style scoped>
.builder {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.builder-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 48px;
  background: var(--surface-1);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.btn-back {
  width: 32px;
  height: 32px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-back:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}
.btn-back svg {
  width: 16px;
  height: 16px;
}
.header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.project-name {
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-edit-name {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}
.btn-edit-name:hover {
  color: var(--text-primary);
  background: var(--surface-2);
}
.btn-edit-name svg {
  width: 12px;
  height: 12px;
}
.name-edit-input {
  background: var(--surface-2);
  border: 1px solid var(--accent);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 500;
  padding: 2px 8px;
  width: 240px;
}
.name-edit-input:focus {
  outline: none;
}
.header-stats {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.stat-divider {
  color: var(--border);
}
.draft-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--accent);
  background: rgba(200, 147, 90, 0.12);
  border: 1px solid var(--accent-dim);
  border-radius: 4px;
  padding: 2px 7px;
  flex-shrink: 0;
}
.btn-save {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: var(--surface-0);
  padding: 5px 12px;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-save:hover {
  background: var(--accent-hover);
}
.btn-save svg {
  width: 14px;
  height: 14px;
}
.btn-instructions,
.btn-export,
.btn-share {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  padding: 5px 10px;
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.btn-instructions:hover,
.btn-export:hover,
.btn-share:hover {
  background: var(--surface-3);
  color: var(--text-primary);
  border-color: var(--accent-dim);
}
.btn-instructions svg,
.btn-export svg,
.btn-share svg {
  width: 14px;
  height: 14px;
}
.header-brand {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand-mark {
  font-family: 'DM Serif Display', serif;
  font-size: 16px;
  color: var(--text-muted);
  letter-spacing: -0.02em;
}
.brand-logo {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.builder-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}
.sidebar {
  width: 320px;
  flex-shrink: 0;
  background: var(--surface-0);
  border-right: 1px solid var(--border);
  overflow: hidden;
}
.viewport {
  flex: 1;
  background: #1a1a1e;
  position: relative;
  overflow: hidden;
}
.viewport canvas {
  display: block;
}

/* Mobile panel toggle — hidden on desktop */
.btn-panel-toggle {
  display: none;
}

/* ─── Mobile ─── */
@media (max-width: 768px) {
  .builder-header {
    gap: 8px;
    padding: 0 10px;
    height: 44px;
  }
  .header-stats {
    display: none;
  }
  .header-brand {
    gap: 6px;
  }
  .brand-mark {
    display: none;
  }
  .btn-label {
    display: none;
  }
  .btn-instructions,
  .btn-share {
    padding: 5px 7px;
  }
  .btn-save span {
    display: none;
  }
  .btn-save {
    padding: 5px 8px;
  }
  .name-edit-input {
    width: 140px;
  }

  .builder-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: 0;
    overflow: hidden;
    border-right: none;
    border-top: 1px solid var(--border);
    transition: height 0.3s ease;
  }
  .sidebar.open {
    height: 65dvh;
    overflow: hidden;
  }

  .btn-panel-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 40;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 20px;
    color: var(--text-secondary);
    padding: 8px 16px;
    font-family: 'Outfit', sans-serif;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .btn-panel-toggle svg {
    width: 14px;
    height: 14px;
  }

  .viewport {
    flex: 1;
    transition: height 0.3s ease;
  }
  .viewport.drawer-open {
    height: 35dvh;
    flex: none;
  }
}

@media (max-width: 400px) {
  .builder-header {
    gap: 6px;
    padding: 0 8px;
  }
  .project-name {
    font-size: 13px;
    max-width: 100px;
  }
  .btn-back {
    width: 28px;
    height: 28px;
  }
}
</style>
