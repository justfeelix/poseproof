import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

// Keep this equal to the exact version in package.json: the JS bundle and the wasm files
// must come from the same release.
const TASKS_VISION_VERSION = '1.1.1'
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`

export type ModelVariant = 'lite' | 'full' | 'heavy'

const modelUrl = (v: ModelVariant) =>
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${v}/float16/latest/pose_landmarker_${v}.task`

export interface DetectorInfo {
  variant: ModelVariant
  delegate: 'GPU' | 'CPU'
}

/**
 * Create a PoseLandmarker in VIDEO mode. numPoses = 2 so the one-person check can see a
 * second person walking into the frame. Tries the GPU first and falls back to the CPU.
 */
export async function createDetector(
  variant: ModelVariant = 'full',
  numPoses = 2,
): Promise<{ landmarker: PoseLandmarker; info: DetectorInfo }> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
  for (const delegate of ['GPU', 'CPU'] as const) {
    try {
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl(variant), delegate },
        runningMode: 'VIDEO',
        numPoses,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
      return { landmarker, info: { variant, delegate } }
    } catch (err) {
      if (delegate === 'CPU') throw err
      console.warn('GPU delegate failed, falling back to CPU', err)
    }
  }
  throw new Error('unreachable')
}
