import { describe, expect, it } from 'vitest'
import { CHECKS } from './index'
import { JUDGES, lightFor } from './judges'
import type { CheckResult } from './types'

describe('judges', () => {
  it('cover every check exactly once', () => {
    const all = JUDGES.flatMap((j) => j.checks).sort()
    expect(all).toEqual(CHECKS.map((c) => c.id).sort())
  })

  it('light red on any failure, white on a pass, off when nothing is decided', () => {
    const setup = JUDGES[0]
    const r = (id: CheckResult['id'], status: CheckResult['status']): CheckResult => ({ id, status })
    expect(lightFor(setup, [r('framing', 'pass'), r('one_person', 'todo')])).toBe('white')
    expect(lightFor(setup, [r('framing', 'pass'), r('one_person', 'fail')])).toBe('red')
    expect(lightFor(setup, [r('framing', 'todo')])).toBe('off')
    expect(lightFor(setup, [r('depth', 'fail')])).toBe('off') // not this judge's check
  })
})
