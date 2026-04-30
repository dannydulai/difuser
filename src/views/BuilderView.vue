<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { useThreeScene } from '../composables/useThreeScene'
import ControlPanel from '../components/builder/ControlPanel.vue'
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

useThreeScene(viewportRef, config as any)

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
</script>

<template>
  <div v-if="project" class="builder">
    <header class="builder-header">
      <button class="btn-back" @click="router.push({ name: 'home' })" title="Back to projects">
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

      <div class="header-brand">
        <span class="brand-mark">difuser</span>
      </div>
    </header>

    <div class="builder-body">
      <aside class="sidebar">
        <ControlPanel
          v-if="config"
          :config="config"
          @update="onUpdate"
          @randomize="randomizeSeed"
        />
      </aside>
      <main class="viewport" ref="viewportRef" />
    </div>
  </div>
</template>

<style scoped>
.builder {
  height: 100vh;
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
.header-brand {
  margin-left: auto;
}
.brand-mark {
  font-family: 'DM Serif Display', serif;
  font-size: 16px;
  color: var(--text-muted);
  letter-spacing: -0.02em;
}

.builder-body {
  display: flex;
  flex: 1;
  overflow: hidden;
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
</style>
