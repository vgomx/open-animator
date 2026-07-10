import type { Project } from '@/editor/types'
import { exportAnimatedSvg } from '@/io/svg-export'
import { DEFAULT_EXPORT_OPTIONS } from '@/io/export-options'

export function exportReactComponent(project: Project): string {
  const svg = exportAnimatedSvg(project, DEFAULT_EXPORT_OPTIONS)
    .replace('<?xml version="1.0" encoding="UTF-8"?>\n', '')
    .trim()

  return `export function AnimatedArtboard() {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: \`${svg.replace(/`/g, '\\`')}\`,
      }}
    />
  )
}
`
}

export function downloadReactComponent(project: Project, filename = 'AnimatedArtboard.tsx'): void {
  const blob = new Blob([exportReactComponent(project)], { type: 'text/typescript' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
