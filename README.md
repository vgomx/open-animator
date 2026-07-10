# SVG Animator

Browser-based SVG animator and editor — a portfolio side project for authoring simple shape animations with keyframes.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Radix UI** via **shadcn/ui** (Nova preset)
- **Tailwind CSS v4**
- **Zustand** for editor state
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

## MVP features (current scaffold)

- Dark editor shell with toolbar, layers, properties, and timeline panels
- Add rectangle / ellipse shapes
- Edit position, size, fill, stroke, and opacity
- Keyframe `x`, `y`, `opacity`, and `scale` at the current playhead
- Linear interpolation playback with loop toggle
- Save/open project JSON (autosaved to `localStorage`)
- Export static SVG snapshot

## Project structure

```text
src/
  components/
    canvas/       # SVG stage and shape rendering
    shell/        # Editor layout, toolbar, panels
    timeline/     # Playhead and keyframe track
    ui/           # shadcn/Radix primitives
  editor/
    animation.ts  # Keyframe interpolation
    scene.ts      # Layer/project helpers
    store.ts      # Zustand editor store
    types.ts      # Core types
  io/
    project.ts    # JSON save/load
    svg-export.ts # Static SVG export
```

## Roadmap

- [ ] Undo/redo
- [ ] Resize handles on canvas
- [ ] Easing curves
- [ ] Animated export (GIF/WebM)
- [ ] Lottie playback and limited import/export

## License

MIT
