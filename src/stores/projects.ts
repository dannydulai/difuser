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
    return projects.value.find((p) => p.id === id)
  }

  function updateProject(id: string, updates: Partial<Pick<Project, 'name' | 'config'>>) {
    const project = projects.value.find((p) => p.id === id)
    if (project) {
      if (updates.name !== undefined) project.name = updates.name
      if (updates.config !== undefined) project.config = { ...project.config, ...updates.config }
      project.updatedAt = Date.now()
    }
  }

  function updateConfig(id: string, config: Partial<DiffuserConfig>) {
    const project = projects.value.find((p) => p.id === id)
    if (project) {
      Object.assign(project.config, config)
      project.updatedAt = Date.now()
    }
  }

  return { projects, createProject, deleteProject, getProject, updateProject, updateConfig }
})
