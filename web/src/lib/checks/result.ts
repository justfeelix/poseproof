import type { CheckId, CheckResult } from './types'

/** Placeholder result for a check that is not implemented yet. */
export function todo(id: CheckId): CheckResult {
  return { id, status: 'todo', detail: 'not implemented yet' }
}

/**
 * Build a pass/fail result from a measured value.
 *   ok: true if the value is acceptable (you decide the direction: >= or <= threshold).
 */
export function decide(
  id: CheckId,
  ok: boolean,
  value: number,
  threshold: number,
  unit: string,
  detail?: string,
): CheckResult {
  return { id, status: ok ? 'pass' : 'fail', value, threshold, unit, detail }
}
