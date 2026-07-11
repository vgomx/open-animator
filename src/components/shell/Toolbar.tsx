import { lazy, Suspense, useState } from 'react'

import {
  CircleDot,
  Copy,
  Download,
  Expand,
  FileUp,
  FolderOpen,
  Magnet,
  PanelLeft,
  PanelRight,
  Pause,
  Play,
  RectangleHorizontal,
  Redo2,
  Repeat,
  Ruler,
  Save,
  Trash2,
  Undo2,
  Video,
  Wand2,
  ZoomIn,
} from 'lucide-react'

import { OnionSkinControls } from '@/components/shell/OnionSkinControls'
import { ZoomControls } from '@/components/shell/ZoomControls'
import { ExportOptionsDialog } from '@/components/shell/ExportOptionsDialog'
import { PresetsDialog } from '@/components/shell/PresetsDialog'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToolbarDivider } from '@/components/ui/toolbar-divider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import type { ExportOptions } from '@/io/export-options'
import { downloadProject, openProjectFile } from '@/io/project'
import { downloadLottie, exportLottie, readLottieFromFile } from '@/io/lottie'
import {
  createImportLayerIds,
  getSvgImportSummary,
  readSvgImportFromFile,
  svgImportToProject,
  type SvgImportResult,
} from '@/io/svg-import'
import {
  downloadAnimatedSvg,
  downloadStaticSvg,
  downloadWebm,
} from '@/io/svg-export'
import { downloadGif } from '@/io/gif-export'
import { downloadCssKeyframes } from '@/io/css-export'
import { downloadReactComponent } from '@/io/react-export'
import { downloadAnimatedHtml } from '@/io/embed-export'
import { readHtmlImportFromFile } from '@/io/html-import'
import { dismissToast, showToast, updateToast } from '@/lib/toast'

const LottieDialog = lazy(() =>
  import('@/components/lottie/LottieDialog').then((module) => ({
    default: module.LottieDialog,
  })),
)

type ExportKind = 'static-svg' | 'animated-svg' | 'html' | 'webm' | 'gif'

const IMPORT_INPUT_CLASS = 'sr-only'

function resetFileInput(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement | null
  if (input) {
    input.value = ''
  }
}

export function Toolbar() {
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [exportKind, setExportKind] = useState<ExportKind | null>(null)
  const [lottiePreviewOpen, setLottiePreviewOpen] = useState(false)
  const [lottiePreviewData, setLottiePreviewData] = useState<object | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const project = useEditorStore((state) => state.project)
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId)
  const playbackState = useEditorStore((state) => state.playbackState)
  const loop = useEditorStore((state) => state.loop)
  const recordMode = useEditorStore((state) => state.recordMode)
  const canUndo = useEditorStore((state) => state.history.past.length > 0)
  const canRedo = useEditorStore((state) => state.history.future.length > 0)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const toggleLoop = useEditorStore((state) => state.toggleLoop)
  const toggleRecordMode = useEditorStore((state) => state.toggleRecordMode)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const fitToScreen = useEditorStore((state) => state.fitToScreen)
  const zoomToSelection = useEditorStore((state) => state.zoomToSelection)
  const setProject = useEditorStore((state) => state.setProject)
  const importSvgLayers = useEditorStore((state) => state.importSvgLayers)
  const showLayersPanel = useEditorStore((state) => state.showLayersPanel)
  const showPropertiesPanel = useEditorStore((state) => state.showPropertiesPanel)
  const toggleLayersPanel = useEditorStore((state) => state.toggleLayersPanel)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const showRulers = useEditorStore((state) => state.showRulers)
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled)
  const toggleShowRulers = useEditorStore((state) => state.toggleShowRulers)

  const isPlaying = playbackState === 'playing'

  const getStageViewportRect = () => {
    const viewport = document.querySelector('[data-stage-viewport]')
    return viewport?.getBoundingClientRect()
  }

  const fitCanvasToScreen = () => {
    const rect = getStageViewportRect()
    if (!rect) {
      return
    }

    fitToScreen(rect.width, rect.height)
  }

  const openImportedSvgProject = (imported: SvgImportResult) => {
    const summary = getSvgImportSummary(imported)
    const viewport = getStageViewportRect()

    setProject(svgImportToProject(imported), {
      fitViewport: viewport ?? undefined,
      clearLayerSelection: true,
    })
    if (summary.animatedLayerCount > 0) {
      useEditorStore.setState({ loop: true })
      useEditorStore.getState().setPlaybackState('playing')
    }
    if (!viewport) {
      requestAnimationFrame(fitCanvasToScreen)
    }
  }

  const notifySvgImportResult = (
    result: Awaited<ReturnType<typeof readSvgImportFromFile>>,
    mode: 'merge' | 'project',
  ) => {
    if (result.status === 'cancelled') {
      return
    }

    if (result.status === 'rejected') {
      showToast({
        title: 'Not an SVG file',
        description: `"${result.fileName}" is not a supported SVG. Choose a .svg file.`,
        variant: 'error',
      })
      return
    }

    const imported = result.value
    const summary = getSvgImportSummary(imported)

    if (imported.layers.length === 0) {
      showToast({
        title: 'SVG import failed',
        description: 'No supported shapes were found in that file.',
        variant: 'error',
      })
      return
    }

    if (mode === 'merge') {
      const artboardId =
        activeArtboardId ?? useEditorStore.getState().project.artboards[0]?.id ?? ''
      importSvgLayers(createImportLayerIds(imported.layers, artboardId), {
        artboard: imported.artboard,
        duration: imported.duration,
        importedSvg:
          Object.keys(imported.gradients).length > 0 || Object.keys(imported.masks).length > 0
            ? {
                gradients: imported.gradients,
                ...(Object.keys(imported.masks).length > 0 ? { masks: imported.masks } : {}),
              }
            : undefined,
      })
      requestAnimationFrame(fitCanvasToScreen)
    showToast({
      title: 'SVG imported',
      description: `Added ${summary.layerCount} layer${summary.layerCount === 1 ? '' : 's'}${summary.animatedLayerCount > 0 ? ` (${summary.animatedLayerCount} animated, ${summary.duration}s)` : ''}${summary.maskCount > 0 ? `, ${summary.maskCount} masks` : ''}.`,
      variant: 'success',
    })
      return
    }

    openImportedSvgProject(imported)
    showToast({
      title: 'SVG opened',
      description:
        summary.animatedLayerCount > 0
          ? `Loaded ${summary.layerCount} layers on ${imported.artboard.width}×${imported.artboard.height} (${summary.animatedLayerCount} animated, ${summary.duration}s${summary.maskCount > 0 ? `, ${summary.maskCount} masks` : ''}). Press Play to preview.`
          : `Loaded ${summary.layerCount} layer${summary.layerCount === 1 ? '' : 's'} on ${imported.artboard.width}×${imported.artboard.height}.`,
      variant: 'success',
    })
  }

  const handleSvgFileSelection = async (file: File | undefined, mode: 'merge' | 'project') => {
    if (!file) {
      return
    }

    notifySvgImportResult(await readSvgImportFromFile(file), mode)
  }

  const handleHtmlFileSelection = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const result = await readHtmlImportFromFile(file)
    if (result.status !== 'ok') {
      if (result.status === 'rejected') {
        if (result.reason === 'bundler') {
          showToast({
            title: 'JavaScript bundle not supported',
            description:
              'This HTML file animates with JavaScript at runtime (e.g. a map or interactive bundle). Open Animator imports CSS @keyframes or SVG SMIL only. Export animated SVG or Lottie from the source instead.',
            variant: 'error',
          })
        } else {
          showToast({
            title: 'Not an HTML file',
            description: `"${result.fileName}" is not a supported HTML animation. Choose a .html or .htm file.`,
            variant: 'error',
          })
        }
      }
      return
    }

    setProject(result.value)
    requestAnimationFrame(fitCanvasToScreen)
    showToast({
      title: 'HTML animation opened',
      description: `Loaded ${result.value.layers.length} animated layer${result.value.layers.length === 1 ? '' : 's'} as a new project.`,
      variant: 'success',
    })
  }

  const handleLottieFileSelection = async (file: File | undefined) => {
    if (!file) {
      return
    }

    const imported = await readLottieFromFile(file)
    if (!imported) {
      showToast({
        title: 'Lottie import failed',
        description: `"${file.name}" is not a valid Lottie JSON file.`,
        variant: 'error',
      })
      return
    }

    setProject(imported)
    requestAnimationFrame(fitCanvasToScreen)
    showToast({
      title: 'Lottie opened',
      description: 'Loaded animation as a new project.',
      variant: 'success',
    })
  }

  const handleExport = async (options: ExportOptions) => {
    if (!exportKind) {
      return
    }

    const artboardId = activeArtboardId ?? undefined

    if (exportKind === 'static-svg') {
      downloadStaticSvg(project, 'artboard.svg', options, artboardId)
      return
    }

    if (exportKind === 'animated-svg') {
      downloadAnimatedSvg(project, 'animation.svg', options, artboardId)
      return
    }

    if (exportKind === 'html') {
      downloadAnimatedHtml(project, 'animation.html', options, artboardId)
      return
    }

    if (exportKind === 'gif') {
      setIsExporting(true)
      const toastId = showToast({
        title: 'Exporting GIF',
        description: 'Rendering animation frames…',
        variant: 'loading',
      })
      try {
        await downloadGif(project, 'animation.gif', options, artboardId)
        updateToast(toastId, {
          title: 'GIF exported',
          description: 'Your download should start shortly.',
          variant: 'success',
        })
        window.setTimeout(() => dismissToast(toastId), 4000)
      } catch (error) {
        updateToast(toastId, {
          title: 'GIF export failed',
          description:
            error instanceof Error ? error.message : 'Something went wrong while exporting.',
          variant: 'error',
        })
      } finally {
        setIsExporting(false)
      }
      return
    }

    setIsExporting(true)
    const toastId = showToast({
      title: 'Exporting WebM',
      description: 'Rendering animation frames…',
      variant: 'loading',
    })

    try {
      await downloadWebm(project, 'animation.webm', options, artboardId)
      updateToast(toastId, {
        title: 'WebM exported',
        description: 'Your download should start shortly.',
        variant: 'success',
      })
      window.setTimeout(() => dismissToast(toastId), 4000)
    } catch (error) {
      updateToast(toastId, {
        title: 'WebM export failed',
        description:
          error instanceof Error ? error.message : 'Something went wrong while exporting.',
        variant: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const exportDialogCopy =
    exportKind === 'gif'
      ? {
          title: 'Export GIF',
          description: 'Choose frame rate, scale, and background for the GIF export.',
          confirmLabel: 'Export GIF',
        }
      : exportKind === 'webm'
        ? {
            title: 'Export WebM video',
            description: 'Choose frame rate, scale, and background for the video export.',
            confirmLabel: 'Export WebM',
          }
        : exportKind === 'animated-svg'
          ? {
              title: 'Export animated SVG',
              description: 'Choose scale and background for the CSS-animated SVG export.',
              confirmLabel: 'Export SVG',
            }
          : exportKind === 'html'
            ? {
                title: 'Export HTML animation',
                description: 'Choose scale and background for the standalone HTML animation file.',
                confirmLabel: 'Export HTML',
              }
            : {
                title: 'Export static SVG',
                description: 'Choose scale and background for the current frame.',
                confirmLabel: 'Export SVG',
              }

  return (
    <>
      <input
        id="import-svg-merge"
        type="file"
        className={IMPORT_INPUT_CLASS}
        onChange={(event) => {
          void handleSvgFileSelection(event.target.files?.[0], 'merge')
          event.target.value = ''
        }}
      />
      <input
        id="import-svg-project"
        type="file"
        className={IMPORT_INPUT_CLASS}
        onChange={(event) => {
          void handleSvgFileSelection(event.target.files?.[0], 'project')
          event.target.value = ''
        }}
      />
      <input
        id="import-html-animation"
        type="file"
        className={IMPORT_INPUT_CLASS}
        onChange={(event) => {
          void handleHtmlFileSelection(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        id="import-lottie-json"
        type="file"
        accept="application/json,.json"
        className={IMPORT_INPUT_CLASS}
        onChange={(event) => {
          void handleLottieFileSelection(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => setPresetsOpen(true)}>
                <Wand2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Animation presets</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={removeSelectedLayer}>
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete selected layer</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={duplicateSelectedLayer}>
                <Copy />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Duplicate layer (⌘D)</TooltipContent>
          </Tooltip>
        </div>

        <ToolbarDivider />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={!canUndo} onClick={undo}>
                <Undo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" disabled={!canRedo} onClick={redo}>
                <Redo2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={recordMode ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleRecordMode}
              >
                <CircleDot />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {recordMode ? 'Recording keyframes on change' : 'Record mode off'}
            </TooltipContent>
          </Tooltip>
        </div>

        <ToolbarDivider />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  if (isPlaying) {
                    setPlaybackState('paused')
                    return
                  }

                  setPlaybackState('playing')
                }}
              >
                {isPlaying ? <Pause /> : <Play />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isPlaying ? 'Pause' : 'Play'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={loop ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleLoop}
              >
                <Repeat />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle loop</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentTime(0)
              setPlaybackState('idle')
            }}
          >
            Reset
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ZoomControls />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const viewport = document.querySelector('[data-canvas-viewport]')
                  if (viewport) {
                    zoomToSelection(viewport.clientWidth, viewport.clientHeight)
                  }
                }}
              >
                <ZoomIn />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom to selection</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const viewport = document.querySelector('[data-canvas-viewport]')
                  if (viewport) {
                    fitToScreen(viewport.clientWidth, viewport.clientHeight)
                  }
                }}
              >
                <Expand />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fit artboard to screen</TooltipContent>
          </Tooltip>
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showLayersPanel ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleLayersPanel}
              >
                <PanelLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle layers panel</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showPropertiesPanel ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={togglePropertiesPanel}
              >
                <PanelRight />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle properties panel</TooltipContent>
          </Tooltip>
          <OnionSkinControls />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={snapEnabled ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleSnapEnabled}
              >
                <Magnet />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{snapEnabled ? 'Snapping on' : 'Snapping off'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showRulers ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleShowRulers}
              >
                <Ruler />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showRulers ? 'Hide rulers' : 'Show rulers'}</TooltipContent>
          </Tooltip>
          <ToolbarDivider />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={() => downloadProject(project)}>
                <Save />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save project JSON</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={async () => {
                  const nextProject = await openProjectFile()
                  if (nextProject) {
                    setProject(nextProject)
                  }
                }}
              >
                <FolderOpen />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open project JSON</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <FileUp />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Import SVG, HTML, or Lottie</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onPointerDown={(event) => {
                  event.preventDefault()
                  resetFileInput('import-svg-merge')
                  document.getElementById('import-svg-merge')?.click()
                }}
              >
                <FolderOpen />
                Import SVG into project
              </DropdownMenuItem>
              <DropdownMenuItem
                onPointerDown={(event) => {
                  event.preventDefault()
                  resetFileInput('import-svg-project')
                  document.getElementById('import-svg-project')?.click()
                }}
              >
                <FolderOpen />
                Open SVG as new project
              </DropdownMenuItem>
              <DropdownMenuItem
                onPointerDown={(event) => {
                  event.preventDefault()
                  resetFileInput('import-html-animation')
                  document.getElementById('import-html-animation')?.click()
                }}
              >
                <FolderOpen />
                Open HTML animation
              </DropdownMenuItem>
              <DropdownMenuItem
                onPointerDown={(event) => {
                  event.preventDefault()
                  resetFileInput('import-lottie-json')
                  document.getElementById('import-lottie-json')?.click()
                }}
              >
                <FolderOpen />
                Import Lottie JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <Download />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setExportKind('static-svg')}>
                <RectangleHorizontal />
                Export static SVG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportKind('animated-svg')}>
                <RectangleHorizontal />
                Export animated SVG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportKind('html')}>
                <RectangleHorizontal />
                Export HTML animation
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isExporting} onClick={() => setExportKind('webm')}>
                <Video />
                Export WebM video
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isExporting} onClick={() => setExportKind('gif')}>
                <Video />
                Export GIF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadCssKeyframes(project)}>
                <Download />
                Export CSS keyframes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadReactComponent(project)}>
                <Download />
                Export React component
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadLottie(project, 'animation.json', activeArtboardId ?? undefined)}>
                <Download />
                Export Lottie JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setLottiePreviewData(exportLottie(project, activeArtboardId ?? undefined))
                  setLottiePreviewOpen(true)
                }}
              >
                <Play />
                Preview as Lottie
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <PresetsDialog open={presetsOpen} onOpenChange={setPresetsOpen} />
      {exportKind ? (
        <ExportOptionsDialog
          open={exportKind !== null}
          onOpenChange={(open) => {
            if (!open) {
              setExportKind(null)
            }
          }}
          title={exportDialogCopy.title}
          description={exportDialogCopy.description}
          confirmLabel={exportDialogCopy.confirmLabel}
          onConfirm={handleExport}
        />
      ) : null}
      {lottiePreviewOpen && (
        <Suspense fallback={null}>
          <LottieDialog
            open={lottiePreviewOpen}
            onOpenChange={setLottiePreviewOpen}
            animationData={lottiePreviewData}
          />
        </Suspense>
      )}
    </>
  )
}
