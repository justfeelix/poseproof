<script lang="ts">
  import { onMount } from 'svelte'
  import ReportCard from './ReportCard.svelte'
  import TrialPlayer from './TrialPlayer.svelte'
  import { evaluateTrial } from '../lib/checks'
  import { parseTrial } from '../lib/trial/io'
  import { loadSample, loadSampleIndex, type SampleEntry } from '../lib/trial/samples'
  import { TEST_LABELS, type Trial } from '../lib/trial/types'

  let samples = $state<SampleEntry[]>([])
  let selected = $state<string | null>(null)
  let trial = $state<Trial | null>(null)
  let error = $state('')
  let expected = $state<string | undefined>(undefined)

  const verdict = $derived(trial ? evaluateTrial(trial) : null)

  onMount(async () => {
    try {
      samples = await loadSampleIndex()
      if (samples.length) await pick(samples[0])
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
  })

  async function pick(entry: SampleEntry) {
    error = ''
    try {
      trial = await loadSample(entry)
      selected = entry.file
      expected = entry.expected
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
    }
  }

  async function openFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    error = ''
    try {
      trial = parseTrial(await file.text())
      selected = null
      expected = undefined
    } catch (err) {
      error = `${file.name} could not be opened: ${err instanceof Error ? err.message : String(err)}.`
    }
  }
</script>

<div class="head">
  <h1>Replay</h1>
  <p class="quiet">
    Recorded trials, stored as body landmarks only. Pick one and see how the three judges decide.
  </p>
</div>

<div class="layout">
  <nav class="heats" aria-label="Sample trials">
    <ul>
      {#each samples as s (s.file)}
        <li>
          <button class:active={selected === s.file} aria-current={selected === s.file} onclick={() => pick(s)}>
            <span class="t">{s.title}</span>
            <span class="d">{s.description}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if samples.some((s) => s.synthetic)}
      <p class="note quiet">
        These samples are synthetic stick figures with one built-in fault each. Real recordings follow.
      </p>
    {/if}
    <label class="open btn">
      Open a saved trial
      <input type="file" accept="application/json,.json" onchange={openFile} />
    </label>
  </nav>

  <section class="player">
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if trial}
      <div class="meta">
        <span>{TEST_LABELS[trial.test]}</span>
        <span class="quiet num">{trial.frames.length} frames</span>
      </div>
      <TrialPlayer {trial} />
    {:else if !error}
      <p class="quiet">Pick a sample, or open a trial you saved from the live test.</p>
    {/if}
  </section>

  <div class="board">
    {#if verdict && trial}
      {#key trial.id + (selected ?? '')}
        <ReportCard {verdict} {expected} />
      {/key}
    {/if}
  </div>
</div>

<style>
  .head {
    margin-bottom: 1.25rem;
  }
  h1 {
    font-size: var(--step-4);
  }
  .head p {
    margin-top: 0.35rem;
    max-width: 60ch;
  }
  .layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr) minmax(280px, 340px);
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: 220px minmax(0, 1fr);
    }
    .board {
      grid-column: 2;
    }
  }
  @media (max-width: 720px) {
    .layout {
      grid-template-columns: 1fr;
    }
    .board {
      grid-column: auto;
    }
    .player {
      order: -1;
    }
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 2px solid var(--ink);
  }
  li button {
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.7rem 0.6rem;
    border: 0;
    border-bottom: 1px solid var(--line);
    background: transparent;
    transition: background-color 140ms var(--ease);
  }
  li button:hover {
    background: var(--plate);
  }
  li button.active {
    background: var(--ink);
    color: var(--chalk);
  }
  .t {
    font-weight: 700;
  }
  .d {
    font-size: var(--step--1);
    color: var(--steel);
    line-height: 1.35;
  }
  .active .d {
    color: #bdbdbd;
  }
  .note {
    margin-top: 0.75rem;
    font-size: var(--step--1);
  }
  .open {
    margin-top: 1rem;
    position: relative;
    cursor: pointer;
  }
  .open input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
  .open:focus-within {
    outline: 3px solid var(--signal);
    outline-offset: 2px;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    font-weight: 650;
  }
  .error {
    color: var(--nolift);
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
</style>
