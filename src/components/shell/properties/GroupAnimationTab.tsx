import { CircleDot, Move, Sparkles } from 'lucide-react'

import {
  AnimationPropertyField,
  formatAnimationValue,
} from '@/components/shell/properties/AnimationPropertyField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
import { PropertyField } from '@/components/shell/properties/PropertyField'
import {
  GROUP_ANIMATABLE_PROPERTIES,
  getGroupAnimatedValues,
} from '@/editor/group-animation'
import type { AnimatableProperty, BezierHandle, EasingType, LayerGroupMeta } from '@/editor/types'

type GroupAnimationTabProps = {
  groupId: string
  group: LayerGroupMeta
  layerGroups: Record<string, LayerGroupMeta> | undefined
  recordMode: boolean
  currentTime: number
  onAddKeyframe: (property: AnimatableProperty) => void
  onSetEasing: (property: AnimatableProperty, easing: EasingType, bezier?: BezierHandle) => void
  onUpdateGroupTransform: (
    patch: Partial<Record<(typeof GROUP_ANIMATABLE_PROPERTIES)[number], number>>,
  ) => void
}

const PROPERTY_STEPS: Partial<
  Record<(typeof GROUP_ANIMATABLE_PROPERTIES)[number], { step?: number; shiftStep?: number; decimals?: number }>
> = {
  x: { step: 1, shiftStep: 10 },
  y: { step: 1, shiftStep: 10 },
  rotation: { step: 1, shiftStep: 15 },
  scaleX: { step: 0.01, shiftStep: 0.1, decimals: 2 },
  scaleY: { step: 0.01, shiftStep: 0.1, decimals: 2 },
  opacity: { step: 0.01, shiftStep: 0.1, decimals: 2 },
}

export function GroupAnimationTab({
  groupId,
  group,
  layerGroups,
  recordMode,
  currentTime,
  onAddKeyframe,
  onSetEasing,
  onUpdateGroupTransform,
}: GroupAnimationTabProps) {
  const values = getGroupAnimatedValues(groupId, layerGroups, currentTime)
  const keyframes = group.keyframes ?? []

  return (
    <div className="pb-3">
      <div className="border-b border-border/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md border border-border bg-muted/40">
            <Sparkles className="size-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{group.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {group.cycleDuration
                ? `Loop: ${group.cycleDuration}s · Group transform keyframes at playhead`
                : 'Group transform keyframes at playhead'}
            </p>
          </div>
        </div>
      </div>

      <PanelSection title="Recording" icon={CircleDot}>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/10 px-2.5 py-2 text-xs text-muted-foreground">
          <CircleDot className={recordMode ? 'mt-0.5 size-3.5 text-primary' : 'mt-0.5 size-3.5'} />
          <p>
            {recordMode
              ? 'Record mode is on. Group transform edits at the playhead create keyframes automatically.'
              : 'Edits still keyframe at the playhead. Toggle record mode for the same workflow as layers.'}
          </p>
        </div>
      </PanelSection>

      <PanelSection title="Transform" icon={Move} className="border-b-0">
        <div className="space-y-2">
          {GROUP_ANIMATABLE_PROPERTIES.map((property) => {
            const keyframeAtTime = keyframes.find(
              (keyframe) =>
                keyframe.property === property && Math.abs(keyframe.time - currentTime) < 0.001,
            )
            const steps = PROPERTY_STEPS[property]

            return (
              <div key={property} className="space-y-2">
                <PropertyField
                  label={property}
                  value={values[property]}
                  step={steps?.step}
                  shiftStep={steps?.shiftStep}
                  decimals={steps?.decimals}
                  onChange={(value) =>
                    onUpdateGroupTransform({
                      [property]: Number(value),
                    })
                  }
                />
                <AnimationPropertyField
                  property={property}
                  displayValue={formatAnimationValue(property, values)}
                  keyframeAtTime={Boolean(keyframeAtTime)}
                  easing={keyframeAtTime?.easing ?? 'linear'}
                  bezier={keyframeAtTime?.bezier}
                  onAddKeyframe={() => onAddKeyframe(property)}
                  onSetEasing={(nextEasing, nextBezier) => onSetEasing(property, nextEasing, nextBezier)}
                />
              </div>
            )
          })}
        </div>
      </PanelSection>
    </div>
  )
}
