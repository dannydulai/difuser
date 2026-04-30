# Architecture

## Application Flow

```
Home (/) ──> Builder (/builder/:id) ──> Home
                                          │
Share Link (/share?v1=...) ──> draft ──> Builder (/builder/draft)
                                           │
                                      Save ──> Builder (/builder/:id)
```

### Home View
- Reads project list from Pinia store (backed by localStorage)
- Create: prompts for name, creates project with default config, navigates to builder
- Delete: confirmation modal, removes from store

### Builder View
- Split layout: 320px sidebar (controls) + remaining space (Three.js viewport)
- Header bar: back button, project name (editable), total dimensions, block count, share button, brand
- All config changes auto-save to localStorage via Pinia watcher (except in draft mode)
- Draft mode (from share links): shows "SHARED" badge + "Save to My Projects" button. Edits are live but not persisted. Saving converts to a real project; navigating away discards

### Share View
- Reads `v1` query parameter
- Decodes and decompresses payload
- Stores as an in-memory draft in Pinia (not persisted to localStorage)
- Redirects to builder in draft mode (`/builder/draft`)

## State Management

Single Pinia store (`projects.ts`) holds all projects. A deep watcher serializes the entire project array to `localStorage` on every change. No debouncing — writes are synchronous and fast for the data sizes involved.

A separate `draft` ref holds shared-link projects in memory only. It is not watched by the persistence layer. The store provides `setDraft()`, `saveDraft()` (promotes to a real project), and `clearDraft()` methods. `getProject('draft')` returns the draft if it exists.

## 3D Rendering Pipeline

`useThreeScene` composable:
1. Creates WebGL renderer, scene, camera, orbit controls, and lighting
2. On config change (deep watch), tears down all meshes in the diffuser group and rebuilds
3. For each block: generates custom `BufferGeometry` via `createWedgeGeometry()` — 6 faces (back, front, 4 sides) with computed normals
4. Frame is 4 box geometries, backplate is a thin box
5. Materials are `MeshStandardMaterial` with physically-based properties (roughness, metalness) derived from the surface type config

### Wedge Geometry

Each block's front face is a tilted plane. For a given cut angle and cut rotation:
- Project each corner onto the cut direction vector
- Compute Z height: `minDepth + t * slopeHeight` where t goes from 0 (thin side) to 1 (thick side)
- `slopeHeight = 2 * maxProjection * tan(cutAngle)`

### Lighting
- Ambient (0.4) for base fill
- Key directional light (warm white, 1.8 intensity) from upper-right with 2048px shadow map
- Fill directional light (cool blue, 0.5) from left
- Rim directional light (warm, 0.6) from behind

## Share Link Encoding

```
Config → JSON → UTF-8 bytes → deflate-raw compress → base64url encode → URL param
```

Decoding reverses the process, with fallback for uncompressed payloads. The payload includes a version number (`v: 1`) for future format changes.

## Deployment

GitHub Actions workflow builds on push to `main`, copies `index.html` to `404.html` (SPA routing fallback for GitHub Pages), and deploys via `actions/deploy-pages`.
