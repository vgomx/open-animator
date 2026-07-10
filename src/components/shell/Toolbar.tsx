import { lazy, Suspense, useState } from 'react'

import {
  Circle,
  CircleDot,
  Copy,
  Download,
  Expand,
  FolderOpen,
  Info,
  Magnet,
  MoreHorizontal,
  Pause,
  Play,
  RectangleHorizontal,
  Redo2,
  Repeat,
  Ruler,
  Save,
  Square,
  Trash2,
  Undo2,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import { AboutDialog } from '@/components/shell/AboutDialog'
import { AcknowledgmentsDialog } from '@/components/shell/AcknowledgmentsDialog'
import { ThemeToggle } from '@/components/shell/ThemeToggle'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import { downloadProject, openProjectFile } from '@/io/project'
import { downloadLottie, exportLottie, openLottieFile } from '@/io/lottie'
import { downloadStaticSvg, downloadWebm } from '@/io/svg-export'
import { dismissToast, showToast, updateToast } from '@/lib/toast'

const LottieDialog = lazy(() =>
  import('@/components/lottie/LottieDialog').then((module) => ({
    default: module.LottieDialog,
  })),
)

export function Toolbar() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [acknowledgmentsOpen, setAcknowledgmentsOpen] = useState(false)
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
  const addShape = useEditorStore((state) => state.addShape)
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
  const setProject = useEditorStore((state) => state.setProject)
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const showRulers = useEditorStore((state) => state.showRulers)
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled)
  const toggleShowRulers = useEditorStore((state) => state.toggleShowRulers)

  const isPlaying = playbackState === 'playing'

  return (
    <>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
      <div className="flex items-center gap-1">
        <span className="px-2 text-sm font-semibold tracking-tight">Open Animator</span>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => addShape('rect')}>
              <Square />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add rectangle</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => addShape('ellipse')}>
              <Circle />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add ellipse</TooltipContent>
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

      <Separator orientation="vertical" className="mx-1 h-6" />

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

      <Separator orientation="vertical" className="mx-1 h-6" />

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
        <Separator orientation="vertical" className="mx-1 h-6" />
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
            <DropdownMenuItem onClick={() => downloadStaticSvg(project)}>
              <RectangleHorizontal />
              Export static SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isExporting}
              onClick={async () => {
                setIsExporting(true)
                const toastId = showToast({
                  title: 'Exporting WebM',
                  description: 'Rendering animation frames…',
                  variant: 'loading',
                })

                try {
                  await downloadWebm(project)
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
              }}
            >
              <Video />
              Export WebM video
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
