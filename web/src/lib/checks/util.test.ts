import { describe, expect, it } from 'vitest'
import type { Point4, PoseSample } from '../pose/types'
import { syntheticSquat } from '../synthetic/squat'
import {
  angleBetweenDeg, compact, fraction, jointAngleDeg, median, movingAverage, primaryPose,
  quantile, robustCv, seconds, std, track,
} from './util'

const poseAt = (x0: number, size: number): PoseSample => {
  const pts = Array.from({ length: 33 }, (_, i) => [x0 + (i % 2) * size, 0.2 + (i / 33) * size, 0, 1] as Point4)
  return { image: pts, world: pts }
}

describe('persons and series', () => {
  it('picks the person closest to the image centre as the primary one', () => {
    const side = poseAt(0.75, 0.4) // big, but at the edge
    const centre = poseAt(0.45, 0.1)
    expect(primaryPose({ t: 0, poses: [side, centre] })).toBe(centre)
    expect(primaryPose({ t: 0, poses: [] })).toBeNull()
  })

  it('tracks a landmark over time with nulls for empty frames', () => {
    const trial = syntheticSquat({ durationS: 1, dropoutFrames: 3 })
    const hip = track(trial.frames, 'left_hip')
    expect(hip.filter((p) => p === null)).toHaveLength(3)
    const { values, times } = compact(hip, seconds(trial.frames))
    expect(values).toHaveLength(27)
    expect(times).toHaveLength(27)
  })
})

describe('geometry', () => {
  it('measures angles in degrees', () => {
    expect(angleBetweenDeg([1, 0, 0], [0, 1, 0])).toBeCloseTo(90)
    expect(jointAngleDeg([0, -1, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(180) // straight
    expect(jointAngleDeg([0, -1, 0], [0, 0, 0], [1, 0, 0])).toBeCloseTo(90)
  })
})

describe('statistics', () => {
  it('computes robust summaries', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(quantile([0, 10], 0.25)).toBe(2.5)
    expect(std([1, 1, 1])).toBe(0)
    expect(robustCv([10, 10, 10])).toBe(0)
    expect(movingAverage([0, 3, 0], 3)).toEqual([1.5, 1, 1.5])
    expect(fraction([1, 2, 3, 4], (x) => x > 2)).toBe(0.5)
  })
})
