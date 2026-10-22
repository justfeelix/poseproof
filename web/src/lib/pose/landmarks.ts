// MediaPipe Pose: 33 landmarks. "left" and "right" are the person's own sides,
// independent of whether the camera image is mirrored on screen.
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const LANDMARK_NAMES = [
  'nose',
  'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer',
  'left_ear', 'right_ear',
  'mouth_left', 'mouth_right',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_pinky', 'right_pinky',
  'left_index', 'right_index',
  'left_thumb', 'right_thumb',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle',
  'left_heel', 'right_heel',
  'left_foot_index', 'right_foot_index',
] as const

export type LandmarkName = (typeof LANDMARK_NAMES)[number]

export const NUM_LANDMARKS = LANDMARK_NAMES.length // 33

/** Index of a landmark by name, e.g. LM.left_hip === 23. */
export const LM = Object.fromEntries(LANDMARK_NAMES.map((n, i) => [n, i])) as Record<LandmarkName, number>

/** Bones drawn in the overlay (same pairs as PoseLandmarker.POSE_CONNECTIONS). */
export const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
]

/** Body bones whose length should stay constant during a test (used by the stability check). */
export const RIGID_BONES: Record<string, [LandmarkName, LandmarkName]> = {
  left_thigh: ['left_hip', 'left_knee'],
  right_thigh: ['right_hip', 'right_knee'],
  left_shank: ['left_knee', 'left_ankle'],
  right_shank: ['right_knee', 'right_ankle'],
  left_upper_arm: ['left_shoulder', 'left_elbow'],
  right_upper_arm: ['right_shoulder', 'right_elbow'],
  shoulder_width: ['left_shoulder', 'right_shoulder'],
  hip_width: ['left_hip', 'right_hip'],
}

export function isLeft(i: number): boolean {
  return LANDMARK_NAMES[i].startsWith('left_')
}

export function isRight(i: number): boolean {
  return LANDMARK_NAMES[i].startsWith('right_')
}
