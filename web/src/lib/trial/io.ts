import { NUM_LANDMARKS } from '../pose/landmarks'
import { TRIAL_SCHEMA, type Trial } from './types'

/** Parse and validate a trial file. Throws an Error with a readable message if invalid. */
export function parseTrial(text: string): Trial {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('not valid JSON')
  }
  const t = data as Partial<Trial>
  if (t.schema !== TRIAL_SCHEMA) throw new Error(`expected schema "${TRIAL_SCHEMA}", got "${String(t.schema)}"`)
  if (t.test !== 'squat_front' && t.test !== 'squat_side') throw new Error(`unknown test "${String(t.test)}"`)
  if (!Array.isArray(t.frames)) throw new Error('frames missing')
  if (!t.image || !(t.image.width > 0) || !(t.image.height > 0)) throw new Error('image size missing')
  t.frames.forEach((f, i) => {
    if (typeof f.t !== 'number') throw new Error(`frame ${i}: t missing`)
    if (i > 0 && f.t < t.frames![i - 1].t) throw new Error(`frame ${i}: time goes backwards`)
    if (!Array.isArray(f.poses)) throw new Error(`frame ${i}: poses missing`)
    for (const p of f.poses) {
      if (p.image?.length !== NUM_LANDMARKS || p.world?.length !== NUM_LANDMARKS) {
        throw new Error(`frame ${i}: each pose needs ${NUM_LANDMARKS} image and world landmarks`)
      }
    }
  })
  return t as Trial
}

export function serializeTrial(trial: Trial): string {
  return JSON.stringify(trial)
}

/** Browser only: save the trial as <id>.json. */
export function downloadTrial(trial: Trial) {
  const blob = new Blob([serializeTrial(trial)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${trial.id}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
