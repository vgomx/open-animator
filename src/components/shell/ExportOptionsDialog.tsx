import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_SIZE_PRESETS,
  type ExportBackgroundMode,
  type ExportOptions,
  type ExportSizePreset,
} from '@/io/export-options'
import { loadEditorPreferences, saveEditorPreferences } from '@/lib/preferences'

type ExportOptionsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  loopHint?: string
  showFps?: boolean
  onConfirm: (options: ExportOptions) => void | Promise<void>
}

export function ExportOptionsDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loopHint,
  showFps = true,
  onConfirm,
}: ExportOptionsDialogProps) {
  const [options, setOptions] = useState<ExportOptions>(() => ({
    ...DEFAULT_EXPORT_OPTIONS,
    fps: loadEditorPreferences().defaultExportFps,
  }))
  const [isSubmitting, setIsSubmitting] = useState(false)

  const setBackground = (background: ExportBackgroundMode) => {
    setOptions((current) => ({ ...current, background }))
  }

  const setSizePreset = (sizePreset: ExportSizePreset) => {
    setOptions((current) => ({ ...current, sizePreset }))
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      saveEditorPreferences({ defaultExportFps: options.fps })
      await onConfirm(options)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
            {loopHint ? ` ${loopHint}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Output size</Label>
            <div className="flex flex-wrap gap-2">
              {EXPORT_SIZE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={options.sizePreset === preset.id ? 'secondary' : 'outline'}
                  onClick={() => setSizePreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {showFps ? (
            <div className="space-y-2">
              <Label htmlFor="export-fps">Frame rate (GIF / WebM)</Label>
              <Input
                id="export-fps"
                type="number"
                min={1}
                max={60}
                value={options.fps}
                onChange={(event) =>
                  setOptions((current) => ({
                    ...current,
                    fps: Math.max(1, Math.min(60, Number(event.target.value) || 30)),
                  }))
                }
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="export-scale">
              {options.sizePreset === 'custom' ? 'Scale' : 'Extra scale multiplier'}
            </Label>
            <Input
              id="export-scale"
              type="number"
              min={0.25}
              max={4}
              step={0.25}
              value={options.scale}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  scale: Math.max(0.25, Math.min(4, Number(event.target.value) || 1)),
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={options.background === 'solid' ? 'secondary' : 'outline'}
                onClick={() => setBackground('solid')}
              >
                Solid
              </Button>
              <Button
                type="button"
                size="sm"
                variant={options.background === 'transparent' ? 'secondary' : 'outline'}
                onClick={() => setBackground('transparent')}
              >
                Transparent
              </Button>
            </div>
          </div>

          {options.background === 'solid' ? (
            <div className="space-y-2">
              <Label htmlFor="export-background-color">Background color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="export-background-color"
                  type="color"
                  value={options.backgroundColor}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      backgroundColor: event.target.value,
                    }))
                  }
                  className="h-9 w-14 p-1"
                />
                <Input
                  value={options.backgroundColor}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      backgroundColor: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSubmitting}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
