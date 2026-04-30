# AGENTS.md

## Project Overview

**difuser** is a browser-based visual builder for acoustic sound diffuser panels. Users design custom panels made of angled wooden blocks arranged in a grid within a frame, and see a real-time 3D preview as they adjust parameters.

## Tech Stack

- **Vue 3** + TypeScript + Vite
- **Three.js** for real-time 3D rendering
- **Pinia** for state management
- **Vue Router** for navigation
- **localStorage** for project persistence (no backend)
- **GitHub Pages** for hosting

## Key Concepts

- **Wedge blocks**: Each block is a rectangular prism with a flat back and an angled front face (the "cut"). The cut angle (0–45 degrees, in 5-degree steps) and cut direction (random 360-degree rotation) determine the wedge shape. A `minBlockDepth` parameter ensures the thin side is never less than a specified thickness.
- **Seeded random**: All randomness uses a deterministic PRNG (mulberry32) so that the same seed always produces the same layout. The seed is stored in the project config.
- **Surface materials**: Blocks, frame, and backplate each have independent material settings. Surface types include Wood (with species + finish), Metal (with color), Brushed Aluminum, and Painted Wood (with color + finish).
- **Share links**: Project configs are serialized to JSON, compressed with deflate-raw, base64url-encoded, and embedded in a URL query parameter (`?v1=...`). Opening a share link loads the project as an unsaved draft — viewable and editable but not persisted until the user clicks "Save to My Projects".

## File Structure

```
src/
  components/
    builder/         # Builder-specific components
      ControlPanel.vue   # Left sidebar with all parameter controls
    ui/              # Reusable UI primitives
      SliderInput.vue
      SelectInput.vue
      ColorInput.vue
      SectionCollapsible.vue
      SurfaceMaterialInput.vue
  composables/
    useThreeScene.ts     # Three.js scene setup, rendering, wedge geometry
    useSeededRandom.ts   # Deterministic PRNG
    useShare.ts          # Compress/decompress share URLs
  router/
    index.ts
  stores/
    projects.ts          # Pinia store, localStorage persistence
  types/
    index.ts             # All TypeScript types, defaults, wood color palette
  views/
    HomeView.vue         # Project list, create/delete
    BuilderView.vue      # Main builder with 3D viewport
    ShareView.vue        # Share link import handler
```

## Development

```bash
npm install
npm run dev       # Dev server with HMR
npm run build     # Production build
```

## Conventions

- Panel dimensions are specified in block count (columns x rows), not millimeters.
- All numeric parameters in the config are in millimeters except angles (degrees) and counts.
- The 3D scene uses a scale factor of 0.01 (mm to scene units).
- Frame depth of 0 means no frame.
