import { createLayerFromShape } from '@/editor/scene'
import {
  buildLayersFromCssTracks,
  buildLayersFromCssTracksAsync,
  mergeAnimatedKeyframesIntoStaticLayers,
  parseCssKeyframeTracks,
  attachGroupAnimationsFromCss,
} from '@/io/css-keyframes'
import {
  isHtmlFile,
  looksLikeHtmlText,
  openFilePicker,
} from '@/io/file-picker'
import {
  expandSvgUses,
  importSvg,
  importSvgAsProject,
  parseShapeElement,
  svgImportToProject,
} from '@/io/svg-import'
import type { Project } from '@/editor/types'
import { waitForPaint, yieldToUi } from '@/lib/yield-to-ui'

export {
  applyCssTransformToShape,
  parseCssKeyframeTracks,
  type CssAnimationTrack,
  type CssKeyframeStep,
} from '@/io/css-keyframes'

export type HtmlImportStage = 'parsing' | 'expanding' | 'importing' | 'animating' | 'merging'

export type HtmlImportProgress = {
  stage: HtmlImportStage
  current?: number
  total?: number
}

export type HtmlImportOptions = {
  onProgress?: (progress: HtmlImportProgress) => void
}

function collectCssText(document: Document, svg: SVGSVGElement): string {
  const chunks: string[] = []

  for (const style of document.querySelectorAll('style')) {
    chunks.push(style.textContent ?? '')
  }

  for (const style of svg.querySelectorAll('style')) {
    chunks.push(style.textContent ?? '')
  }

  return chunks.join('\n')
}

export function computeHtmlImportProgress(progress: HtmlImportProgress): number {
  if (progress.stage === 'parsing') {
    return 8
  }

  if (progress.stage === 'expanding') {
    return 18
  }

  if (progress.stage === 'importing') {
    return 35
  }

  if (progress.stage === 'animating') {
    if (progress.total && progress.total > 0 && progress.current !== undefined) {
      return 35 + Math.round((progress.current / progress.total) * 55)
    }

    return 45
  }

  return 95
}

export function formatHtmlImportProgress(progress: HtmlImportProgress): string {
  if (progress.stage === 'parsing') {
    return 'Reading HTML…'
  }

  if (progress.stage === 'expanding') {
    return 'Expanding SVG references…'
  }

  if (progress.stage === 'importing') {
    return 'Importing artwork…'
  }

  if (progress.stage === 'animating') {
    if (progress.total && progress.total > 0 && progress.current !== undefined) {
      return `Building animations (${progress.current}/${progress.total})…`
    }

    return 'Building CSS animations…'
  }

  return 'Merging animated layers…'
}

export async function importHtmlAnimationAsync(
  raw: string,
  options?: HtmlImportOptions,
): Promise<Project | null> {
  options?.onProgress?.({ stage: 'parsing' })
  await waitForPaint()

  const document = new DOMParser().parseFromString(raw, 'text/html')
  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  options?.onProgress?.({ stage: 'expanding' })
  await yieldToUi()
  expandSvgUses(svg)

  const css = collectCssText(document, svg)
  const tracks = parseCssKeyframeTracks(css)

  if (tracks.size === 0) {
    options?.onProgress?.({ stage: 'importing' })
    await yieldToUi()
    return importSvgAsProject(svg.outerHTML, { staticOnly: true })
  }

  options?.onProgress?.({ stage: 'importing' })
  await waitForPaint()

  const staticImported = importSvg(svg.outerHTML)
  if (!staticImported) {
    return null
  }

  const baseProject = svgImportToProject(staticImported)
  const { layerGroups, promotedGroupClasses } = attachGroupAnimationsFromCss(
    svg,
    css,
    baseProject.layerGroups,
    Math.max(...[...tracks.values()].map((track) => track.duration), 0),
    parseShapeElement,
  )

  options?.onProgress?.({ stage: 'animating' })
  await yieldToUi()

  const { layers: animatedLayers, duration: cssDuration } = await buildLayersFromCssTracksAsync(
    svg,
    css,
    baseProject.artboards[0]!.id,
    {
      parseShape: parseShapeElement,
      createLayer: (shape, index, artboardId, name, keyframes) => ({
        ...createLayerFromShape(shape, index, artboardId, name),
        keyframes,
      }),
      onProgress: (current, total) => {
        options?.onProgress?.({ stage: 'animating', current, total })
      },
      skipGroupClasses: promotedGroupClasses,
    },
  )

  if (animatedLayers.length === 0) {
    return {
      ...baseProject,
      layerGroups,
    }
  }

  options?.onProgress?.({ stage: 'merging' })
  await yieldToUi()

  const resolvedDuration =
    cssDuration > 0 ? cssDuration : baseProject.duration > 0 ? baseProject.duration : 3

  return {
    ...baseProject,
    layerGroups,
    duration: resolvedDuration,
    loopOut: resolvedDuration,
    layers: mergeAnimatedKeyframesIntoStaticLayers(baseProject.layers, animatedLayers),
  }
}

export function importHtmlAnimation(raw: string): Project | null {
  const document = new DOMParser().parseFromString(raw, 'text/html')
  const svg = document.querySelector('svg')
  if (!svg) {
    return null
  }

  expandSvgUses(svg)

  const css = collectCssText(document, svg)
  const tracks = parseCssKeyframeTracks(css)

  if (tracks.size === 0) {
    return importSvgAsProject(svg.outerHTML, { staticOnly: true })
  }

  const staticImported = importSvg(svg.outerHTML)
  if (!staticImported) {
    return null
  }

  const baseProject = svgImportToProject(staticImported)
  const { layerGroups, promotedGroupClasses } = attachGroupAnimationsFromCss(
    svg,
    css,
    baseProject.layerGroups,
    Math.max(...[...tracks.values()].map((track) => track.duration), 0),
    parseShapeElement,
  )
  const { layers: animatedLayers, duration: cssDuration } = buildLayersFromCssTracks(
    svg,
    css,
    baseProject.artboards[0]!.id,
    {
      parseShape: parseShapeElement,
      createLayer: (shape, index, artboardId, name, keyframes) => ({
        ...createLayerFromShape(shape, index, artboardId, name),
        keyframes,
      }),
      skipGroupClasses: promotedGroupClasses,
    },
  )

  if (animatedLayers.length === 0) {
    return {
      ...baseProject,
      layerGroups,
    }
  }

  const resolvedDuration =
    cssDuration > 0 ? cssDuration : baseProject.duration > 0 ? baseProject.duration : 3

  return {
    ...baseProject,
    layerGroups,
    duration: resolvedDuration,
    loopOut: resolvedDuration,
    layers: mergeAnimatedKeyframesIntoStaticLayers(baseProject.layers, animatedLayers),
  }
}

export type OpenHtmlFileResult =
  | { status: 'cancelled' }
  | { status: 'rejected'; fileName: string; reason?: 'invalid' | 'bundler' }
  | { status: 'ok'; value: Project }

/** Expressive / portfolio bundler pages that unpack and animate via JavaScript at runtime. */
export function isJavaScriptBundlerHtml(raw: string): boolean {
  return (
    raw.includes('script[type="__bundler/manifest"]') ||
    raw.includes('script[type="__bundler/template"]') ||
    raw.includes('id="__bundler_thumbnail"')
  )
}

export async function readHtmlImportFromFile(
  file: File,
  options?: HtmlImportOptions,
): Promise<OpenHtmlFileResult> {
  try {
    const text = await file.text()
    if (!isHtmlFile(file) && !looksLikeHtmlText(text)) {
      return { status: 'rejected', fileName: file.name, reason: 'invalid' }
    }

    if (isJavaScriptBundlerHtml(text)) {
      return { status: 'rejected', fileName: file.name, reason: 'bundler' }
    }

    const value = await importHtmlAnimationAsync(text, options)
    if (!value) {
      return { status: 'rejected', fileName: file.name, reason: 'invalid' }
    }

    return { status: 'ok', value }
  } catch {
    return { status: 'rejected', fileName: file.name }
  }
}

export async function openHtmlFile(): Promise<OpenHtmlFileResult> {
  const picked = await openFilePicker({
    validateText: (text, file) => isHtmlFile(file) || looksLikeHtmlText(text),
  })

  if (picked.status === 'cancelled') {
    return { status: 'cancelled' }
  }

  if (picked.status === 'rejected') {
    return { status: 'rejected', fileName: picked.file.name }
  }

  return readHtmlImportFromFile(picked.file)
}
