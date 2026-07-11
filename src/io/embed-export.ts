import type { ExportOptions } from '@/io/export-options'
import { DEFAULT_EXPORT_OPTIONS } from '@/io/export-options'
import { getExportArtboard } from '@/editor/artboard-utils'
import type { Project } from '@/editor/types'
import { exportAnimatedSvg } from '@/io/svg-export'

export function exportAnimatedHtml(
  project: Project,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): string {
  const artboard = getExportArtboard(project, artboardId)
  const svg = exportAnimatedSvg(project, options, artboardId)
  const width = Math.round(artboard.width * options.scale)
  const pageBackground =
    options.background === 'transparent' ? '#0f172a' : options.backgroundColor

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Open Animator Export</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: ${pageBackground};
      font-family: system-ui, sans-serif;
    }
    .player {
      width: min(100vw - 32px, ${width}px);
    }
    .player svg {
      width: 100%;
      height: auto;
      display: block;
    }
    .controls {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
    }
    button {
      padding: 8px 12px;
      border-radius: 8px;
      border: 0;
      cursor: pointer;
      background: rgb(255 255 255 / 0.92);
      color: #111827;
      box-shadow: 0 8px 24px rgb(15 23 42 / 0.18);
    }
    @media (prefers-color-scheme: dark) {
      button {
        background: rgb(28 27 25 / 0.92);
        color: #f4f3f0;
      }
    }
  </style>
</head>
<body>
  <div class="controls">
    <button type="button" onclick="togglePlayback()">Play / Pause</button>
    <button type="button" onclick="restartPlayback()">Restart</button>
  </div>
  <div class="player" id="player">
    ${svg.replace('<?xml version="1.0" encoding="UTF-8"?>\n', '')}
  </div>
  <script>
    let playing = true

    function setPlaybackState(next) {
      playing = next
      document.querySelectorAll('style').forEach((style) => {
        style.textContent = style.textContent.replace(/animation-play-state:\\s*[^;]+;/g, '')
        style.textContent = style.textContent.replace(
          /(animation:[^;]+);/g,
          '$1; animation-play-state: ' + (playing ? 'running' : 'paused') + ';',
        )
      })
    }

    function togglePlayback() {
      setPlaybackState(!playing)
    }

    function restartPlayback() {
      const player = document.getElementById('player')
      if (!player) return
      const markup = player.innerHTML
      player.innerHTML = markup
      setPlaybackState(true)
    }
  </script>
</body>
</html>`
}

/** @deprecated Use exportAnimatedHtml */
export function exportEmbedHtml(project: Project): string {
  return exportAnimatedHtml(project, DEFAULT_EXPORT_OPTIONS)
}

export function downloadAnimatedHtml(
  project: Project,
  filename = 'animation.html',
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  artboardId?: string,
): void {
  const blob = new Blob([exportAnimatedHtml(project, options, artboardId)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/** @deprecated Use downloadAnimatedHtml */
export function downloadEmbedHtml(project: Project, filename = 'animation.html'): void {
  downloadAnimatedHtml(project, filename, DEFAULT_EXPORT_OPTIONS)
}
