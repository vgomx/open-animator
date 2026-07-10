import type { Project } from '@/editor/types'
import { exportAnimatedSvg } from '@/io/svg-export'
import { DEFAULT_EXPORT_OPTIONS } from '@/io/export-options'

export function exportEmbedHtml(project: Project): string {
  const svg = exportAnimatedSvg(project, DEFAULT_EXPORT_OPTIONS)
  const width = project.artboard.width

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Open Animator Preview</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; }
    .player { width: min(100vw, ${width}px); }
    .player svg { width: 100%; height: auto; display: block; }
    button { position: fixed; top: 16px; right: 16px; padding: 8px 12px; border-radius: 8px; border: 0; cursor: pointer; }
  </style>
</head>
<body>
  <button type="button" onclick="toggle()">Play / Pause</button>
  <div class="player" id="player">
    ${svg.replace('<?xml version="1.0" encoding="UTF-8"?>\n', '')}
  </div>
  <script>
    let playing = true
    function toggle() {
      playing = !playing
      document.querySelectorAll('animate, animateTransform').forEach((node) => {
        node.beginElement()
        if (!playing) node.endElement()
      })
      document.querySelectorAll('style').forEach((style) => {
        style.textContent = style.textContent.replace(/running/g, playing ? 'running' : 'paused')
      })
    }
  </script>
</body>
</html>`
}

export function downloadEmbedHtml(project: Project, filename = 'animation-preview.html'): void {
  const blob = new Blob([exportEmbedHtml(project)], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
