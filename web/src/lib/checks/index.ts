import type { Frame, TestKind, Trial } from '../trial/types'
import { calmStart } from './calmStart'
import { DEFAULT_CONFIG, type CheckConfig } from './config'
import { depth } from './depth'
import { framing } from './framing'
import { heels } from './heels'
import { onePerson } from './onePerson'
import { orientation } from './orientation'
import { stability } from './stability'
import { tempo } from './tempo'
import type { CheckDef, CheckResult, Verdict } from './types'
import { visibility } from './visibility'

export type { CheckDef, CheckResult, Verdict, ReasonCode, CheckId, CheckStatus } from './types'
export { DEFAULT_CONFIG, type CheckConfig } from './config'

/** All checks, in the order the checklist shows them: setup first, then movement. */
export const CHECKS: CheckDef[] = [framing, onePerson, orientation, visibility, stability, calmStart, depth, heels, tempo]

export const CHECK_BY_ID = Object.fromEntries(CHECKS.map((c) => [c.id, c])) as Record<CheckDef['id'], CheckDef>

/** Run one check; a crash becomes a visible 'warn' instead of breaking the whole report. */
function safeRun(check: CheckDef, frames: Frame[], test: TestKind, config: CheckConfig): CheckResult {
  try {
    return check.run(frames, { test, config })
  } catch (err) {
    return { id: check.id, status: 'warn', detail: `error: ${err instanceof Error ? err.message : String(err)}` }
  }
}

function summarize(checks: CheckDef[], results: CheckResult[]): Verdict {
  const failed = results.filter((r) => r.status === 'fail')
  return {
    valid: failed.length === 0,
    complete: results.every((r) => r.status !== 'todo'),
    results,
    reasons: failed.map((r) => checks.find((c) => c.id === r.id)!.reason),
    feedback: failed.map((r) => checks.find((c) => c.id === r.id)!.feedback),
  }
}

/** Full verdict for a recorded trial. */
export function evaluateTrial(trial: Trial, config: CheckConfig = DEFAULT_CONFIG): Verdict {
  return summarize(CHECKS, CHECKS.map((c) => safeRun(c, trial.frames, trial.test, config)))
}

/** Live guidance: only the checks that make sense on a short window (e.g. the last second). */
export function evaluateLive(frames: Frame[], test: TestKind, config: CheckConfig = DEFAULT_CONFIG): Verdict {
  const live = CHECKS.filter((c) => c.live)
  return summarize(live, live.map((c) => safeRun(c, frames, test, config)))
}
