# difuser

A visual builder for acoustic sound diffuser panels. Design custom panels made of angled wooden blocks, see a real-time 3D preview, and share your designs via URL.

**Live demo**: [dannyfiresnake.github.io/difuser](https://dannyfiresnake.github.io/difuser/)

## What it does

Acoustic diffuser panels scatter sound waves in random directions to improve room acoustics. Each panel is a grid of wooden blocks with angled front faces, mounted in a frame on a wall or ceiling.

difuser lets you customize every aspect of the panel and see a real-time 3D rendering as you work:

- **Panel grid** — set the number of block columns and rows
- **Block dimensions** — width, height, minimum depth, and gap spacing
- **Cut angles** — control the min/max angle range (0-45 degrees in 5-degree steps) with a randomizable seed
- **Materials** — wood species, finish, and color modes (natural, solid, gradient with steps/dither, random)
- **Frame & backplate** — independent surface options: wood, metal, brushed aluminum, or painted wood
- **Sharing** — generate a compressed URL that anyone can open to view your design

## Running locally

```bash
npm install
npm run dev
```

## Tech stack

Vue 3, TypeScript, Vite, Three.js, Pinia, Vue Router. No backend — projects are stored in localStorage, sharing is done via compressed URL parameters.

## Docs

- [SPEC.md](SPEC.md) — product specification and parameter details
- [ARCHITECTURE.md](ARCHITECTURE.md) — technical architecture and rendering pipeline
- [AGENTS.md](AGENTS.md) — codebase guide for AI agents and contributors
