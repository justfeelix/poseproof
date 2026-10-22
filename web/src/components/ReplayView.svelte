<script lang="ts">
  import { onMount } from 'svelte'
  import TrialPlayer from './TrialPlayer.svelte'
  import { parseTrial } from '../lib/trial/io'
  import { loadSample, loadSampleIndex, type SampleEntry } from '../lib/trial/samples'
  import { TEST_LABELS, type Trial } from '../lib/trial/types'

  let samples = $state<SampleEntry[]>([])
  let selected = $state<string | null>(null)
  let trial = $state<Trial | null>(null)
  let error = $state('')

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
    } catch (err) {
      error = `${file.name}: ${err instanceof Error ? err.message : String(err)}`
    }
  }
</script>

<div class="layout">
  <aside>
    <h3>Samples</h3>
    <ul>
      {#each samples as s (s.file)}
        <li>
          <button class:active={selected === s.file} onclick={() => pick(s)}>
            <strong>{s.title}</strong>
            <span class="muted">{s.description}</span>
            {#if s.synthetic}<span class="tag">synthetic</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
    <label class="open">
      <span>Open your own trial (.json)</span>
      <input type="file" accept="application/json,.json" onchange={openFile} />
    </label>
  </aside>

  <section>
    {#if error}<p class="error">{error}</p>{/if}
    {#if trial}
      <div class="meta muted">
        <code>{trial.id}</code> · {TEST_LABELS[trial.test]} · {trial.frames.length} frames · {trial.model}
      </div>
      <TrialPlayer {trial} />
    {:else if !error}
      <p class="muted">Pick a sample or open a trial file.</p>
    {/if}
  </section>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(220px, 300px) 1fr;
    gap: 1.25rem;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
  h3 {
    margin: 0 0 0.5rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  li button {
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    position: relative;
  }
  li button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  li button span.muted {
    font-size: 0.85rem;
  }
  .tag {
    position: absolute;
    top: 0.45rem;
    right: 0.6rem;
    font-size: 0.7rem;
    color: var(--muted);
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 0 0.4rem;
  }
  .open {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-top: 1rem;
    font-size: 0.9rem;
  }
  .meta {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }
  .error {
    color: var(--fail);
  }
</style>
