import { CircleDot, Move, Sparkles } from 'lucide-react'

import {
  AnimationPropertyField,
  formatAnimationValue,
} from '@/components/shell/properties/AnimationPropertyField'
import { PanelSection } from '@/components/shell/properties/PanelSection'
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
}

export function GroupAnimationTab({
  groupId,
  group,
  layerGroups,
  recordMode,
  currentTime,
  onAddKeyframe,
  onSetEasing,
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
            <p className="text-[10px] text-muted-foreground">Group transform keyframes at playhead</p>
          </div>
        </div>
      </div>

      <PanelSection title="Recording" icon={CircleDot}>
        <div className="flex items-start gap-2 rounded-md border border-border/70 bg-muted/10 px-2.5 py-2 text-xs text-muted-foreground">
          <CircleDot className={recordMode ? 'mt-0.5 size-3.5 text-primary' : 'mt-0.5 size-3.5'} />
          <p>
            Group transforms compose over child layers at playback. Add keyframes here to animate the
            whole group.
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

            return (
              <AnimationPropertyField
                key={property}
                property={property}
                displayValue={formatAnimationValue(property, values)}
                keyframeAtTime={Boolean(keyframeAtTime)}
                easing={keyframeAtTime?.easing ?? 'linear'}
                bezier={keyframeAtTime?.bezier}
                onAddKeyframe={() => onAddKeyframe(property)}
                onSetEasing={(nextEasing, nextBezier) => onSetEasing(property, nextEasing, nextBezier)}
              />
            )
          })}
        </div>
      </PanelSection>
    </div>
  )
}
