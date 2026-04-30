<script setup lang="ts">
defineProps<{
  label: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <label class="color-input">
    <span class="color-label">{{ label }}</span>
    <div class="color-wrap">
      <input
        type="color"
        class="color-native"
        :value="model"
        @input="model = ($event.target as HTMLInputElement).value"
      />
      <span class="color-hex">{{ model }}</span>
    </div>
  </label>
</template>

<style scoped>
.color-input {
  display: block;
  margin-bottom: 12px;
}
.color-label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 5px;
}
.color-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px 4px 4px;
  cursor: pointer;
}
.color-native {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  background: none;
}
.color-native::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-native::-webkit-color-swatch {
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
}
.color-hex {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
