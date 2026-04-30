export type WoodType = 'Oak' | 'Walnut' | 'Maple' | 'Cherry' | 'Birch' | 'Pine'
export type Finish = 'Natural' | 'Matte' | 'Satin' | 'Gloss'
export type ColorMode = 'Natural wood' | 'Solid color' | 'Gradient'
export type WoodColorMode = 'Natural wood' | 'Solid color'
export type SurfaceType = 'Wood' | 'Metal' | 'Brushed Aluminum' | 'Painted Wood'

export interface DiffuserConfig {
  // Panel (in blocks)
  panelCols: number
  panelRows: number

  // Block dimensions
  blockWidth: number
  blockHeight: number
  lockBlockSize: boolean
  gap: number

  // Angles (0–45 in steps of 5)
  minAngle: number
  maxAngle: number
  minBlockDepth: number
  randomSeed: number

  // Block materials
  blockMaterial: WoodType
  blockFinish: Finish
  colorMode: ColorMode
  solidColor: string
  gradientStart: string
  gradientEnd: string
  gradientSteps: number
  gradientDither: number

  // Frame surface
  frameSurfaceType: SurfaceType
  frameWoodType: WoodType
  frameWoodColorMode: WoodColorMode
  frameWoodColor: string
  frameFinish: Finish
  frameColor: string

  // Backplate surface
  backplateSurfaceType: SurfaceType
  backplateWoodType: WoodType
  backplateWoodColorMode: WoodColorMode
  backplateWoodColor: string
  backplateFinish: Finish
  backplateColor: string

  // Frame geometry
  frameWidth: number
  frameDepth: number
  frameOffset: number
}

export interface Project {
  id: string
  name: string
  config: DiffuserConfig
  createdAt: number
  updatedAt: number
}

export const DEFAULT_CONFIG: DiffuserConfig = {
  panelCols: 12,
  panelRows: 12,
  blockWidth: 40,
  blockHeight: 40,
  lockBlockSize: true,
  gap: 2,
  minAngle: 20,
  maxAngle: 40,
  minBlockDepth: 10,
  randomSeed: 42,
  blockMaterial: 'Oak',
  blockFinish: 'Natural',
  colorMode: 'Natural wood',
  solidColor: '#622f75',
  gradientStart: '#a3a3a3',
  gradientEnd: '#248dc2',
  gradientSteps: 8,
  gradientDither: 30,
  frameSurfaceType: 'Wood',
  frameWoodType: 'Walnut',
  frameWoodColorMode: 'Natural wood',
  frameWoodColor: '#5c4033',
  frameFinish: 'Satin',
  frameColor: '#3d2b1f',
  backplateSurfaceType: 'Wood',
  backplateWoodType: 'Walnut',
  backplateWoodColorMode: 'Natural wood',
  backplateWoodColor: '#5c4033',
  backplateFinish: 'Natural',
  backplateColor: '#2a1f15',
  frameWidth: 20,
  frameDepth: 40,
  frameOffset: 4,
}

export const WOOD_COLORS: Record<WoodType, { base: string; grain: string }> = {
  Oak: { base: '#b5874d', grain: '#9a7040' },
  Walnut: { base: '#5c4033', grain: '#4a3228' },
  Maple: { base: '#d4a96a', grain: '#c49555' },
  Cherry: { base: '#9b4722', grain: '#873d1c' },
  Birch: { base: '#e8d5b7', grain: '#d4c0a0' },
  Pine: { base: '#deb887', grain: '#c9a36e' },
}
