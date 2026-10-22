import { describe, expect, it } from 'vitest'
import { CHECKS } from '../checks'
import { SYNTHETIC_CASES, syntheticSquat } from '../synthetic/squat'
import { toCsv, verdictRows } from './rows'

describe('verdict rows', () => {
  it('writes one row per check with the reason code', () => {
    const rows = verdictRows(syntheticSquat(SYNTHETIC_CASES.OUT_OF_FRAME))
    expect(rows).toHaveLength(CHECKS.length)
    const framing = rows.find((r) => r.check_id === 'framing')!
    expect(framing.reason).toBe('OUT_OF_FRAME')
    expect(framing.status).toBe('fail')
  })

  it('quotes CSV fields that need it', () => {
    const rows = verdictRows(syntheticSquat({ durationS: 1 }))
    rows[0].detail = 'a, "b"'
    expect(toCsv(rows)).toContain('"a, ""b"""')
    expect(toCsv(rows).split('\n')[0]).toBe('trial_id,test,check_id,reason,status,value,threshold,unit,detail')
  })
})
