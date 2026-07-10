import {
  Circle,
  Download,
  FolderOpen,
  Pause,
  Play,
  RectangleHorizontal,
  Repeat,
  Save,
  Square,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

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
import { downloadStaticSvg } from '@/io/svg-export'

export function Toolbar() {
  const project = useEditorStore((state) => state.project)
  const playbackState = useEditorStore((state) => state.playbackState)
  const loop = useEditorStore((state) => state.loop)
  const zoom = useEditorStore((state) => state.zoom)
  const addShape = useEditorStore((state) => state.addShape)
  const removeSelectedLayer = useEditorStore((state) => state.removeSelectedLayer)
  const setPlaybackState = useEditorStore((state) => state.setPlaybackState)
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime)
  const toggleLoop = useEditorStore((state) => state.toggleLoop)
  const setZoom = useEditorStore((state) => state.setZoom)
  const setProject = useEditorStore((state) => state.setProject)

  const isPlaying = playbackState === 'playing'

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-card px-3">
      <div className="flex items-center gap-1">
        <span className="px-2 text-sm font-semibold tracking-tight">SVG Animator</span>
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
        <Separator orientation="vertical" className="mx-1 h-6" />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
