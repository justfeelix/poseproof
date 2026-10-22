import { describe, expect, it } from 'vitest'
import type { PoseSample, Point4 } from '../pose/types'
import { parseTrial, serializeTrial } from './io'
import { TrialRecorder, trialId } from './recorder'

const pose = (): PoseSample => {
  const p: Point4 = [0.5, 0.5, 0, 0.9]
  return { image: Array.from({ length: 33 }, () => [...p] as Point4), world: Array.from({ length: 33 }, () => [...p] as Point4) }
}

const meta = { test: 'squat_front' as const, model: 'full/GPU', image: { width: 1280, height: 720 }, mirrored: true }

describe('TrialRecorder', () => {
  it('makes timestamps relative to the first frame', () => {
    const r = new TrialRecorder()
    r.start(meta, new Date(2026, 9, 24, 10, 31, 5))
    r.push(1000, [pose()])
    r.push(1033.3, [])
    r.push(1066.7, [pose()])
    const trial = r.stop()!
    expect(trial.frames.map((f) => f.t)).toEqual([0, 33.3, 66.7])
    expect(trial.id).toBe('2026-10-24T10-31-05_squat_front')
    expect(r.recording).toBe(false)
  })

  it('ignores frames when not recording', () => {
    const r = new TrialRecorder()
    r.push(0, [pose()])
    expect(r.frameCount).toBe(0)
    expect(r.stop()).toBeNull()
  })
})

describe('trial files', () => {
  it('round-trips through JSON', () => {
    const r = new TrialRecorder()
    r.start(meta)
    r.push(0, [pose()])
    const trial = r.stop()!
    expect(parseTrial(serializeTrial(trial))).toEqual(trial)
  })

  it('rejects wrong schema and broken frames with a readable message', () => {
    expect(() => parseTrial('{"schema":"x"}')).toThrow(/schema/)
    const r = new TrialRecorder()
    r.start(meta)
    r.push(0, [pose()])
    const bad = r.stop()!
    bad.frames[0].poses[0].image.pop()
    expect(() => parseTrial(JSON.stringify(bad))).toThrow(/33/)
  })

  it('pads trial ids', () => {
    expect(trialId(new Date(2026, 0, 2, 3, 4, 5), 'squat_side')).toBe('2026-01-02T03-04-05_squat_side')
  })
})
