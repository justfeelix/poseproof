/**
 * Writes synthetic demo trials to public/samples/ for the replay view.
 *   npm run make-samples
 * Replace or extend them with real recordings later (see GUIDE.md, step 9).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { serializeTrial } from '../src/lib/trial/io'
import { SYNTHETIC_CASES, syntheticSquat } from '../src/lib/synthetic/squat'
import type { SampleEntry } from '../src/lib/trial/samples'

const DESCRIPTIONS: Record<string, [string, string]> = {
  CLEAN: ['Good squat', 'Three controlled reps after a calm start.'],
  OUT_OF_FRAME: ['Feet cut off', 'The camera is too low or too close; the feet leave the image.'],
  MULTI_PERSON: ['Someone walks in', 'A second person enters the frame halfway through.'],
  WRONG_ORIENTATION: ['Turned away', 'The front test is done turned about 40 degrees away from the camera.'],
  TRACKING_UNSTABLE: ['Tracker glitches', 'The left knee jumps in some frames, like a tracking failure.'],
  NO_CALM_START: ['No calm start', 'Squatting starts immediately, with no standing baseline.'],
  DEPTH_NOT_REACHED: ['Too shallow', 'Reps stop at about 45 degrees of knee flexion.'],
  HEEL_LIFT: ['Heels lift', 'Heels come about 5 cm off the floor at the bottom.'],
  TOO_FAST: ['Too fast', 'Each rep takes well under a second.'],
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'samples')
mkdirSync(outDir, { recursive: true })

const index: SampleEntry[] = []
for (const [code, options] of Object.entries(SYNTHETIC_CASES)) {
  // 15 fps and 3 decimals (1 mm in world coordinates) keep each file around 0.4 MB.
  const trial = syntheticSquat({ ...options, fps: 15, durationS: 14, seed: 42 })
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  for (const f of trial.frames) {
    for (const p of f.poses) {
      p.image = p.image.map(([x, y, z, v]) => [r3(x), r3(y), r3(z), v])
      p.world = p.world.map(([x, y, z, v]) => [r3(x), r3(y), r3(z), v])
    }
  }
  trial.id = `synthetic_${code.toLowerCase()}`
  const file = `${trial.id}.json`
  writeFileSync(join(outDir, file), serializeTrial(trial))
  const [title, description] = DESCRIPTIONS[code] ?? [code, '']
  index.push({ file, title, description, expected: code, synthetic: true })
}
writeFileSync(join(outDir, 'index.json'), JSON.stringify(index, null, 2) + '\n')
console.log(`wrote ${index.length} samples to ${outDir}`)
