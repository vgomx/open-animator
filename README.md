# Open Animator

Browser-based SVG animator and editor — a portfolio side project for authoring simple shape animations with keyframes.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Radix UI** via **shadcn/ui** (Nova preset)
- **Tailwind CSS v4**
- **Zustand** for editor state
- **lottie-web** for Lottie preview
- **Vitest** + **jsdom** for unit tests

## Getting started

```bash
npm install
npm run dev
```

Open the local URL from Vite (usually `http://localhost:5173`).

**Live demo:** [vgomx.github.io/open-animator](https://vgomx.github.io/open-animator/)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck, generate brand assets, and production build |
| `npm run generate:brand-assets` | Regenerate favicons and Open Graph image from SVG sources |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | Run oxlint |

## Features

### Editor shell
- Light, dark, and system theme toggle with frosted-glass side panels, toolbar, layers, properties, and timeline
- Canvas rulers (top + left) with guide dragging, snapping, and full-bleed glass chrome
- Floating tool palette at the bottom of the canvas
- Canvas context menu with common actions and shortcuts
- Collapsible layers and properties panels (`[` / `]`)

### Tools
- **Select** — move, resize, rotate, multi-select (Shift+click, marquee)
- **Hand** — pan the viewport
- **Zoom** — click to zoom in/out; trackpad pinch-to-zoom and two-finger pan
- **Node** — edit path points and shape corners
- **Pen** — draw vector paths with bezier handles
- **Rect / Ellipse / Text** — create shapes on canvas

### Design & animation
- Edit position, size, fill, stroke, opacity, rotation, and scale
- Figma-style color picker with hex input, presets, and eyedropper (screen or canvas sampling)
- Custom number inputs with label scrub and steppers
- Keyframe `x`, `y`, `rotation`, `opacity`, `scale`, `fill`, and `stroke` with easing segments
- Custom cubic-bezier easing editor for fine-tuned motion curves
- Record mode (auto-keyframe on property change)
- Playback with loop toggle; click-to-scrub timeline
- Layer groups — select and move grouped layers together on canvas; collapsible groups in layers panel
- Multi-select property editing with mixed-value UI
- Pen bezier curves (click-drag), text inline edit, Alt+drag duplicate, copy/paste style, copy/paste layers
- Onion skin controls — frame count, opacity, and tint for previous/next frames

### Workflow
- Undo/redo (`⌘Z` / `⌘⇧Z`)
- Pan viewport (Space + drag or middle mouse); fit artboard to screen
- Save/open project JSON (autosaved to `localStorage`, v2 format with migration from v1)
- Export static SVG, animated SVG, **HTML animation**, **WebM video**, **GIF**, CSS keyframes, React component, and **Lottie JSON** (subset, including paths)
- Import SVG — merge shapes into the current project or open as a new project
- Import **HTML animation** files (CSS-animated SVG exported by Open Animator)
- Import Lottie JSON (limited subset) and preview with lottie-web

### SVG import support

Supported on import:

- Shapes: `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path` (including arc `A`/`a` commands), `text`
- Groups: nested `<g>` elements (flattened into layers)
- Styles: inline `fill`, `stroke`, `stroke-width`, `opacity`; basic `<style>` blocks with `.className` selectors
- Transforms: `translate`, `rotate`, `scale`, `matrix()`
- SMIL animation: `animateTransform` and matrix-based path motion
- Gradients and masks from imported SVG defs
- Artboard: `viewBox` or `width` / `height`

Not yet supported: complex CSS selectors, preserved group hierarchy, and full Illustrator/Figma fidelity.

### Export

- Static SVG, **animated SVG** (SMIL), HTML animation, WebM, GIF, CSS keyframes, React component, and Lottie JSON (subset)

## Project structure

```text
src/
  components/
    canvas/       # SVG stage, tools, selection, rulers, context menu
    lottie/       # Lottie preview dialog
    shell/        # Editor layout, toolbar, panels, shortcuts, theme
    timeline/     # Playhead and keyframe tracks
    ui/           # shadcn/Radix primitives
  editor/
    animation.ts  # Keyframe interpolation and easing
    easing.ts     # Easing presets and cubic-bezier sampling
    history.ts    # Undo/redo snapshots
    scene.ts      # Layer/project helpers
    store.ts      # Zustand editor store
    tools.ts      # Canvas tool definitions
    types.ts      # Core types
  io/
    lottie.ts     # Lottie import/export (subset)
    migrate.ts    # Project version migration
    project.ts    # JSON save/load
    embed-export.ts # Standalone HTML animation export
    html-import.ts  # HTML animation import (CSS keyframes)
    svg-export.ts # Static and animated SVG export
    svg-import.ts # SVG import into layers/projects
```

## License

MIT — see [LICENSE](LICENSE).
