import { useState } from 'react'

import { Info, Keyboard, MoreHorizontal, Settings, Sparkles } from 'lucide-react'

import { AboutDialog } from '@/components/shell/AboutDialog'
import { AcknowledgmentsDialog } from '@/components/shell/AcknowledgmentsDialog'
import { AppLogo } from '@/components/shell/AppLogo'
import { SettingsDialog } from '@/components/shell/SettingsDialog'
import { TemplatesDialog } from '@/components/shell/TemplatesDialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'

type ActivityRailProps = {
  onOpenShortcuts?: () => void
}

export function ActivityRail({ onOpenShortcuts }: ActivityRailProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [acknowledgmentsOpen, setAcknowledgmentsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const setProject = useEditorStore((state) => state.setProject)

  return (
    <>
      <aside className="activity-rail glass-chrome flex w-14 shrink-0 flex-col items-center border-r border-border text-card-foreground">
        <div className="flex h-12 w-full shrink-0 items-center justify-center px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-md transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label="Open Animator"
              >
                <AppLogo size={36} variant="accent" emphasis />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Animator</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 pb-3">
          <div className="mt-auto flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Settings"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="More">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">More</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="end" sideOffset={8}>
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
          </div>
        </div>
      </aside>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
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
        onSelectTemplate={(project) => {
          const viewport = document.querySelector('[data-stage-viewport]')?.getBoundingClientRect()
          setProject(project, {
            fitViewport: viewport ?? undefined,
            clearLayerSelection: true,
          })
        }}
      />
    </>
  )
}
