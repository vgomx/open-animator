import type { Project } from '@/editor/types'
import balloonSvg from '@/io/fixtures/hot-air-balloon-parallax.svg?raw'
import { importSvg, svgImportToProject, type SvgImportResult } from '@/io/svg-import'

export { balloonSvg }

let cachedImport: SvgImportResult | undefined
let cachedProject: Project | undefined

export function getBalloonSvgImport(): SvgImportResult {
  if (!cachedImport) {
    const imported = importSvg(balloonSvg)
    if (!imported) {
      throw new Error('Failed to import balloon SVG fixture')
    }
    cachedImport = imported
  }

  return cachedImport
}

export function cloneBalloonSvgImport(): SvgImportResult {
  return structuredClone(getBalloonSvgImport())
}

export function getBalloonProject(): Project {
  if (!cachedProject) {
    cachedProject = svgImportToProject(getBalloonSvgImport())
  }

  return cachedProject
}

export function cloneBalloonProject(): Project {
  return structuredClone(getBalloonProject())
}
