import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Project, DiffuserConfig } from '../types'
import { DEFAULT_CONFIG } from '../types'

const STORAGE_KEY = 'difuser-projects'

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveProjects(projects: Project[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>(loadProjects())
  const draft = ref<Project | null>(null)

  watch(projects, (val) => saveProjects(val), { deep: true })

  function createProject(name: string): Project {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      config: { ...DEFAULT_CONFIG, randomSeed: Math.floor(Math.random() * 10000) },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    projects.value.unshift(project)
    return project
  }

  function deleteProject(id: string) {
    projects.value = projects.value.filter((p) => p.id !== id)
  }

  function getProject(id: string): Project | undefined {
    if (id === 'draft' && draft.value) return draft.value
    return projects.value.find((p) => p.id === id)
  }

  function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'config'>>) {
    const project = id === 'draft' ? draft.value : projects.value.find((p) => p.id === id)
    if (project) {
      if (updates.name !== undefined) project.name = updates.name
      if (updates.config !== undefined) project.config = { ...project.config, ...updates.config }
      project.updatedAt = Date.now()
    }
  }

  function updateConfig(id: string, config: Partial<DiffuserConfig>) {
    const project = id === 'draft' ? draft.value : projects.value.find((p) => p.id === id)
    if (project) {
      Object.assign(project.config, config)
      project.updatedAt = Date.now()
    }
  }

  function setDraft(name: string, config: DiffuserConfig) {
    draft.value = {
      id: 'draft',
      name,
      config: { ...DEFAULT_CONFIG, ...config },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  function saveDraft(): Project | null {
    if (!draft.value) return null
    const project: Project = {
      ...draft.value,
      id: crypto.randomUUID(),
    }
    projects.value.unshift(project)
    draft.value = null
    return project
  }

  function clearDraft() {
    draft.value = null
  }

  function importProject(name: string, config: DiffuserConfig): Project {
    const project: Project = {
      id: crypto.randomUUID(),
      name,
      config: { ...DEFAULT_CONFIG, ...config },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    projects.value.unshift(project)
    return project
  }

  return {
    projects, draft,
    createProject, deleteProject, getProject, updateProject, updateConfig,
    setDraft, saveDraft, clearDraft, importProject,
  }
})
