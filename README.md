# Open Animator

Browser-based SVG animator and editor — a portfolio side project for authoring simple shape animations with keyframes.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Radix UI** via **shadcn/ui** (Nova preset)
- **Tailwind CSS v4**
- **Zustand** for editor state
- **lottie-web** for Lottie preview
- **Vitest** for unit tests

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
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | Run oxlint |

## Features

### Editor shell
- Dark editor shell with frosted-glass side panels, toolbar, layers, properties, and timeline
- Canvas rulers (top + left) with guide dragging, snapping, and full-bleed glass chrome
- Floating tool palette at the bottom of the canvas
- Canvas context menu with common actions and shortcuts

### Tools
- **Select** — move, resize, rotate, multi-select (Shift+click, marquee)
- **Hand** — pan the viewport
- **Zoom** — click to zoom in/out
- **Node** — edit path points and shape corners
- **Pen** — draw vector paths
- **Rect / Ellipse / Text** — create shapes on canvas

### Design & animation
- Edit position, size, fill, stroke, opacity, rotation, and scale
- Figma-style color picker with hex input, presets, and eyedropper (screen or canvas sampling)
- Custom number inputs with label scrub and steppers
- Keyframe `x`, `y`, `rotation`, `opacity`, `scale`, `fill`, and `stroke` with easing segments
- Record mode (auto-keyframe on property change)
- Playback with loop toggle; click-to-scrub timeline
- Layer groups — select and move grouped layers together on canvas

### Workflow
- Undo/redo (`⌘Z` / `⌘⇧Z`)
- Pan viewport (Space + drag or middle mouse); fit artboard to screen
- Save/open project JSON (autosaved to `localStorage`, v2 format with migration from v1)
- Export static SVG, **WebM video**, and **Lottie JSON** (subset, including paths)
- Import Lottie JSON (limited subset) and preview with lottie-web

## Project structure

```text
src/
  components/
    canvas/       # SVG stage, tools, selection, rulers, context menu
    lottie/       # Lottie preview dialog
    shell/        # Editor layout, toolbar, panels, shortcuts
    timeline/     # Playhead and keyframe tracks
    ui/           # shadcn/Radix primitives
  editor/
    animation.ts  # Keyframe interpolation and easing
    history.ts    # Undo/redo snapshots
    scene.ts      # Layer/project helpers
    store.ts      # Zustand editor store
    tools.ts      # Canvas tool definitions
    types.ts      # Core types
  io/
    lottie.ts     # Lottie import/export (subset)
    migrate.ts    # Project version migration
    project.ts    # JSON save/load
    svg-export.ts # Static SVG and WebM export
```

## License

MIT — see [LICENSE](LICENSE).
