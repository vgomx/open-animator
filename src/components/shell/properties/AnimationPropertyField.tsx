import type { ReactNode } from 'react'
import { CircleDot } from 'lucide-react'

import { BezierEasingEditor } from '@/components/shell/properties/BezierEasingEditor'
import { ColorField } from '@/components/shell/properties/ColorField'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DEFAULT_CUSTOM_BEZIER } from '@/editor/easing'
import type { AnimatableProperty, BezierHandle, EasingType } from '@/editor/types'
import { EASING_OPTIONS, isColorProperty } from '@/editor/types'
import { cn } from '@/lib/utils'

const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: 'X',
  y: 'Y',
  opacity: 'Opacity',
  scale: 'Scale',
  rotation: 'Rotation',
  fill: 'Fill',
  stroke: 'Stroke',
  width: 'W',
  height: 'H',
  rx: 'RX',
  ry: 'RY',
  fontSize: 'Size',
}

type AnimationPropertyFieldProps = {
  property: AnimatableProperty
  displayValue: ReactNode
  colorValue?: string
  keyframeAtTime: boolean
  easing: EasingType
  bezier?: BezierHandle
  onAddKeyframe: () => void
  onSetEasing: (easing: EasingType, bezier?: BezierHandle) => void
  onColorChange?: (value: string) => void
}

export function AnimationPropertyField({
  property,
  displayValue,
  colorValue,
  keyframeAtTime,
  easing,
  bezier,
  onAddKeyframe,
  onSetEasing,
  onColorChange,
}: AnimationPropertyFieldProps) {
  const activeBezier = bezier ?? DEFAULT_CUSTOM_BEZIER

  return (
    <div
      className={cn(
        'rounded-md border px-2 py-2',
        keyframeAtTime ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-muted/10',
      )}
    >
      {isColorProperty(property) && colorValue && onColorChange ? (
        <div className="space-y-2">
          <ColorField
            label={PROPERTY_LABELS[property]}
            value={colorValue}
            allowNone={property === 'stroke'}
            onChange={onColorChange}
          />
          <div className="flex justify-end">
            <TooltipIconButton
              label={keyframeAtTime ? 'Keyframe at playhead' : 'Add keyframe'}
              active={keyframeAtTime}
              onClick={onAddKeyframe}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {PROPERTY_LABELS[property]}
            </p>
            <div className="truncate text-xs text-foreground">{displayValue}</div>
          </div>
          <TooltipIconButton
            label={keyframeAtTime ? 'Keyframe at playhead' : 'Add keyframe'}
            active={keyframeAtTime}
            onClick={onAddKeyframe}
          />
        </div>
      )}
      <div className="mt-2 space-y-1">
        <Label className="text-[10px] text-muted-foreground">Easing</Label>
        <select
          className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs"
          value={easing}
          disabled={!keyframeAtTime}
          onChange={(event) => {
            const next = event.target.value as EasingType
            onSetEasing(next, next === 'custom' ? activeBezier : undefined)
          }}
        >
          {EASING_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {keyframeAtTime && easing === 'custom' ? (
          <BezierEasingEditor
            value={activeBezier}
            onChange={(next) => onSetEasing('custom', next)}
          />
        ) : null}
      </div>
    </div>
  )
}

function TooltipIconButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? 'secondary' : 'outline'}
      className="size-7 shrink-0 rounded-md"
      title={label}
      onClick={onClick}
    >
      <CircleDot className="size-3.5" />
    </Button>
  )
}

export function ColorAnimationValue({ color }: { color: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block size-3 rounded-full border border-border"
        style={{ backgroundColor: color }}
      />
      <span className="font-mono uppercase">{color}</span>
    </span>
  )
}

export function formatAnimationValue(
  property: AnimatableProperty,
  shape: Record<string, string | number>,
): ReactNode {
  if (isColorProperty(property)) {
    return <ColorAnimationValue color={String(shape[property])} />
  }

  const value = Number(shape[property] ?? 0)
  if (property === 'opacity') {
    return `${Math.round(value * 100)}%`
  }

  if (property === 'rotation') {
    return `${value.toFixed(1)}°`
  }

  if (property === 'scale') {
    return value.toFixed(2)
  }

  return `${value.toFixed(property === 'x' || property === 'y' ? 0 : 1)} px`
}
