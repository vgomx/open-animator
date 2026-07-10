import { lazy, Suspense, useState } from 'react'

import {
  CircleDot,
  Copy,
  Download,
  Expand,
  FolderOpen,
  Info,
  Keyboard,
  Layers2,
  Magnet,
  MoreHorizontal,
  Pause,
  Play,
  RectangleHorizontal,
  Redo2,
  Repeat,
  Ruler,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Video,
  Wand2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { AboutDialog } from '@/components/shell/AboutDialog'
import { AcknowledgmentsDialog } from '@/components/shell/AcknowledgmentsDialog'
import { ExportOptionsDialog } from '@/components/shell/ExportOptionsDialog'
import { PresetsDialog } from '@/components/shell/PresetsDialog'
import { TemplatesDialog } from '@/components/shell/TemplatesDialog'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ToolbarDivider } from '@/components/ui/toolbar-divider'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import type { ExportOptions } from '@/io/export-options'
import { downloadProject, openProjectFile } from '@/io/project'
import { downloadLottie, exportLottie, openLottieFile } from '@/io/lottie'
import {
  downloadAnimatedSvg,
  downloadStaticSvg,
  downloadWebm,
} from '@/io/svg-export'
import { downloadGif } from '@/io/gif-export'
import { downloadCssKeyframes } from '@/io/css-export'
import { downloadReactComponent } from '@/io/react-export'
import { downloadEmbedHtml } from '@/io/embed-export'
import { dismissToast, showToast, updateToast } from '@/lib/toast'

const LottieDialog = lazy(() =>
  import('@/components/lottie/LottieDialog').then((module) => ({
    default: module.LottieDialog,
  })),
)

type ExportKind = 'static-svg' | 'animated-svg' | 'webm' | 'gif'

type ToolbarProps = {
  onOpenShortcuts?: () => void
}

export function Toolbar({ onOpenShortcuts }: ToolbarProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [acknowledgmentsOpen, setAcknowledgmentsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [exportKind, setExportKind] = useState<ExportKind | null>(null)
  const [lottiePreviewOpen, setLottiePreviewOpen] = useState(false)
  const [lottiePreviewData, setLottiePreviewData] = useState<object | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const project = useEditorStore((state) => state.project)
  const playbackState = useEditorStore((state) => state.playbackState)
  const loop = useEditorStore((state) => state.loop)
  const recordMode = useEditorStore((state) => state.recordMode)
  const canUndo = useEditorStore((state) => state.history.past.length > 0)
  const canRedo = useEditorStore((state) => state.history.future.length > 0)
  const zoom = useEditorStore((state) => state.zoom)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const duplicateSelectedLayer = useEditorStore((state) => state.duplicateSelectedLayer)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const toggleLoop = useEditorStore((state) => state.toggleLoop)
  const toggleRecordMode = useEditorStore((state) => state.toggleRecordMode)
  const undo = useEditorStore((state) => state.undo)
  const redo = useEditorStore((state) => state.redo)
  const setZoom = useEditorStore((state) => state.setZoom)
  const fitToScreen = useEditorStore((state) => state.fitToScreen)
  const resetViewport = useEditorStore((state) => state.resetViewport)
  const zoomToSelection = useEditorStore((state) => state.zoomToSelection)
  const setProject = useEditorStore((state) => state.setProject)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const showRulers = useEditorStore((state) => state.showRulers)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled)
  const toggleShowRulers = useEditorStore((state) => state.toggleShowRulers)
  const toggleOnionSkinEnabled = useEditorStore((state) => state.toggleOnionSkinEnabled)

  const isPlaying = playbackState === 'playing'

  const handleExport = async (options: ExportOptions) => {
    if (!exportKind) {
      return
    }

    if (exportKind === 'static-svg') {
      downloadStaticSvg(project, 'artboard.svg', options)
      return
    }

    if (exportKind === 'animated-svg') {
      downloadAnimatedSvg(project, 'animation.svg', options)
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
        await downloadGif(project, 'animation.gif', options)
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
      await downloadWebm(project, 'animation.webm', options)
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
        : {
            title: 'Export static SVG',
            description: 'Choose scale and background for the current frame.',
            confirmLabel: 'Export SVG',
          }

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <span className="px-2 text-sm font-semibold tracking-tight">Open Animator</span>
        <ToolbarDivider />
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
          <ZoomOut className="size-4 text-muted-foreground" />
          <Slider
            className="w-28"
            min={0.25}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={(value) => setZoom(value[0] ?? 1)}
          />
          <ZoomIn className="size-4 text-muted-foreground" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  const viewport = document.querySelector('[data-stage-viewport]')
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
                  const viewport = document.querySelector('[data-stage-viewport]')
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
          <Button variant="ghost" size="sm" onClick={resetViewport}>
            100%
          </Button>
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={onionSkinEnabled ? 'secondary' : 'ghost'}
                size="icon-sm"
                onClick={toggleOnionSkinEnabled}
              >
                <Layers2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{onionSkinEnabled ? 'Onion skin on' : 'Onion skin off'}</TooltipContent>
          </Tooltip>
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
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTemplatesOpen(true)}>
                <Sparkles />
                Example projects
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenShortcuts?.()}>
                <Keyboard />
                Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAboutOpen(true)}>
                <Info />
                About
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <TooltipContent>Open project</TooltipContent>
          </Tooltip>
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
              <DropdownMenuItem onClick={() => downloadEmbedHtml(project)}>
                <Download />
                Export HTML preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadLottie(project)}>
                <Download />
                Export Lottie JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setLottiePreviewData(exportLottie(project))
                  setLottiePreviewOpen(true)
                }}
              >
                <Play />
                Preview as Lottie
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const imported = await openLottieFile()
                  if (imported) {
                    setProject(imported)
                  }
                }}
              >
                <FolderOpen />
                Import Lottie JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <AboutDialog
        open={aboutOpen}
        onOpenChange={setAboutOpen}
        onOpenAcknowledgments={() => {
          setAboutOpen(false)
          setAcknowledgmentsOpen(true)
        }}
      />
      <AcknowledgmentsDialog open={acknowledgmentsOpen} onOpenChange={setAcknowledgmentsOpen} />
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={setProject}
      />
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
      {lottiePreviewOpen ? (
        <Suspense fallback={null}>
          <LottieDialog
            open={lottiePreviewOpen}
            onOpenChange={setLottiePreviewOpen}
            animationData={lottiePreviewData}
          />
        </Suspense>
      ) : null}
    </>
  )
}
