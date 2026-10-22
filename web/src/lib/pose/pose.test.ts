import { describe, expect, it } from 'vitest'
import { CONNECTIONS, LM, NUM_LANDMARKS, RIGID_BONES } from './landmarks'
import { posesFromResult } from './types'

describe('landmarks', () => {
  it('has the 33 MediaPipe landmarks at the documented indices', () => {
    expect(NUM_LANDMARKS).toBe(33)
    expect(LM.nose).toBe(0)
    expect(LM.left_shoulder).toBe(11)
    expect(LM.left_hip).toBe(23)
    expect(LM.left_heel).toBe(29)
    expect(LM.right_foot_index).toBe(32)
  })

  it('connections and bones only use valid indices', () => {
    for (const [a, b] of CONNECTIONS) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(33)
    }
    for (const [a, b] of Object.values(RIGID_BONES)) {
      expect(LM[a]).toBeDefined()
      expect(LM[b]).toBeDefined()
    }
  })
})

describe('posesFromResult', () => {
  it('converts and rounds landmarks, keeping persons in order', () => {
    const lm = { x: 0.123456, y: 0.5, z: -0.0333333, visibility: 0.98765 }
    const w = { x: 0.1, y: -0.2, z: 0.3, visibility: 0.9 }
    const poses = posesFromResult({ landmarks: [[lm], [lm]], worldLandmarks: [[w], [w]] })
    expect(poses).toHaveLength(2)
    expect(poses[0].image[0]).toEqual([0.1235, 0.5, -0.0333, 0.988])
    expect(poses[0].world[0]).toEqual([0.1, -0.2, 0.3, 0.9])
  })

  it('returns an empty list when nobody is detected', () => {
    expect(posesFromResult({ landmarks: [], worldLandmarks: [] })).toEqual([])
  })
})
