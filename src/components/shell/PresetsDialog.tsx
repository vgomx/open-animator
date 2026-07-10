import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ANIMATION_PRESETS, type PresetId } from '@/editor/presets'
import { useEditorStore } from '@/editor/store'

type PresetsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PresetsDialog({ open, onOpenChange }: PresetsDialogProps) {
  const applyAnimationPreset = useEditorStore((state) => state.applyAnimationPreset)
  const selectedCount = useEditorStore((state) => state.selectedLayerIds.length)
  const [duration, setDuration] = useState(1)
  const [intensity, setIntensity] = useState(1)

  const apply = (presetId: PresetId) => {
    applyAnimationPreset(presetId, { duration, intensity })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Animation presets</DialogTitle>
          <DialogDescription>
            Apply motion to {selectedCount > 0 ? `${selectedCount} selected layer(s)` : 'the selected layer'} at the playhead.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Duration (s)</Label>
            <Input
              type="number"
              min={0.1}
              step={0.1}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Intensity</Label>
            <Slider
              min={0.25}
              max={2}
              step={0.05}
              value={[intensity]}
              onValueChange={(value) => setIntensity(value[0] ?? 1)}
            />
          </div>
        </div>

        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
          {ANIMATION_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-1 px-3 py-2 text-left"
              disabled={selectedCount === 0}
              onClick={() => apply(preset.id)}
            >
              <span className="text-base">{preset.icon}</span>
              <span className="text-sm font-medium">{preset.name}</span>
              <span className="text-[10px] text-muted-foreground">{preset.description}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
