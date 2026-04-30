# Product Specification

## What is difuser?

difuser is a visual builder for acoustic sound diffuser panels. These panels are mounted on walls and ceilings to improve room acoustics by scattering sound waves in random directions.

## The Product

A **diffuser panel** consists of:

1. **Backplate** — a flat backing board
2. **Blocks** — a tightly packed grid of wooden blocks, each with a flat back and an angled front face (a wedge cut). The varying angles cause incoming sound waves to reflect in many different directions rather than bouncing straight back
3. **Frame** (optional) — a border surrounding the blocks

## Configurable Parameters

### Panel Grid
- **Columns** (1–40 blocks) — number of blocks wide
- **Rows** (1–40 blocks) — number of blocks tall

### Block Dimensions
- **Width** (10–100mm) — horizontal size of each block
- **Height** (10–100mm) — vertical size of each block (can be locked to width)
- **Min Depth** (2–60mm) — minimum thickness at the thinnest edge of the wedge cut
- **Gap** (0–20mm) — spacing between adjacent blocks

### Angle Settings
- **Min Angle** (0–45 degrees, 5-degree steps) — shallowest cut angle in the random range
- **Max Angle** (0–45 degrees, 5-degree steps) — steepest cut angle in the random range
- **Random Seed** (0–9999) — deterministic seed for reproducible randomization

The cut angle determines how steep the wedge is. The cut direction (which edge is tall vs short) is fully randomized (0–360 degrees). At 0 degrees, the block is a flat slab. At 45 degrees, one edge reaches max slope.

Each block's total depth = minDepth on the thin side, minDepth + slope on the thick side.

### Block Materials
- **Wood Type** — Oak, Walnut, Maple, Cherry, Birch, Pine
- **Finish** — Natural, Matte, Satin, Gloss
- **Color Mode**:
  - *Natural wood* — color varies slightly per block based on wood type
  - *Solid color* — uniform color for all blocks
  - *Gradient* — interpolates between two colors across the grid, with configurable steps (2–40) and dither (0–100%)
  - *Random* — random hue per block

### Backplate & Frame Surface Types
Both the backplate and frame support the same surface options:
- **Wood** — wood type + finish (same options as blocks)
- **Metal** — custom color with metallic sheen
- **Brushed Aluminum** — fixed silver metallic finish
- **Painted Wood** — custom color + paint finish (Matte/Satin/Gloss)

### Frame Geometry
- **Frame Depth** (0–200+minDepth mm) — how far the frame protrudes. 0 = no frame
- **Frame Width** (5–60mm) — thickness of the frame border
- **Frame Offset** (0–30mm) — gap between the inner edge of the frame and the outermost blocks

## Features

### Project Management
- Create named projects
- List saved projects with preview, dimensions, material info, and date
- Delete projects with confirmation
- All data stored in browser localStorage

### Visual Builder
- Real-time 3D rendering with orbit camera controls
- Left sidebar with collapsible parameter sections
- Header shows total panel dimensions (mm) and block count
- Editable project name
- Auto-saves on every change

### Sharing
- Share button generates a compressed URL containing the full project config
- Opening a share link loads the project as an unsaved draft — fully viewable and editable
- A "Save to My Projects" button in the header persists the draft to localStorage
- Navigating away without saving discards the draft
- No account or server required — everything is in the URL
