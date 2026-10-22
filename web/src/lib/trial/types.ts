import type { PoseSample } from '../pose/types'

/** Version tag of the trial file format. Bump it when the format changes. */
export const TRIAL_SCHEMA = 'poseproof.trial/1'

/** squat_front: facing the camera. squat_side: side-on, 90 degrees to the camera. */
export type TestKind = 'squat_front' | 'squat_side'

export const TEST_LABELS: Record<TestKind, string> = {
  squat_front: 'Squat, facing the camera',
  squat_side: 'Squat, side-on to the camera',
}

/** One processed video frame. t: milliseconds since the trial started. */
export interface Frame {
  t: number
  poses: PoseSample[] // every detected person, possibly empty
}

/**
 * A recorded trial: landmarks only, never images. This is what the app downloads, what the
 * replay view plays, and what the evaluation scripts read.
 */
export interface Trial {
  schema: typeof TRIAL_SCHEMA
  id: string
  test: TestKind
  createdAt: string // ISO 8601
  source: 'webcam' | 'video'
  model: string // e.g. "full/GPU"
  image: { width: number; height: number } // pixels, to convert normalised x/y if needed
  mirrored: boolean // only how it was shown on screen; landmarks are never mirrored
  frames: Frame[]
  note?: string
}
