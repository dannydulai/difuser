<script setup lang="ts">
const props = defineProps<{
  label: string
  min: number
  max: number
  step?: number
  suffix?: string
}>()

const model = defineModel<number>({ required: true })

function clamp(val: number) {
  return Math.min(props.max, Math.max(props.min, val))
}

function onInput(e: Event) {
  const v = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(v)) model.value = clamp(v)
}
</script>

<template>
  <label class="slider-input">
    <div class="slider-header">
      <span class="slider-label">{{ label }}</span>
      <div class="slider-value-wrap">
        <input
          type="number"
          class="slider-number"
          :value="model"
          :min="min"
          :max="max"
          :step="step ?? 1"
          @change="onInput"
        />
        <span v-if="suffix" class="slider-suffix">{{ suffix }}</span>
      </div>
    </div>
    <input
      type="range"
      class="slider-range"
      :value="model"
      :min="min"
      :max="max"
      :step="step ?? 1"
      @input="onInput"
    />
  </label>
</template>

<style scoped>
.slider-input {
  display: block;
  margin-bottom: 12px;
}
.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.slider-label {
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.slider-value-wrap {
  display: flex;
  align-items: center;
  gap: 3px;
}
.slider-number {
  width: 56px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  padding: 2px 6px;
  text-align: right;
  -moz-appearance: textfield;
}
.slider-number::-webkit-inner-spin-button,
.slider-number::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.slider-number:focus {
  outline: none;
  border-color: var(--accent);
}
.slider-suffix {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.slider-range {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--surface-2);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.slider-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--surface-0);
  box-shadow: 0 1px 4px rgba(0,0,0,0.4);
  transition: transform 0.15s;
}
.slider-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}
.slider-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: 2px solid var(--surface-0);
}
</style>
