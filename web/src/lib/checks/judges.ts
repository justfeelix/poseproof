/**
 * Three judges, like on a powerlifting platform: each gives a white light (good) or a red
 * light (no). Here each judge stands for a group of checks.
 */
import type { CheckId, CheckResult } from './types'

export type JudgeId = 'setup' | 'tracking' | 'movement'
export type Light = 'white' | 'red' | 'off'

export interface Judge {
  id: JudgeId
  name: string
  question: string
  checks: CheckId[]
}

export const JUDGES: Judge[] = [
  {
    id: 'setup',
    name: 'Setup',
    question: 'Can the camera see the right person, the right way round?',
    checks: ['framing', 'one_person', 'orientation', 'visibility'],
  },
  {
    id: 'tracking',
    name: 'Tracking',
    question: 'Did the tracker follow the body, from a calm start?',
    checks: ['stability', 'calm_start'],
  },
  {
    id: 'movement',
    name: 'Movement',
    question: 'Was the squat done the way the test asks?',
    checks: ['depth', 'heels', 'tempo'],
  },
]

/** Red if any of the judge's checks failed, white if at least one passed and none failed, off otherwise. */
export function lightFor(judge: Judge, results: CheckResult[]): Light {
  const mine = results.filter((r) => judge.checks.includes(r.id))
  if (mine.some((r) => r.status === 'fail')) return 'red'
  if (mine.some((r) => r.status === 'pass' || r.status === 'warn')) return 'white'
  return 'off'
}
