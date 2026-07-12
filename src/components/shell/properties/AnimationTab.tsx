import {
  CircleDot,
  Maximize2,
  Move,
  Paintbrush,
  Sparkles,
} from 'lucide-react'

import {
  AnimationPropertyField,
  formatAnimationValue,
} from '@/components/shell/properties/AnimationPropertyField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import type { AnimatableProperty, BezierHandle, EasingType, Layer, Shape } from '@/editor/types'
import { isColorProperty } from '@/editor/types'

const TRANSFORM_PROPERTIES: AnimatableProperty[] = ['x', 'y', 'rotation', 'scaleX', 'scaleY']
const APPEARANCE_PROPERTIES: AnimatableProperty[] = ['opacity', 'fill', 'stroke']

type AnimationTabProps = {
  selectedLayer: Layer
  selectedCount: number
  shape: Shape
  recordMode: boolean
  currentTime: number
  onAddKeyframe: (property: AnimatableProperty) => void
  onSetEasing: (property: AnimatableProperty, easing: EasingType, bezier?: BezierHandle) => void
  onUpdateShape: (patch: Partial<Shape>) => void
}

function sizeProperties(shape: Shape): AnimatableProperty[] {
  if (shape.type === 'rect') {
    return ['width', 'height']
  }
  if (shape.type === 'text') {
    return ['fontSize']
  }
  return ['rx', 'ry']
}

function PropertySection({
  title,
  icon,
  properties,
  selectedLayer,
  shape,
  currentTime,
  onAddKeyframe,
  onSetEasing,
  onUpdateShape,
  className,
}: {
  title: string
  icon: typeof Move
  properties: AnimatableProperty[]
  selectedLayer: Layer
  shape: Shape
  currentTime: number
  onAddKeyframe: (property: AnimatableProperty) => void
  onSetEasing: (property: AnimatableProperty, easing: EasingType, bezier?: BezierHandle) => void
  onUpdateShape: (patch: Partial<Shape>) => void
  className?: string
}) {
  return (
    <PanelSection title={title} icon={icon} className={className}>
      <div className="space-y-2">
        {properties.map((property) => {
          const keyframeAtTime = selectedLayer.keyframes.find(
            (keyframe) =>
              keyframe.property === property && Math.abs(keyframe.time - currentTime) < 0.001,
          )

          return (
            <AnimationPropertyField
              key={property}
              property={property}
              displayValue={formatAnimationValue(property, shape as Record<string, string | number>)}
              colorValue={isColorProperty(property) ? String(shape[property]) : undefined}
              keyframeAtTime={Boolean(keyframeAtTime)}
              easing={keyframeAtTime?.easing ?? 'linear'}
              bezier={keyframeAtTime?.bezier}
              onAddKeyframe={() => onAddKeyframe(property)}
              onSetEasing={(nextEasing, nextBezier) => onSetEasing(property, nextEasing, nextBezier)}
              onColorChange={
                isColorProperty(property)
                  ? (value) => onUpdateShape({ [property]: value } as Partial<Shape>)
                  : undefined
              }
            />
          )
        })}
      </div>
    </PanelSection>
  )
}

export function AnimationTab({
  selectedLayer,
  selectedCount,
  shape,
  recordMode,
  currentTime,
  onAddKeyframe,
  onSetEasing,
  onUpdateShape,
}: AnimationTabProps) {
  return (
    <div className="pb-3">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
            <Sparkles className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedLayer.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {selectedCount > 1
                ? `${selectedCount} layers selected — editing primary`
                : 'Keyframe properties at playhead'}
            </p>
          </div>
        </div>
      </div>

      <PanelSection title="Recording" icon={CircleDot}>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/10 px-2.5 py-2 text-xs text-muted-foreground">
          <CircleDot className={recordMode ? 'mt-0.5 size-3.5 text-primary' : 'mt-0.5 size-3.5'} />
          <p>
            {recordMode
              ? 'Record mode is on. Property edits at the playhead create keyframes automatically.'
              : 'Record mode is off. Scrub the timeline, change a value, then add a keyframe.'}
          </p>
        </div>
      </PanelSection>

      <PropertySection
        title="Transform"
        icon={Move}
        properties={TRANSFORM_PROPERTIES}
        selectedLayer={selectedLayer}
        shape={shape}
        currentTime={currentTime}
        onAddKeyframe={onAddKeyframe}
        onSetEasing={onSetEasing}
        onUpdateShape={onUpdateShape}
      />

      <PropertySection
        title="Size"
        icon={Maximize2}
        properties={sizeProperties(shape)}
        selectedLayer={selectedLayer}
        shape={shape}
        currentTime={currentTime}
        onAddKeyframe={onAddKeyframe}
        onSetEasing={onSetEasing}
        onUpdateShape={onUpdateShape}
      />

      <PropertySection
        title="Appearance"
        icon={Paintbrush}
        properties={APPEARANCE_PROPERTIES}
        selectedLayer={selectedLayer}
        shape={shape}
        currentTime={currentTime}
        onAddKeyframe={onAddKeyframe}
        onSetEasing={onSetEasing}
        onUpdateShape={onUpdateShape}
        className="border-b-0"
      />
    </div>
  )
}
