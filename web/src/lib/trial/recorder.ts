import type { PoseSample } from '../pose/types'
import { TRIAL_SCHEMA, type Frame, type TestKind, type Trial } from './types'

export interface RecorderMeta {
  test: TestKind
  model: string
  image: { width: number; height: number }
  mirrored: boolean
  source?: Trial['source']
}

/** "2026-10-24T10-31-05_squat_front": sortable and safe as a file name. */
export function trialId(date: Date, test: TestKind): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  return `${stamp}_${test}`
}

/** Collects frames between start() and stop(). Timestamps become relative to the first frame. */
export class TrialRecorder {
  private frames: Frame[] = []
  private t0: number | null = null
  private meta: RecorderMeta | null = null
  private startedAt: Date | null = null

  get recording(): boolean {
    return this.meta !== null
  }

  get frameCount(): number {
    return this.frames.length
  }

  /** Milliseconds since the first recorded frame. */
  get elapsed(): number {
    const last = this.frames[this.frames.length - 1]
    return last ? last.t : 0
  }

  start(meta: RecorderMeta, now: Date = new Date()) {
    this.frames = []
    this.t0 = null
    this.meta = meta
    this.startedAt = now
  }

  push(tMs: number, poses: PoseSample[]) {
    if (!this.meta) return
    if (this.t0 === null) this.t0 = tMs
    this.frames.push({ t: Math.round((tMs - this.t0) * 10) / 10, poses })
  }

  stop(): Trial | null {
    if (!this.meta || !this.startedAt) return null
    const { test, model, image, mirrored, source = 'webcam' } = this.meta
    const trial: Trial = {
      schema: TRIAL_SCHEMA,
      id: trialId(this.startedAt, test),
      test,
      createdAt: this.startedAt.toISOString(),
      source,
      model,
      image,
      mirrored,
      frames: this.frames,
    }
    this.meta = null
    this.startedAt = null
    this.frames = []
    return trial
  }
}
