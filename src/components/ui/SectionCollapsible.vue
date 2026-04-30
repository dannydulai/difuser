<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ title: string }>()
const open = ref(true)
</script>

<template>
  <div class="section" :class="{ collapsed: !open }">
    <button class="section-header" @click="open = !open">
      <span class="section-title">{{ title }}</span>
      <svg class="section-chevron" :class="{ rotated: open }" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <Transition name="section">
      <div v-show="open" class="section-body">
        <slot />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.section {
  border-bottom: 1px solid var(--border);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
}
.section-header:hover {
  background: var(--surface-1);
}
.section-title {
  font-family: 'Outfit', sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.section-chevron {
  width: 12px;
  height: 12px;
  color: var(--text-muted);
  transition: transform 0.25s ease;
  transform: rotate(-90deg);
}
.section-chevron.rotated {
  transform: rotate(0deg);
}
.section-body {
  padding: 4px 16px 16px;
}
.section-enter-active,
.section-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.section-enter-from,
.section-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.section-enter-to,
.section-leave-from {
  opacity: 1;
  max-height: 600px;
}
</style>
