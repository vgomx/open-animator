# Open Animator

[![Live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://vgomx.github.io/open-animator/)
[![CI](https://img.shields.io/github/actions/workflow/status/vgomx/open-animator/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/vgomx/open-animator/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/badge/status-beta-blue?style=flat-square)](CHANGELOG.md)

Browser-based SVG animator for authoring simple shape animations with keyframes. Portfolio side project by [Vitor Gomes](https://vitorgomes.design).

[Live demo](https://vgomx.github.io/open-animator/) · [Changelog](CHANGELOG.md) · [Report an issue](https://github.com/vgomx/open-animator/issues)

<p align="center">
  <img src="public/og-image.png" alt="Open Animator preview" width="720" />
</p>

## Tech stack

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-shadcn-161618?style=flat-square&logo=radixui&logoColor=white)](https://www.radix-ui.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5-443E38?style=flat-square)](https://zustand.docs.pmnd.rs/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=flat-square&logo=pwa&logoColor=white)](https://vite-pwa-org.netlify.app/)

Also uses **lottie-web** for Lottie preview, **oxlint** for linting, and **jsdom** in tests.

## Getting started

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (configured as `http://127.0.0.1:5173`).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Generate brand assets, typecheck, and production build |
| `npm run preview` | Preview the production build |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Run oxlint |
| `npm run generate:brand-assets` | Regenerate favicons and Open Graph image |

## Features

### Editor
- Light, dark, and system theme with frosted-glass chrome
- Canvas rulers, guides, snap, and floating tool palette
- Layers and properties panels, document tabs, and recent files
- Welcome screen, keyboard shortcuts, and settings

### Tools
- **Select** — move, resize, rotate, multi-select
- **Hand / Zoom** — pan and zoom (trackpad pinch supported)
- **Node / Pen** — path editing and bezier drawing
- **Rect / Ellipse / Text** — create shapes on canvas

### Animation
- Keyframes for transform, opacity, fill, and stroke with easing
- Custom cubic-bezier editor and record mode
- Timeline scrubbing, loop playback, and onion skin
- Layer groups with shared transform keyframes

### Import & export
- **Import:** SVG (shapes, groups, gradients, masks, SMIL), HTML animation, Lottie JSON (subset)
- **Export:** static SVG, animated SVG, HTML, WebM, GIF, CSS keyframes, React component, Lottie JSON (subset)

> Tip: in the live demo, open **File → Samples → Train Performance** for a layered SVG motion sample.

## Project structure

```text
src/
  components/   # Canvas, shell, timeline, and UI
  editor/       # Store, animation, tools, and types
  io/           # Import, export, and project persistence
  lib/          # App constants, preferences, and helpers
```

## Contributing

Issues and pull requests are welcome. Please:

1. Open an issue for larger changes when useful
2. Keep PRs focused
3. Run `npm run lint`, `npm run test`, and `npm run build` before opening a PR

CI runs build, lint, and tests on every pull request to `main`.

## License

MIT — see [LICENSE](LICENSE).
