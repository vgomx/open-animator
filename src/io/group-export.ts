import type { AnimatedShapeContext } from '@/editor/group-animation'
import {
  getGroupAnimatedValues,
} from '@/editor/group-animation'
import type { LayerGroupMeta, Project } from '@/editor/types'

export function getExportAnimationContext(project: Project): AnimatedShapeContext {
  return { layerGroups: project.layerGroups }
}

export function animatedGroupIds(layerGroups?: Record<string, LayerGroupMeta>): string[] {
  if (!layerGroups) {
    return []
  }

  return Object.entries(layerGroups)
    .filter(([, group]) => (group.keyframes?.length ?? 0) > 0)
    .map(([groupId]) => groupId)
}

export function collectGroupTimes(
  keyframes: LayerGroupMeta['keyframes'],
  duration: number,
): number[] {
  const times = new Set<number>([0, duration])
  for (const keyframe of keyframes ?? []) {
    times.add(Math.max(0, Math.min(keyframe.time, duration)))
  }

  return [...times].sort((left, right) => left - right)
}

export function toGroupCssTransform(values: ReturnType<typeof getGroupAnimatedValues>): string {
  const parts: string[] = []

  if (values.x !== 0 || values.y !== 0) {
    parts.push(`translate(${values.x}px, ${values.y}px)`)
  }

  if (values.rotation !== 0) {
    parts.push(`rotate(${values.rotation}deg)`)
  }

  if (values.scaleX !== 1 || values.scaleY !== 1) {
    parts.push(`scale(${values.scaleX}, ${values.scaleY})`)
  }

  return parts.length > 0 ? parts.join(' ') : 'none'
}

export function groupAnimationCss(
  groupId: string,
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  duration: number,
  className: string,
): string {
  const group = layerGroups?.[groupId]
  const keyframes = group?.keyframes ?? []
  const cycleDuration = group?.cycleDuration ?? duration
  const times = collectGroupTimes(keyframes, cycleDuration)
  if (times.length <= 1) {
    return ''
  }

  const keyframeLines = times
    .map((time) => {
      const values = getGroupAnimatedValues(groupId, layerGroups, time)
      const percent = cycleDuration === 0 ? 0 : (time / cycleDuration) * 100
      return `  ${percent}% { transform: ${toGroupCssTransform(values)}; opacity: ${values.opacity}; }`
    })
    .join('\n')

  return `@keyframes ${className} {\n${keyframeLines}\n}\n.${className} { animation: ${className} ${cycleDuration}s linear infinite; transform-box: fill-box; transform-origin: center; }`
}

export function groupKeyframesCss(
  groupId: string,
  layerGroups: Record<string, LayerGroupMeta> | undefined,
  duration: number,
  className: string,
): string {
  return groupAnimationCss(groupId, layerGroups, duration, className)
}

export function hasAnimatedGroupsInProject(project: Project): boolean {
  return animatedGroupIds(project.layerGroups).length > 0
}
