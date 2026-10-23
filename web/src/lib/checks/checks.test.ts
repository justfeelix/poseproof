/**
 * Behaviour of every check on synthetic trials with known faults.
 *
 * A check that still returns 'todo' is reported as skipped, so the suite stays green while
 * you work. Once you implement a check, its tests run automatically. Synthetic trials are
 * only a sanity check: the real evaluation is on labelled recordings (GUIDE.md, step 10).
 */
import { describe, expect, it } from 'vitest'
import type { Point4 } from '../pose/types'
import { SYNTHETIC_CASES, syntheticSquat, type SquatOptions } from '../synthetic/squat'
import { CHECK_BY_ID, CHECKS, DEFAULT_CONFIG, evaluateLive, evaluateTrial, type CheckId } from './index'

/** Which synthetic fault each check must catch (visibility has none: test it on real data). */
const MUST_CATCH: Partial<Record<CheckId, keyof typeof SYNTHETIC_CASES>> = {
  framing: 'OUT_OF_FRAME',
  one_person: 'MULTI_PERSON',
  orientation: 'WRONG_ORIENTATION',
  stability: 'TRACKING_UNSTABLE',
  calm_start: 'NO_CALM_START',
  depth: 'DEPTH_NOT_REACHED',
  heels: 'HEEL_LIFT',
  tempo: 'TOO_FAST',
}

const run = (id: CheckId, options: SquatOptions) => {
  const trial = syntheticSquat(options)
  return CHECK_BY_ID[id].run(trial.frames, { test: trial.test, config: DEFAULT_CONFIG })
}

describe.each(CHECKS.map((c) => c.id))('check %s', (id) => {
  it('passes a clean front trial', (ctx) => {
    const r = run(id, SYNTHETIC_CASES.CLEAN)
    if (r.status === 'todo') ctx.skip()
    expect(r.status, r.detail).toBe('pass')
  })

  it('passes a clean side trial', (ctx) => {
    const r = run(id, { ...SYNTHETIC_CASES.CLEAN, test: 'squat_side' })
    if (r.status === 'todo') ctx.skip()
    expect(r.status, r.detail).toBe('pass')
  })

  const fault = MUST_CATCH[id]
  if (fault) {
    it(`fails on ${fault}`, (ctx) => {
      const r = run(id, SYNTHETIC_CASES[fault])
      if (r.status === 'todo') ctx.skip()
      expect(r.status, r.detail).toBe('fail')
    })
  }

  it('returns its own id and never throws on an empty trial', () => {
    const r = CHECK_BY_ID[id].run([], { test: 'squat_front', config: DEFAULT_CONFIG })
    expect(r.id).toBe(id)
  })
})

describe('spans', () => {
  it('framing reports when the feet were out of the picture', () => {
    const r = run('framing', SYNTHETIC_CASES.OUT_OF_FRAME)
    expect(r.spans?.length).toBeGreaterThan(0)
    expect(run('framing', SYNTHETIC_CASES.CLEAN).spans).toEqual([])
  })
})

describe('verdict', () => {
  it('lists the reason and feedback of every failed check', () => {
    const v = evaluateTrial(syntheticSquat(SYNTHETIC_CASES.OUT_OF_FRAME))
    expect(v.valid).toBe(false)
    expect(v.reasons).toContain('OUT_OF_FRAME')
    expect(v.feedback.length).toBe(v.reasons.length)
  })

  it('live mode only runs live checks', () => {
    const v = evaluateLive(syntheticSquat({ durationS: 1 }).frames, 'squat_front')
    expect(v.results.every((r) => CHECK_BY_ID[r.id].live)).toBe(true)
  })
})

describe('one_person details', () => {
  /** CLEAN trial plus a second person on the right, scaled by `scale` (box area ~ scale squared). */
  const withBystander = (scale: number) => {
    const trial = syntheticSquat(SYNTHETIC_CASES.CLEAN)
    const frames = trial.frames.map((f) => {
      const p = f.poses[0]
      const image = p.image.map(([x, y, z, v]) => [0.85 + (x - 0.5) * scale, 0.5 + (y - 0.5) * scale, z, v] as Point4)
      return { ...f, poses: [p, { ...p, image }] }
    })
    return CHECK_BY_ID.one_person.run(frames, { test: trial.test, config: DEFAULT_CONFIG })
  }

  it('ignores a tiny detection in the background', () => {
    expect(withBystander(0.3).status).toBe('pass')
  })

  it('fails on a full-size bystander and reports when', () => {
    const r = withBystander(0.8)
    expect(r.status).toBe('fail')
    expect(r.spans?.length).toBeGreaterThan(0)
  })

  it('reports the start of the second person for MULTI_PERSON', () => {
    const r = run('one_person', SYNTHETIC_CASES.MULTI_PERSON)
    expect(r.detail).toContain('from 5.0 s')
  })
})

describe('orientation details', () => {
  it('lets a small turn pass in the front test', () => {
    expect(run('orientation', { yawDeg: 15 }).status).toBe('pass')
  })

  it('fails in the side test when the person faces the camera', () => {
    const r = run('orientation', { test: 'squat_side', yawDeg: -90 })
    expect(r.status).toBe('fail')
    expect(r.value).toBeLessThan(10)
  })

  it('measures about the injected turn and reports spans when wrong', () => {
    const r = run('orientation', SYNTHETIC_CASES.WRONG_ORIENTATION)
    expect(r.value).toBeGreaterThan(35)
    expect(r.value).toBeLessThan(45)
    expect(r.spans?.length).toBeGreaterThan(0)
  })
})
