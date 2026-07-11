import { useEffect, useState, type ReactNode } from 'react'

import {
  Clapperboard,
  FlaskConical,
  Monitor,
  Moon,
  PanelLeft,
  Settings2,
  Sun,
  Video,
} from 'lucide-react'

import { useTheme } from '@/components/shell/ThemeProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/editor/store'
import {
  clampExportFps,
  loadEditorPreferences,
  saveEditorPreferences,
} from '@/lib/preferences'
import type { ThemeMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsSectionProps = {
  title: string
  icon: typeof Settings2
  children: ReactNode
}

type SettingsRowProps = {
  label: string
  description?: string
  children: ReactNode
}

type SettingsSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
}

function SettingsSection({ title, icon: Icon, children }: SettingsSectionProps) {
  return (
    <section className="space-y-1">
      <div className="flex items-center gap-2 px-1">
        <Icon className="size-3.5 text-muted-foreground" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-1">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function SettingsSwitch({ checked, onCheckedChange, label }: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        checked ? 'bg-primary' : 'bg-muted',
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <span
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

const themeOptions: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { theme, setTheme } = useTheme()
  const snapEnabled = useEditorStore((state) => state.snapEnabled)
  const showRulers = useEditorStore((state) => state.showRulers)
  const showLayersPanel = useEditorStore((state) => state.showLayersPanel)
  const showPropertiesPanel = useEditorStore((state) => state.showPropertiesPanel)
  const loop = useEditorStore((state) => state.loop)
  const recordMode = useEditorStore((state) => state.recordMode)
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled)
  const toggleShowRulers = useEditorStore((state) => state.toggleShowRulers)
  const toggleLayersPanel = useEditorStore((state) => state.toggleLayersPanel)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)
  const toggleLoop = useEditorStore((state) => state.toggleLoop)
  const toggleRecordMode = useEditorStore((state) => state.toggleRecordMode)
  const toggleOnionSkinEnabled = useEditorStore((state) => state.toggleOnionSkinEnabled)
  const experimentalWebGlViewport = useEditorStore((state) => state.experimentalWebGlViewport)
  const toggleExperimentalWebGlViewport = useEditorStore((state) => state.toggleExperimentalWebGlViewport)
  const [defaultExportFps, setDefaultExportFps] = useState(
    () => loadEditorPreferences().defaultExportFps,
  )

  useEffect(() => {
    if (!open) {
      return
    }

    setDefaultExportFps(loadEditorPreferences().defaultExportFps)
  }, [open])

  const setBooleanPreference = (
    current: boolean,
    toggle: () => void,
    next: boolean,
  ) => {
    if (current !== next) {
      toggle()
    }
  }

  const handleExportFpsChange = (value: string) => {
    const next = clampExportFps(Number(value) || 30)
    setDefaultExportFps(next)
    saveEditorPreferences({ defaultExportFps: next })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,90svh)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize the editor workspace, animation workflow, and export defaults.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-6 py-5">
          <div className="space-y-5">
            <SettingsSection title="Appearance" icon={Sun}>
              <div className="py-2">
                <Label className="mb-2 block text-sm font-medium">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {themeOptions.map((option) => {
                    const Icon = option.icon
                    const active = theme === option.value

                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={active ? 'secondary' : 'outline'}
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => setTheme(option.value)}
                      >
                        <Icon className="size-3.5" />
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Workspace" icon={PanelLeft}>
              <SettingsRow
                label="Show rulers"
                description="Display horizontal and vertical rulers around the canvas."
              >
                <SettingsSwitch
                  checked={showRulers}
                  label="Show rulers"
                  onCheckedChange={(next) =>
                    setBooleanPreference(showRulers, toggleShowRulers, next)
                  }
                />
              </SettingsRow>
              <Separator />
              <SettingsRow
                label="Layers panel"
                description="Keep the layers sidebar visible when you open the app."
              >
                <SettingsSwitch
                  checked={showLayersPanel}
                  label="Layers panel"
                  onCheckedChange={(next) =>
                    setBooleanPreference(showLayersPanel, toggleLayersPanel, next)
                  }
                />
              </SettingsRow>
              <Separator />
              <SettingsRow
                label="Properties panel"
                description="Keep the properties sidebar visible when you open the app."
              >
                <SettingsSwitch
                  checked={showPropertiesPanel}
                  label="Properties panel"
                  onCheckedChange={(next) =>
                    setBooleanPreference(showPropertiesPanel, togglePropertiesPanel, next)
                  }
                />
              </SettingsRow>
              <Separator />
              <SettingsRow
                label="Snap to guides"
                description="Align objects to guides, edges, and nearby layers while dragging."
              >
                <SettingsSwitch
                  checked={snapEnabled}
                  label="Snap to guides"
                  onCheckedChange={(next) =>
                    setBooleanPreference(snapEnabled, toggleSnapEnabled, next)
                  }
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Animation" icon={Clapperboard}>
              <SettingsRow
                label="Loop playback"
                description="Restart the timeline automatically when playback reaches the end."
              >
                <SettingsSwitch
                  checked={loop}
                  label="Loop playback"
                  onCheckedChange={(next) => setBooleanPreference(loop, toggleLoop, next)}
                />
              </SettingsRow>
              <Separator />
              <SettingsRow
                label="Record mode"
                description="Automatically add keyframes when you change layer properties."
              >
                <SettingsSwitch
                  checked={recordMode}
                  label="Record mode"
                  onCheckedChange={(next) =>
                    setBooleanPreference(recordMode, toggleRecordMode, next)
                  }
                />
              </SettingsRow>
              <Separator />
              <SettingsRow
                label="Onion skin"
                description="Show previous and next frames while animating."
              >
                <SettingsSwitch
                  checked={onionSkinEnabled}
                  label="Onion skin"
                  onCheckedChange={(next) =>
                    setBooleanPreference(onionSkinEnabled, toggleOnionSkinEnabled, next)
                  }
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Experimental" icon={FlaskConical}>
              <SettingsRow
                label="GPU viewport (Fast preview)"
                description="Use WebGL pan/zoom during Fast preview playback on large scenes for smoother trackpad zoom."
              >
                <SettingsSwitch
                  checked={experimentalWebGlViewport}
                  label="GPU viewport (Fast preview)"
                  onCheckedChange={(next) =>
                    setBooleanPreference(
                      experimentalWebGlViewport,
                      toggleExperimentalWebGlViewport,
                      next,
                    )
                  }
                />
              </SettingsRow>
            </SettingsSection>

            <SettingsSection title="Export" icon={Video}>
              <SettingsRow
                label="Default frame rate"
                description="Used as the starting FPS for video and GIF exports."
              >
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={12}
                    max={60}
                    step={1}
                    value={defaultExportFps}
                    onChange={(event) => handleExportFpsChange(event.target.value)}
                    className="h-8 w-20"
                    aria-label="Default export frame rate"
                  />
                  <span className="text-xs text-muted-foreground">fps</span>
                </div>
              </SettingsRow>
            </SettingsSection>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
