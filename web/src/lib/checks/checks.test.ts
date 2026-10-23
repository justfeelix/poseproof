/**
 * Behaviour of every check on synthetic trials with known faults.
 *
 * A check that still returns 'todo' is reported as skipped, so the suite stays green while
 * you work. Once you implement a check, its tests run automatically. Synthetic trials are
 * only a sanity check: the real evaluation is on labelled recordings (GUIDE.md, step 10).
 */
import { describe, expect, it } from 'vitest'
import { LM } from '../pose/landmarks'
import type { Point4 } from '../pose/types'
import { SYNTHETIC_CASES, syntheticSquat, type SquatOptions } from '../synthetic/squat'
import { baselineFrames } from './calmStart'
import { findReps } from './tempo'
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

describe('rep detection and tempo', () => {
  it('findReps finds exactly 3 reps in the clean trial, with plausible descents', () => {
    const reps = findReps(syntheticSquat(SYNTHETIC_CASES.CLEAN).frames, DEFAULT_CONFIG)
    expect(reps).toHaveLength(3)
    for (const r of reps) {
      const descentS = (r.bottom - r.start) / 1000
      expect(descentS).toBeGreaterThan(0.7) // true descent 1.4 s; the start is the last moment near standing and the bottom is a noisy argmin on a flat plateau
      expect(descentS).toBeLessThan(1.7)
    }
  })

  it('finds no reps when the person only stands', () => {
    expect(findReps(syntheticSquat({ reps: 0 }).frames, DEFAULT_CONFIG)).toEqual([])
    expect(run('tempo', { reps: 0 }).detail).toContain('no reps')
  })

  it('marks the too fast descents on the timeline', () => {
    const r = run('tempo', SYNTHETIC_CASES.TOO_FAST)
    expect(r.status).toBe('fail')
    expect(r.spans).toHaveLength(3)
    expect(r.value).toBeLessThan(0.6)
  })
})

describe('depth, heels, calm start, stability details', () => {
  it('depth measures about the injected knee flexion', () => {
    expect(run('depth', SYNTHETIC_CASES.CLEAN).value).toBeGreaterThan(98)
    expect(run('depth', SYNTHETIC_CASES.CLEAN).value).toBeLessThan(110)
    expect(run('depth', SYNTHETIC_CASES.DEPTH_NOT_REACHED).value).toBeLessThan(55)
  })

  it('depth uses the near leg in the side test', () => {
    const r = run('depth', { ...SYNTHETIC_CASES.CLEAN, test: 'squat_side' })
    expect(r.status).toBe('pass')
    expect(r.value).toBeGreaterThan(98)
  })

  it('heels measures about the injected lift, in front and side test', () => {
    for (const test of ['squat_front', 'squat_side'] as const) {
      const r = run('heels', { ...SYNTHETIC_CASES.HEEL_LIFT, test })
      expect(r.status).toBe('fail')
      expect(r.value).toBeGreaterThan(0.04)
      expect(r.value).toBeLessThan(0.055)
      expect(r.spans?.length).toBeGreaterThan(0)
    }
  })

  it('calm_start fails when the trial is too short to know', () => {
    const trial = syntheticSquat(SYNTHETIC_CASES.CLEAN)
    const r = CHECK_BY_ID.calm_start.run(trial.frames.slice(0, 5), { test: trial.test, config: DEFAULT_CONFIG })
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('too short')
    expect(baselineFrames(trial.frames, DEFAULT_CONFIG).length).toBe(45)
  })

  it('calm_start reports where the person moved', () => {
    expect(run('calm_start', SYNTHETIC_CASES.NO_CALM_START).spans).toHaveLength(1)
  })

  it('stability shows where the tracker jumped', () => {
    const r = run('stability', SYNTHETIC_CASES.TRACKING_UNSTABLE)
    expect(r.status).toBe('fail')
    expect(r.spans?.length).toBeGreaterThan(0)
  })

  it('stability survives short dropouts of the tracker', () => {
    expect(run('stability', { dropoutFrames: 10 }).status).toBe('pass')
  })
})

describe('visibility details', () => {
  /** CLEAN trial with one landmark's visibility forced low in every frame. */
  const hide = (test: 'squat_front' | 'squat_side', name: keyof typeof LM) => {
    const trial = syntheticSquat({ ...SYNTHETIC_CASES.CLEAN, test })
    const frames = trial.frames.map((f) => ({
      ...f,
      poses: f.poses.map((p) => ({ ...p, image: p.image.map((pt, i) => (i === LM[name] ? ([pt[0], pt[1], pt[2], 0.1] as Point4) : pt)) })),
    }))
    return CHECK_BY_ID.visibility.run(frames, { test, config: DEFAULT_CONFIG })
  }

  it('fails when a leg joint is hidden in the front test and names it', () => {
    const r = hide('squat_front', 'left_knee')
    expect(r.status).toBe('fail')
    expect(r.detail).toContain('left_knee')
  })

  it('fails when a near-side joint is hidden in the side test', () => {
    expect(hide('squat_side', 'right_ankle').status).toBe('fail')
  })

  it('ignores the far side in the side test', () => {
    expect(hide('squat_side', 'left_ankle').status).toBe('pass')
  })
})
