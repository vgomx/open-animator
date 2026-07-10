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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run unit tests |
| `npm run lint` | Run oxlint |

## Features

- Dark editor shell with glass side panels, toolbar, layers, properties, and timeline
- Add rectangle / ellipse shapes; duplicate layers (`⌘D`)
- Edit position, size, fill, stroke, and opacity
- Canvas resize handles and drag-to-move selection
- Keyframe `x`, `y`, `opacity`, and `scale` with **linear**, **ease-in**, **ease-out**, and **ease-in-out** segments
- Record mode (auto-keyframe on property change)
- Playback with loop toggle; click-to-scrub timeline
- Undo/redo (`⌘Z` / `⌘⇧Z`)
- Pan viewport (Space + drag or middle mouse); fit artboard to screen
- Save/open project JSON (autosaved to `localStorage`, v2 format with migration from v1)
- Export static SVG, **WebM video**, and **Lottie JSON** (subset)
- Import Lottie JSON (limited subset) and preview with lottie-web

## Project structure

```text
src/
  components/
    canvas/       # SVG stage, shapes, selection overlay
    lottie/       # Lottie preview dialog
    shell/        # Editor layout, toolbar, panels, shortcuts
    timeline/     # Playhead and keyframe tracks
    ui/           # shadcn/Radix primitives
  editor/
    animation.ts  # Keyframe interpolation and easing
    history.ts    # Undo/redo snapshots
    scene.ts      # Layer/project helpers
    store.ts      # Zustand editor store
    types.ts      # Core types
  io/
    lottie.ts     # Lottie import/export (subset)
    migrate.ts    # Project version migration
    project.ts    # JSON save/load
    svg-export.ts # Static SVG and WebM export
```

## License

MIT — see [LICENSE](LICENSE).
