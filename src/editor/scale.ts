import { createId } from '@/editor/scene'
import type { Keyframe, Shape } from '@/editor/types'

export const DEFAULT_SCALE = 1

type LegacyScaleShape = Shape & { scale?: number }

export function getShapeScaleX(shape: Pick<Shape, 'scaleX'>): number {
  return shape.scaleX
}

export function getShapeScaleY(shape: Pick<Shape, 'scaleY'>): number {
  return shape.scaleY
}

export function normalizeShapeScale<T extends LegacyScaleShape>(shape: T): T {
  const legacyScale = shape.scale
  const scaleX = shape.scaleX ?? legacyScale ?? DEFAULT_SCALE
  const scaleY = shape.scaleY ?? legacyScale ?? DEFAULT_SCALE
  const { scale: _legacyScale, ...rest } = shape

  return {
    ...rest,
    scaleX,
    scaleY,
  } as T
}

export function migrateScaleKeyframes(keyframes: Keyframe[]): Keyframe[] {
  const migrated: Keyframe[] = []

  for (const keyframe of keyframes) {
    if ((keyframe.property as string) === 'scale') {
      const value = typeof keyframe.value === 'number' ? keyframe.value : DEFAULT_SCALE
      migrated.push(
        { ...keyframe, property: 'scaleX', value },
        { ...keyframe, id: createId(), property: 'scaleY', value },
      )
      continue
    }

    migrated.push(keyframe)
  }

  return migrated
}
