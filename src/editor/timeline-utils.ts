import { TIMELINE_EDGE_INSET } from '@/editor/layout-constants'
import { DEFAULT_PROJECT_FPS } from '@/editor/types'

export const TIMELINE_FPS = DEFAULT_PROJECT_FPS

export function getTimelineTrackWidth(contentWidth: number): number {
  return Math.max(0, contentWidth - TIMELINE_EDGE_INSET * 2)
}

export function getFrameStep(fps: number): number {
  return 1 / Math.max(1, fps)
}

const OBJECT_SNAP_THRESHOLD = 0.04

export function formatTimelineTime(seconds: number, fps = DEFAULT_PROJECT_FPS): string {
  const frames = Math.round(seconds * fps)
  return `${seconds.toFixed(2)}s · f${frames}`
}

export function timeToPercent(time: number, duration: number): number {
  if (duration <= 0) {
    return 0
  }

  return (time / duration) * 100
}

export function timeFromClientX(
  clientX: number,
  rect: DOMRect,
  duration: number,
  options?: { scrollLeft?: number; contentWidth?: number },
): number {
  if (options?.contentWidth && options.contentWidth > 0) {
    const x = clientX - rect.left + (options.scrollLeft ?? 0) - TIMELINE_EDGE_INSET
    const trackWidth = getTimelineTrackWidth(options.contentWidth)
    if (trackWidth <= 0) {
      return 0
    }

    const ratio = Math.max(0, Math.min(1, x / trackWidth))
    return ratio * duration
  }

  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  return ratio * duration
}

export function timeToPixel(time: number, duration: number, contentWidth: number): number {
  if (contentWidth <= 0) {
    return TIMELINE_EDGE_INSET
  }

  if (duration <= 0) {
    return TIMELINE_EDGE_INSET
  }

  const trackWidth = getTimelineTrackWidth(contentWidth)
  return TIMELINE_EDGE_INSET + (time / duration) * trackWidth
}

export function getTimelineContentWidth(
  duration: number,
  viewportWidth: number,
  pxPerSecond: number,
  zoom = 1,
): number {
  const scaledTrackWidth = Math.max(0, duration) * pxPerSecond * zoom
  const minTrackWidth = Math.max(0, viewportWidth - TIMELINE_EDGE_INSET * 2)
  const trackWidth = Math.max(minTrackWidth, scaledTrackWidth)
  return trackWidth + TIMELINE_EDGE_INSET * 2
}

export function clampTimelineTime(time: number, duration: number): number {
  return Math.max(0, Math.min(time, duration))
}

type SnapOptions = {
  duration: number
  fps: number
  snapEnabled: boolean
  frameSnap: boolean
  markers: Array<{ time: number }>
  states: Array<{ time: number }>
  keyframeTimes: number[]
  playheadTime?: number
  excludeKeyframeId?: string
}

export function snapTimelineTime(time: number, options: SnapOptions): number {
  const clamped = clampTimelineTime(time, options.duration)
  const frameStep = getFrameStep(options.fps)
  const frameSnapThreshold = frameStep / 2

  if (!options.snapEnabled || !options.frameSnap) {
    return clamped
  }

  const objectCandidates = new Set<number>()
  if (options.playheadTime !== undefined) {
    objectCandidates.add(options.playheadTime)
  }

  for (const marker of options.markers) {
    objectCandidates.add(marker.time)
  }

  for (const state of options.states) {
    objectCandidates.add(state.time)
  }

  for (const keyframeTime of options.keyframeTimes) {
    objectCandidates.add(keyframeTime)
  }

  let best = clamped
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of objectCandidates) {
    const distance = Math.abs(candidate - clamped)
    if (distance < OBJECT_SNAP_THRESHOLD && distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  if (bestDistance < Number.POSITIVE_INFINITY) {
    return clampTimelineTime(best, options.duration)
  }

  const frameSnapped = Math.round(clamped * options.fps) / options.fps
  if (Math.abs(frameSnapped - clamped) < frameSnapThreshold) {
    return clampTimelineTime(frameSnapped, options.duration)
  }

  return clamped
}

export function getRulerTicks(duration: number, maxTicks = 10): number[] {
  if (duration <= 0) {
    return [0]
  }

  const rawStep = duration / maxTicks
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude

  let step = magnitude
  if (normalized <= 1) {
    step = magnitude
  } else if (normalized <= 2) {
    step = 2 * magnitude
  } else if (normalized <= 5) {
    step = 5 * magnitude
  } else {
    step = 10 * magnitude
  }

  const ticks: number[] = []
  for (let time = 0; time <= duration + step * 0.001; time += step) {
    ticks.push(Math.min(time, duration))
  }

  return ticks
}

export function collectKeyframeTimes(
  layers: Array<{
    keyframes: Array<{ id: string; time: number }>
    matrixKeyframes?: Array<{ time: number }>
  }>,
  excludeIds: string[] = [],
): number[] {
  const excluded = new Set(excludeIds)
  const times = new Set<number>()

  for (const layer of layers) {
    for (const keyframe of layer.keyframes) {
      if (!excluded.has(keyframe.id)) {
        times.add(keyframe.time)
      }
    }

    for (const keyframe of layer.matrixKeyframes ?? []) {
      times.add(keyframe.time)
    }
  }

  return [...times]
}
