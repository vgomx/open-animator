import { ColorField } from '@/components/shell/properties/ColorField'
import { PropertyField, PropertyGrid } from '@/components/shell/properties/PropertyField'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useEditorStore } from '@/editor/store'
import { Layers2 } from 'lucide-react'

export function OnionSkinControls() {
  const onionSkinEnabled = useEditorStore((state) => state.onionSkinEnabled)
  const settings = useEditorStore((state) => state.onionSkinSettings)
  const toggleOnionSkinEnabled = useEditorStore((state) => state.toggleOnionSkinEnabled)
  const setOnionSkinSettings = useEditorStore((state) => state.setOnionSkinSettings)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={onionSkinEnabled ? 'secondary' : 'ghost'} size="icon-sm">
          <Layers2 />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Onion skin</p>
            <Button
              variant={onionSkinEnabled ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleOnionSkinEnabled}
            >
              {onionSkinEnabled ? 'On' : 'Off'}
            </Button>
          </div>

          <PropertyGrid>
            <PropertyField
              label="Before"
              value={settings.framesBefore}
              min={0}
              max={5}
              step={1}
              onChange={(value) => setOnionSkinSettings({ framesBefore: Number(value) })}
            />
            <PropertyField
              label="After"
              value={settings.framesAfter}
              min={0}
              max={5}
              step={1}
              onChange={(value) => setOnionSkinSettings({ framesAfter: Number(value) })}
            />
          </PropertyGrid>

          <PropertyGrid>
            <PropertyField
              label="Prev opacity"
              value={Math.round(settings.opacityBefore * 100)}
              suffix="%"
              min={0}
              max={100}
              step={1}
              onChange={(value) => setOnionSkinSettings({ opacityBefore: Number(value) / 100 })}
            />
            <PropertyField
              label="Next opacity"
              value={Math.round(settings.opacityAfter * 100)}
              suffix="%"
              min={0}
              max={100}
              step={1}
              onChange={(value) => setOnionSkinSettings({ opacityAfter: Number(value) / 100 })}
            />
          </PropertyGrid>

          <ColorField
            label="Previous tint"
            value={settings.tintBefore}
            onChange={(value) => setOnionSkinSettings({ tintBefore: value })}
          />
          <ColorField
            label="Next tint"
            value={settings.tintAfter}
            onChange={(value) => setOnionSkinSettings({ tintAfter: value })}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
