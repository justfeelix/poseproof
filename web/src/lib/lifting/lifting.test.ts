import { describe, expect, it } from 'vitest'
import { LM } from '../pose/landmarks'
import { SYNTHETIC_CASES, syntheticSquat } from '../synthetic/squat'
import { hipTrail, toScene } from '../viz/scene3d'
import { mediapipeLifter, temporalLifter } from './index'

describe('lifters', () => {
  it('MediaPipe lifter returns the world landmarks, null for empty frames', async () => {
    const t = syntheticSquat({ durationS: 1, dropoutFrames: 2 })
    const out = await mediapipeLifter.lift(t.frames)
    expect(out).toHaveLength(t.frames.length)
    expect(out.filter((p) => p === null)).toHaveLength(2)
    const i = out.findIndex((p) => p !== null)
    expect(out[i]![LM.left_knee]).toEqual(t.frames[i].poses[0].world[LM.left_knee].slice(0, 3))
  })

  it('temporal lifter is declared but not available yet', async () => {
    expect(temporalLifter.available).toBe(false)
    await expect(temporalLifter.lift([])).rejects.toThrow()
  })
})

describe('3D scene coordinates', () => {
  it('stands the figure on the floor with y up', async () => {
    const t = syntheticSquat({ noiseM: 0 })
    const [pose] = await mediapipeLifter.lift(t.frames.slice(0, 1))
    const { pts } = toScene(pose!)
    const feet = [LM.left_heel, LM.right_heel, LM.left_foot_index, LM.right_foot_index].map((i) => pts[i].y)
    expect(Math.min(...feet)).toBeCloseTo(0, 6)
    expect(pts[LM.nose].y).toBeGreaterThan(1.4) // head well above the floor
  })

  it('hip path goes down and up during the squats', async () => {
    const t = syntheticSquat({ ...SYNTHETIC_CASES.CLEAN, noiseM: 0 })
    const trail = hipTrail(await mediapipeLifter.lift(t.frames))
    const ys = trail.map((p) => p[1])
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.2)
  })
})
