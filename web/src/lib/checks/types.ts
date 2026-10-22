import type { Frame, TestKind } from '../trial/types'
import type { CheckConfig } from './config'

/** Why a trial is not valid. One reason per check; the evaluation script groups by these. */
export type ReasonCode =
  | 'OUT_OF_FRAME'
  | 'MULTI_PERSON'
  | 'WRONG_ORIENTATION'
  | 'JOINT_HIDDEN'
  | 'TRACKING_UNSTABLE'
  | 'NO_CALM_START'
  | 'DEPTH_NOT_REACHED'
  | 'HEEL_LIFT'
  | 'TOO_FAST'

export type CheckId =
  | 'framing'
  | 'one_person'
  | 'orientation'
  | 'visibility'
  | 'stability'
  | 'calm_start'
  | 'depth'
  | 'heels'
  | 'tempo'

/** pass / fail: decided. warn: borderline, shown but does not invalidate. todo: not implemented yet. */
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'todo'

export interface CheckResult {
  id: CheckId
  status: CheckStatus
  /** The measured quantity the decision is based on (for the report and the evaluation). */
  value?: number
  threshold?: number
  unit?: string
  /** Short technical explanation for developers, e.g. "left knee hidden in 34% of frames". */
  detail?: string
  /**
   * Optional: when the problem happened, as [start, end] in ms of trial time. The review
   * timeline draws these and lets the user jump there. Build them with spansOf() in util.ts.
   */
  spans?: [number, number][]
}

export interface CheckContext {
  test: TestKind
  config: CheckConfig
}

export interface CheckDef {
  id: CheckId
  reason: ReasonCode
  /** Shown in the checklist. */
  label: string
  /** What the member should do differently when this check fails. Plain words, one sentence. */
  feedback: string
  /** True if the check also makes sense on a short window (live guidance before recording). */
  live: boolean
  run(frames: Frame[], ctx: CheckContext): CheckResult
}

export interface Verdict {
  /** Valid if no implemented check failed. */
  valid: boolean
  /** False while some checks are still 'todo'. */
  complete: boolean
  results: CheckResult[]
  reasons: ReasonCode[]
  feedback: string[]
}
