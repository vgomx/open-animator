export type AnimationCycleDirection = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'

export type AnimationCycle = {
  duration: number
  delay?: number
  direction?: AnimationCycleDirection
}

export function resolveLoopTime(
  globalTime: number,
  cycle: AnimationCycle,
): number | null {
  const delay = cycle.delay ?? 0
  const duration = cycle.duration
  const direction = cycle.direction ?? 'normal'

  const activeTime = globalTime - delay
  if (activeTime < 0 || duration <= 0) {
    return null
  }

  let loopTime = activeTime % duration
  if (activeTime > 0 && loopTime === 0) {
    loopTime = duration
  }

  const iteration = Math.floor(activeTime / duration)
  let reversed = direction === 'reverse'
  if (direction === 'alternate') {
    reversed = iteration % 2 === 1
  } else if (direction === 'alternate-reverse') {
    reversed = iteration % 2 === 0
  }

  return reversed ? duration - loopTime : loopTime
}

export function inferCycleDurationFromKeyframes(
  keyframes: Array<{ time: number }> | undefined,
  fallback: number,
): number {
  if (!keyframes || keyframes.length === 0) {
    return fallback
  }

  const maxTime = Math.max(...keyframes.map((keyframe) => keyframe.time))
  return maxTime > 0 ? maxTime : fallback
}
