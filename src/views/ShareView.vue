<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '../stores/projects'
import { decodeShare } from '../composables/useShare'

const router = useRouter()
const store = useProjectsStore()
const error = ref(false)

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('v1')

  if (!encoded) {
    error.value = true
    return
  }

  const result = await decodeShare(encoded)
  if (!result) {
    error.value = true
    return
  }

  const project = store.importProject(result.name, result.config)
  router.replace({ name: 'builder', params: { id: project.id } })
})
</script>

<template>
  <div class="share-page">
    <div v-if="error" class="share-error">
      <h2>Invalid share link</h2>
      <p>This link doesn't contain a valid diffuser configuration.</p>
      <button class="btn-home" @click="router.push({ name: 'home' })">Go Home</button>
    </div>
    <div v-else class="share-loading">
      <p>Importing project...</p>
    </div>
  </div>
</template>

<style scoped>
.share-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.share-error, .share-loading {
  text-align: center;
  color: var(--text-secondary);
}
.share-error h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.share-error p {
  font-size: 14px;
  margin-bottom: 24px;
}
.btn-home {
  background: var(--accent);
  color: var(--surface-0);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-family: 'Outfit', sans-serif;
  font-size: 14px;
  cursor: pointer;
}
.btn-home:hover {
  background: var(--accent-hover);
}
</style>
