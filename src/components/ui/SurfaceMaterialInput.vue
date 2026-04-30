<script setup lang="ts">
import SelectInput from './SelectInput.vue'
import ColorInput from './ColorInput.vue'
import type { SurfaceType, WoodType, WoodColorMode, Finish } from '../../types'

defineProps<{
  surfaceType: SurfaceType
  woodType: WoodType
  woodColorMode: WoodColorMode
  woodColor: string
  finish: Finish
  color: string
}>()

const emit = defineEmits<{
  'update:surfaceType': [value: SurfaceType]
  'update:woodType': [value: WoodType]
  'update:woodColorMode': [value: WoodColorMode]
  'update:woodColor': [value: string]
  'update:finish': [value: Finish]
  'update:color': [value: string]
}>()

const surfaceTypes = ['Wood', 'Metal', 'Brushed Aluminum', 'Painted Wood']
const woodTypes = ['Oak', 'Walnut', 'Maple', 'Cherry', 'Birch', 'Pine']
const woodColorModes = ['Natural wood', 'Solid color']
const finishes = ['Natural', 'Matte', 'Satin', 'Gloss']
const paintFinishes = ['Matte', 'Satin', 'Gloss']
</script>

<template>
  <SelectInput
    :model-value="surfaceType"
    @update:model-value="emit('update:surfaceType', $event as SurfaceType)"
    label="Type"
    :options="surfaceTypes"
  />

  <!-- Wood: wood type + color mode + finish -->
  <template v-if="surfaceType === 'Wood'">
    <SelectInput
      :model-value="woodType"
      @update:model-value="emit('update:woodType', $event as WoodType)"
      label="Wood Type"
      :options="woodTypes"
    />
    <SelectInput
      :model-value="woodColorMode"
      @update:model-value="emit('update:woodColorMode', $event as WoodColorMode)"
      label="Color"
      :options="woodColorModes"
    />
    <ColorInput
      v-if="woodColorMode === 'Solid color'"
      :model-value="woodColor"
      @update:model-value="emit('update:woodColor', $event)"
      label="Wood Color"
    />
    <SelectInput
      :model-value="finish"
      @update:model-value="emit('update:finish', $event as Finish)"
      label="Finish"
      :options="finishes"
    />
  </template>

  <!-- Metal: color -->
  <template v-if="surfaceType === 'Metal'">
    <ColorInput
      :model-value="color"
      @update:model-value="emit('update:color', $event)"
      label="Color"
    />
  </template>

  <!-- Brushed Aluminum: no extra options -->

  <!-- Painted Wood: color + finish -->
  <template v-if="surfaceType === 'Painted Wood'">
    <ColorInput
      :model-value="color"
      @update:model-value="emit('update:color', $event)"
      label="Paint Color"
    />
    <SelectInput
      :model-value="finish"
      @update:model-value="emit('update:finish', $event as Finish)"
      label="Finish"
      :options="paintFinishes"
    />
  </template>
</template>
