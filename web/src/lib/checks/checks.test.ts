/**
 * Behaviour of every check on synthetic trials with known faults.
 *
 * A check that still returns 'todo' is reported as skipped, so the suite stays green while
 * you work. Once you implement a check, its tests run automatically. Synthetic trials are
 * only a sanity check: the real evaluation is on labelled recordings (GUIDE.md, step 10).
 */
import { describe, expect, it } from 'vitest'
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
