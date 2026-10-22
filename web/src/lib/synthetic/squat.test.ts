import { describe, expect, it } from 'vitest'
import { LM } from '../pose/landmarks'
import { parseTrial, serializeTrial } from '../trial/io'
import { SYNTHETIC_CASES, syntheticSquat } from './squat'

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])

describe('syntheticSquat', () => {
  it('produces a valid trial file', () => {
    const t = syntheticSquat()
    expect(() => parseTrial(serializeTrial(t))).not.toThrow()
    expect(t.frames.length).toBe(14 * 30)
  })

  it('keeps thigh and shank lengths constant (world, metres)', () => {
    const t = syntheticSquat({ noiseM: 0 })
    for (const f of t.frames) {
      const w = f.poses[0].world
      expect(dist(w[LM.left_hip], w[LM.left_knee])).toBeCloseTo(0.45, 3)
      expect(dist(w[LM.right_knee], w[LM.right_ankle])).toBeCloseTo(0.43, 3)
    }
  })

  it('puts the hip midpoint at the world origin', () => {
    const w = syntheticSquat({ noiseM: 0 }).frames[100].poses[0].world
    const mid = [0, 1, 2].map((k) => (w[LM.left_hip][k] + w[LM.right_hip][k]) / 2)
    mid.forEach((v) => expect(v).toBeCloseTo(0, 6))
  })

  it('goes down: hips are lowest at the bottom of a rep (image y grows downwards)', () => {
    const t = syntheticSquat({ noiseM: 0 })
    const hipY = t.frames.map((f) => f.poses[0].image[LM.left_hip][1])
    expect(Math.max(...hipY) - hipY[0]).toBeGreaterThan(0.1)
  })

  it('keeps a clean trial inside the image and pushes OUT_OF_FRAME feet outside', () => {
    const inside = syntheticSquat().frames.every((f) => f.poses[0].image.every((p) => p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1))
    expect(inside).toBe(true)
    const cut = syntheticSquat(SYNTHETIC_CASES.OUT_OF_FRAME).frames[0].poses[0].image[LM.left_heel][1]
    expect(cut).toBeGreaterThan(1)
  })

  it('adds a second person when asked', () => {
    const t = syntheticSquat(SYNTHETIC_CASES.MULTI_PERSON)
    expect(t.frames[0].poses).toHaveLength(1)
    expect(t.frames.at(-1)!.poses).toHaveLength(2)
  })

  it('is deterministic for a given seed', () => {
    expect(syntheticSquat({ seed: 7 })).toEqual(syntheticSquat({ seed: 7 }))
  })
})
