<script setup lang="ts">
defineProps<{
  label: string
  options: string[]
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="select-input">
    <span class="select-label">{{ label }}</span>
    <div class="select-wrap">
      <select :value="model" @change="model = ($event.target as HTMLSelectElement).value">
        <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <svg class="select-chevron" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
  </label>
</template>

<style scoped>
.select-input {
  display: block;
  margin-bottom: 12px;
}
.select-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 5px;
}
.select-wrap {
  position: relative;
}
.select-wrap select {
  width: 100%;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  padding: 7px 28px 7px 10px;
  appearance: none;
  cursor: pointer;
}
.select-wrap select:focus {
  outline: none;
  border-color: var(--accent);
}
.select-chevron {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  color: var(--text-muted);
  pointer-events: none;
}
</style>
