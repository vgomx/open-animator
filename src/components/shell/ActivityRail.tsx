import { useState, type ComponentType, type ReactNode } from 'react'

import {
  Archive,
  Bot,
  File,
  Info,
  Keyboard,
  MoreHorizontal,
  Settings,
  Sparkles,
  type LucideProps,
} from 'lucide-react'

import type { ActivityView } from '@/components/shell/activity-view'
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
import { SoonLabel } from '@/components/ui/soon-label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useEditorStore } from '@/editor/store'
import { cn } from '@/lib/utils'

type ActivityRailNavItemProps = {
  icon: ComponentType<LucideProps>
  label: string
  badge?: ReactNode
  selected?: boolean
  disabled?: boolean
  onClick?: () => void
}

function ActivityRailNavItem({
  icon: Icon,
  label,
  badge,
  selected = false,
  disabled = false,
  onClick,
}: ActivityRailNavItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-current={selected ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      className={cn(
        'flex w-full flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors outline-none',
        selected && 'bg-accent text-accent-foreground',
        !selected && !disabled && 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-45',
        !disabled && 'focus-visible:ring-2 focus-visible:ring-ring/70',
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={selected ? 2.25 : 2} />
      <span className="w-full max-w-full truncate px-0.5 text-center text-[9px] font-medium leading-none tracking-tight">
        {label}
      </span>
      {badge}
    </button>
  )
}

type ActivityRailProps = {
  activeView: ActivityView
  onViewChange: (view: ActivityView) => void
  onOpenShortcuts?: () => void
  onOpenAbout?: () => void
}

export function ActivityRail({
  activeView,
  onViewChange,
  onOpenShortcuts,
  onOpenAbout,
}: ActivityRailProps) {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [acknowledgmentsOpen, setAcknowledgmentsOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const setProject = useEditorStore((state) => state.setProject)

  return (
    <>
      <aside className="activity-rail editor-shell__rail glass-chrome flex w-16 shrink-0 flex-col items-center border-r border-border text-card-foreground">
        <div className="flex h-12 w-full shrink-0 items-center justify-center px-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex size-11 items-center justify-center rounded-md transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/70"
                aria-label="Open Animator"
                onClick={() => onViewChange('editor')}
              >
                <AppLogo size={36} variant="accent" emphasis />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Open Animator</TooltipContent>
          </Tooltip>
        </div>

        <div
          className="mx-2 h-px w-12 shrink-0 bg-border"
          role="separator"
          aria-orientation="horizontal"
        />

        <div className="flex w-full flex-col gap-1 px-1.5 py-2">
          <ActivityRailNavItem
            icon={File}
            label="Document"
            selected={activeView === 'editor'}
            onClick={() => onViewChange('editor')}
          />
          <ActivityRailNavItem
            icon={Archive}
            label="Files"
            selected={activeView === 'files'}
            onClick={() => onViewChange('files')}
          />
          <ActivityRailNavItem
            icon={Bot}
            label="Agents"
            badge={<SoonLabel />}
            selected={activeView === 'agents'}
            disabled
          />
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
                <DropdownMenuItem onClick={() => onOpenAbout?.() ?? setAboutOpen(true)}>
                  <Info />
                  About
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {!onOpenAbout ? (
        <>
          <AboutDialog
            open={aboutOpen}
            onOpenChange={setAboutOpen}
            onOpenAcknowledgments={() => {
              setAboutOpen(false)
              setAcknowledgmentsOpen(true)
            }}
          />
          <AcknowledgmentsDialog open={acknowledgmentsOpen} onOpenChange={setAcknowledgmentsOpen} />
        </>
      ) : null}
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={(project) => {
          const viewport = document.querySelector('[data-stage-viewport]')?.getBoundingClientRect()
          setProject(project, {
            fitViewport: viewport ?? undefined,
            clearLayerSelection: true,
            isNewRecentFile: true,
          })
          onViewChange('editor')
        }}
      />
    </>
  )
}
