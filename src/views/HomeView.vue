<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'

const store = useProjectsStore()
const router = useRouter()

const showNewModal = ref(false)
const newName = ref('')
const deleteTarget = ref<string | null>(null)
const nameInput = ref<HTMLInputElement | null>(null)

function openNew() {
  newName.value = ''
  showNewModal.value = true
  setTimeout(() => nameInput.value?.focus(), 50)
}

function createProject() {
  const name = newName.value.trim() || 'Untitled Project'
  const project = store.createProject(name)
  showNewModal.value = false
  router.push({ name: 'builder', params: { id: project.id } })
}

function confirmDelete(id: string) {
  deleteTarget.value = id
}

function doDelete() {
  if (deleteTarget.value) {
    store.deleteProject(deleteTarget.value)
    deleteTarget.value = null
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="home">
    <!-- Background texture -->
    <div class="bg-grain" />

    <header class="home-header">
      <div class="brand">
        <svg class="brand-icon" viewBox="0 0 32 32" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="1" fill="var(--accent)" opacity="0.9" transform="rotate(5 8 8)"/>
          <rect x="16" y="2" width="12" height="12" rx="1" fill="var(--accent)" opacity="0.7" transform="rotate(-8 22 8)"/>
          <rect x="2" y="18" width="12" height="12" rx="1" fill="var(--accent)" opacity="0.6" transform="rotate(-3 8 24)"/>
          <rect x="16" y="18" width="12" height="12" rx="1" fill="var(--accent)" opacity="0.8" transform="rotate(10 22 24)"/>
        </svg>
        <div>
          <h1 class="brand-name">difuser</h1>

        </div>
      </div>
    </header>

    <main class="home-main">
      <div class="projects-header">
        <h2 class="projects-title">Your Projects</h2>
        <button class="btn-new" @click="openNew">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          New Project
        </button>
      </div>

      <div v-if="store.projects.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 48 48" fill="none">
            <rect x="6" y="6" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3" transform="rotate(5 13 13)"/>
            <rect x="28" y="6" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3" transform="rotate(-5 35 13)"/>
            <rect x="6" y="28" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3" transform="rotate(-3 13 35)"/>
            <rect x="28" y="28" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3" transform="rotate(8 35 35)"/>
          </svg>
        </div>
        <p class="empty-text">No projects yet</p>
        <p class="empty-sub">Create your first acoustic diffuser panel</p>
        <button class="btn-new btn-new-large" @click="openNew">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Create Project
        </button>
      </div>

      <div v-else class="projects-grid">
        <div
          v-for="project in store.projects"
          :key="project.id"
          class="project-card"
          @click="router.push({ name: 'builder', params: { id: project.id } })"
        >
          <div class="card-preview">
            <svg viewBox="0 0 80 80" fill="none">
              <rect v-for="i in 9" :key="i"
                :x="5 + ((i - 1) % 3) * 25"
                :y="5 + Math.floor((i - 1) / 3) * 25"
                width="20" height="20" rx="1"
                fill="var(--accent)"
                :opacity="0.3 + (i * 0.07)"
                :transform="`rotate(${(i * 7 - 28) * (project.config.maxAngle / 15)} ${15 + ((i - 1) % 3) * 25} ${15 + Math.floor((i - 1) / 3) * 25})`"
              />
            </svg>
          </div>
          <div class="card-info">
            <h3 class="card-name">{{ project.name }}</h3>
            <p class="card-meta">
              {{ project.config.panelCols }}&times;{{ project.config.panelRows }} blocks
              &middot; {{ project.config.blockMaterial }}
            </p>
            <p class="card-date">{{ formatDate(project.updatedAt) }}</p>
          </div>
          <button
            class="card-delete"
            @click.stop="confirmDelete(project.id)"
            title="Delete project"
          >
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </main>

    <!-- New Project Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
          <div class="modal">
            <h3 class="modal-title">New Project</h3>
            <input
              ref="nameInput"
              v-model="newName"
              class="modal-input"
              placeholder="Project name"
              @keydown.enter="createProject"
            />
            <div class="modal-actions">
              <button class="btn-cancel" @click="showNewModal = false">Cancel</button>
              <button class="btn-confirm" @click="createProject">Create</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
          <div class="modal">
            <h3 class="modal-title">Delete Project</h3>
            <p class="modal-text">Are you sure? This cannot be undone.</p>
            <div class="modal-actions">
              <button class="btn-cancel" @click="deleteTarget = null">Cancel</button>
              <button class="btn-danger" @click="doDelete">Delete</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  position: relative;
}
.bg-grain {
  position: fixed;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  pointer-events: none;
}
.home-header {
  padding: 40px 48px 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}
.brand-icon {
  width: 40px;
  height: 40px;
}
.brand-name {
  font-family: 'DM Serif Display', serif;
  font-size: 28px;
  font-weight: 400;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.home-main {
  max-width: 960px;
  margin: 0 auto;
  padding: 48px;
}
.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}
.projects-title {
  font-family: 'Outfit', sans-serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}
.btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--accent);
  color: var(--surface-0);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-new:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
.btn-new svg {
  width: 14px;
  height: 14px;
}
.btn-new-large {
  padding: 12px 24px;
  font-size: 14px;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}
.empty-icon {
  color: var(--text-muted);
  margin-bottom: 20px;
}
.empty-icon svg {
  width: 64px;
  height: 64px;
}
.empty-text {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.empty-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 28px;
}

/* Project grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.project-card {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.project-card:hover {
  border-color: var(--accent-dim);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.card-preview {
  background: var(--surface-2);
  padding: 20px;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}
.card-preview svg {
  width: 80px;
  height: 80px;
}
.card-info {
  padding: 14px 16px;
}
.card-name {
  font-family: 'Outfit', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.card-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.card-date {
  font-size: 11px;
  color: var(--text-muted);
}
.card-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: var(--surface-0);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;
}
.project-card:hover .card-delete {
  opacity: 1;
}
.card-delete:hover {
  background: var(--danger);
  border-color: var(--danger);
  color: white;
}
.card-delete svg {
  width: 12px;
  height: 12px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
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
  padding: 28px;
  width: 380px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.modal-title {
  font-family: 'Outfit', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.modal-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}
.modal-input {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  padding: 10px 14px;
  margin-bottom: 20px;
  box-sizing: border-box;
}
.modal-input:focus {
  outline: none;
  border-color: var(--accent);
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  padding: 8px 16px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-cancel:hover {
  background: var(--surface-3);
}
.btn-confirm {
  background: var(--accent);
  border: none;
  border-radius: 8px;
  color: var(--surface-0);
  padding: 8px 20px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-confirm:hover {
  background: var(--accent-hover);
}
.btn-danger {
  background: var(--danger);
  border: none;
  border-radius: 8px;
  color: white;
  padding: 8px 20px;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-danger:hover {
  background: #d63031;
}

/* Modal transition */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95);
}
</style>
