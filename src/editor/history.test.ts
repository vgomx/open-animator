import { describe, expect, it } from 'vitest'

import { createDefaultProject } from '@/editor/scene'
import {
  createSnapshot,
  pushSnapshot,
  redoSnapshot,
  undoSnapshot,
} from '@/editor/history'

describe('history', () => {
  it('pushes and undoes snapshots', () => {
    const projectA = createDefaultProject()
    const projectB = {
      ...projectA,
      duration: 5,
    }

    const stacks = pushSnapshot({ past: [], future: [] }, createSnapshot(projectA, []))
    const undoResult = undoSnapshot(stacks, createSnapshot(projectB, ['layer-1']))

    expect(undoResult?.snapshot.project.duration).toBe(3)
    expect(undoResult?.stacks.future).toHaveLength(1)
  })

  it('redoes a previously undone snapshot', () => {
    const projectA = createDefaultProject()
    const projectB = {
      ...projectA,
      duration: 5,
    }

    const stacks = pushSnapshot({ past: [], future: [] }, createSnapshot(projectA, []))
    const undoResult = undoSnapshot(stacks, createSnapshot(projectB, []))
    const redoResult = redoSnapshot(undoResult!.stacks, undoResult!.snapshot)

    expect(redoResult?.snapshot.project.duration).toBe(5)
  })
})
