<script setup lang="ts">
import { computed, watch } from 'vue'
import SectionCollapsible from '../ui/SectionCollapsible.vue'
import SliderInput from '../ui/SliderInput.vue'
import SelectInput from '../ui/SelectInput.vue'
import ColorInput from '../ui/ColorInput.vue'
import SurfaceMaterialInput from '../ui/SurfaceMaterialInput.vue'
import type { DiffuserConfig } from '../../types'

const props = defineProps<{ config: DiffuserConfig }>()
const emit = defineEmits<{
  update: [key: keyof DiffuserConfig, value: any]
  randomize: []
}>()

function set<K extends keyof DiffuserConfig>(key: K, value: DiffuserConfig[K]) {
  emit('update', key, value)
}

function field<K extends keyof DiffuserConfig>(key: K) {
  return computed({
    get: () => props.config[key],
    set: (v) => set(key, v as DiffuserConfig[K]),
  })
}

const panelCols = field('panelCols')
const panelRows = field('panelRows')
const blockWidth = field('blockWidth')
const blockHeight = field('blockHeight')
const lockBlockSize = field('lockBlockSize')
const gap = field('gap')
const minBlockDepth = field('minBlockDepth')
const minAngle = field('minAngle')
const maxAngle = field('maxAngle')
const randomSeed = field('randomSeed')
const blockMaterial = field('blockMaterial')
const blockFinish = field('blockFinish')
const colorMode = field('colorMode')
const blockColor = field('blockColor')
const blockColorSecondary = field('blockColorSecondary')
const gradientSteps = field('gradientSteps')
const gradientDither = field('gradientDither')
const frameWidth = field('frameWidth')
const frameDepth = field('frameDepth')
const frameOffset = field('frameOffset')

// When locked, sync height to width
watch(blockWidth, (val) => {
  if (props.config.lockBlockSize && val !== props.config.blockHeight) {
    set('blockHeight', val as number)
  }
})
watch(blockHeight, (val) => {
  if (props.config.lockBlockSize && val !== props.config.blockWidth) {
    set('blockWidth', val as number)
  }
})

// Clamp maxAngle to never go below minAngle
watch(minAngle, (val) => {
  if ((val as number) > props.config.maxAngle) {
    set('maxAngle', val as number)
  }
})
watch(maxAngle, (val) => {
  if ((val as number) < props.config.minAngle) {
    set('maxAngle', props.config.minAngle)
  }
})

const woodTypes = ['Oak', 'Walnut', 'Maple', 'Cherry', 'Birch', 'Pine']
const finishes = ['Natural', 'Matte', 'Satin', 'Gloss']
const colorModes = ['Natural wood', 'Solid color', 'Gradient', 'Random']

const frameDepthMax = computed(() => 200 + props.config.minBlockDepth)
</script>

<template>
  <div class="control-panel">
    <SectionCollapsible title="Panel Grid">
      <SliderInput v-model="panelCols" label="Columns" :min="1" :max="40" suffix="blocks" />
      <SliderInput v-model="panelRows" label="Rows" :min="1" :max="40" suffix="blocks" />
    </SectionCollapsible>

    <SectionCollapsible title="Block Dimensions">
      <div class="lock-row">
        <div class="lock-fields">
          <SliderInput v-model="blockWidth" label="Width" :min="10" :max="100" suffix="mm" />
          <SliderInput v-if="!lockBlockSize" v-model="blockHeight" label="Height" :min="10" :max="100" suffix="mm" />
        </div>
        <button
          class="btn-lock"
          :class="{ active: lockBlockSize }"
          @click="lockBlockSize = !lockBlockSize"
          :title="lockBlockSize ? 'Unlock width/height' : 'Lock width/height'"
        >
          <svg v-if="lockBlockSize" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 16 16" fill="none">
            <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M5 7V5a3 3 0 016 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <SliderInput v-model="minBlockDepth" label="Min Depth" :min="2" :max="60" suffix="mm" />
      <SliderInput v-model="gap" label="Gap" :min="0" :max="20" suffix="mm" />
    </SectionCollapsible>

    <SectionCollapsible title="Angle Settings">
      <SliderInput v-model="minAngle" label="Min Angle" :min="0" :max="45" :step="5" suffix="deg" />
      <SliderInput v-model="maxAngle" label="Max Angle" :min="0" :max="45" :step="5" suffix="deg" />
      <div class="seed-row">
        <SliderInput v-model="randomSeed" label="Random Seed" :min="0" :max="9999" />
        <button class="btn-randomize" @click="$emit('randomize')" title="Randomize">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 0110.89-3.48M14 8a6 6 0 01-10.89 3.48" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M14 3v2h-2M2 13v-2h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </SectionCollapsible>

    <SectionCollapsible title="Block Materials">
      <SelectInput v-model="blockMaterial" label="Wood Type" :options="woodTypes" />
      <SelectInput v-model="blockFinish" label="Finish" :options="finishes" />
      <SelectInput v-model="colorMode" label="Color Mode" :options="colorModes" />
      <template v-if="colorMode === 'Solid color'">
        <ColorInput v-model="blockColor" label="Block Color" />
      </template>
      <template v-if="colorMode === 'Gradient'">
        <ColorInput v-model="blockColor" label="Start Color" />
        <ColorInput v-model="blockColorSecondary" label="End Color" />
        <SliderInput v-model="gradientSteps" label="Steps" :min="2" :max="40" />
        <SliderInput v-model="gradientDither" label="Dither" :min="0" :max="100" suffix="%" />
      </template>
    </SectionCollapsible>

    <SectionCollapsible title="Backplate">
      <SurfaceMaterialInput
        :surface-type="config.backplateSurfaceType"
        :wood-type="config.backplateWoodType"
        :finish="config.backplateFinish"
        :color="config.backplateColor"
        @update:surface-type="set('backplateSurfaceType', $event)"
        @update:wood-type="set('backplateWoodType', $event)"
        @update:finish="set('backplateFinish', $event)"
        @update:color="set('backplateColor', $event)"
      />
    </SectionCollapsible>

    <SectionCollapsible title="Frame">
      <SliderInput v-model="frameDepth" label="Frame Depth" :min="0" :max="frameDepthMax" suffix="mm" />
      <template v-if="frameDepth > 0">
        <SliderInput v-model="frameWidth" label="Frame Width" :min="5" :max="60" suffix="mm" />
        <SliderInput v-model="frameOffset" label="Frame Offset" :min="0" :max="30" suffix="mm" />
        <SurfaceMaterialInput
          :surface-type="config.frameSurfaceType"
          :wood-type="config.frameWoodType"
          :finish="config.frameFinish"
          :color="config.frameColor"
          @update:surface-type="set('frameSurfaceType', $event)"
          @update:wood-type="set('frameWoodType', $event)"
          @update:finish="set('frameFinish', $event)"
          @update:color="set('frameColor', $event)"
        />
      </template>
    </SectionCollapsible>
  </div>
</template>

<style scoped>
.control-panel {
  height: 100%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-3) transparent;
}
.control-panel::-webkit-scrollbar {
  width: 5px;
}
.control-panel::-webkit-scrollbar-thumb {
  background: var(--surface-3);
  border-radius: 3px;
}
.lock-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.lock-fields {
  flex: 1;
}
.btn-lock {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  margin-top: 18px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.btn-lock:hover {
  border-color: var(--accent-dim);
  color: var(--text-secondary);
}
.btn-lock.active {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--surface-0);
}
.btn-lock svg {
  width: 14px;
  height: 14px;
}
.seed-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.seed-row > :first-child {
  flex: 1;
}
.btn-randomize {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: var(--accent);
  border: none;
  border-radius: 6px;
  color: var(--surface-0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: all 0.15s;
}
.btn-randomize:hover {
  background: var(--accent-hover);
  transform: rotate(90deg);
}
.btn-randomize svg {
  width: 16px;
  height: 16px;
}
</style>
