import { parseTrial } from './io'
import type { Trial } from './types'

/** One entry of public/samples/index.json. */
export interface SampleEntry {
  file: string
  title: string
  description: string
  expected: string // reason code the trial was built or labelled to show, or CLEAN
  synthetic: boolean
}

const BASE = `${import.meta.env?.BASE_URL ?? '/'}samples/`

export async function loadSampleIndex(): Promise<SampleEntry[]> {
  const res = await fetch(`${BASE}index.json`)
  if (!res.ok) throw new Error(`could not load sample list (${res.status})`)
  return (await res.json()) as SampleEntry[]
}

export async function loadSample(entry: SampleEntry): Promise<Trial> {
  const res = await fetch(`${BASE}${entry.file}`)
  if (!res.ok) throw new Error(`could not load ${entry.file} (${res.status})`)
  return parseTrial(await res.text())
}
