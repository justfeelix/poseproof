import { CHECK_BY_ID, DEFAULT_CONFIG, evaluateTrial, type CheckConfig } from '../checks'
import type { Trial } from '../trial/types'

/** Columns of verdicts.csv, read by analysis/src/poseproof_analysis/evaluate.py. */
export const VERDICT_COLUMNS = ['trial_id', 'test', 'check_id', 'reason', 'status', 'value', 'threshold', 'unit', 'detail'] as const

export type VerdictRow = Record<(typeof VERDICT_COLUMNS)[number], string>

/** One row per check for a trial. */
export function verdictRows(trial: Trial, config: CheckConfig = DEFAULT_CONFIG): VerdictRow[] {
  return evaluateTrial(trial, config).results.map((r) => ({
    trial_id: trial.id,
    test: trial.test,
    check_id: r.id,
    reason: CHECK_BY_ID[r.id].reason,
    status: r.status,
    value: r.value === undefined ? '' : String(r.value),
    threshold: r.threshold === undefined ? '' : String(r.threshold),
    unit: r.unit ?? '',
    detail: r.detail ?? '',
  }))
}

const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function toCsv(rows: VerdictRow[]): string {
  const lines = [VERDICT_COLUMNS.join(',')]
  for (const row of rows) lines.push(VERDICT_COLUMNS.map((c) => quote(row[c])).join(','))
  return lines.join('\n') + '\n'
}
