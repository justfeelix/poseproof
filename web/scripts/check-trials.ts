/**
 * Run all checks over a folder of trial files and write one CSV row per trial and check.
 *
 *   npm run check-trials                       # ../data/trials -> ../data/verdicts.csv
 *   npm run check-trials -- <dir> <out.csv>
 *
 * The rules live only in src/lib/checks (TypeScript); this script makes their output
 * available to the Python evaluation (analysis/src/poseproof_analysis/evaluate.py).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { toCsv, verdictRows, type VerdictRow } from '../src/lib/eval/rows'
import { parseTrial } from '../src/lib/trial/io'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const inDir = resolve(process.argv[2] ?? join(root, 'data', 'trials'))
const outFile = resolve(process.argv[3] ?? join(root, 'data', 'verdicts.csv'))

const files = readdirSync(inDir).filter((f) => f.endsWith('.json')).sort()
if (files.length === 0) {
  console.error(`no .json trials in ${inDir}`)
  process.exit(1)
}

const rows: VerdictRow[] = []
let invalid = 0
for (const file of files) {
  try {
    const trial = parseTrial(readFileSync(join(inDir, file), 'utf8'))
    const r = verdictRows(trial)
    if (r.some((x) => x.status === 'fail')) invalid++
    rows.push(...r)
  } catch (err) {
    console.error(`skipped ${file}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

writeFileSync(outFile, toCsv(rows))
console.log(`${files.length} trials, ${invalid} flagged invalid -> ${outFile}`)
