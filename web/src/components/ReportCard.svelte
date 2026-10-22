<script lang="ts">
  import CheckList from './CheckList.svelte'
  import JudgeLights from './JudgeLights.svelte'
  import type { Verdict } from '../lib/checks'

  interface Props {
    verdict: Verdict
    /** What the trial was built or labelled to show, for comparison (replay). */
    expected?: string
    onjump?: (ms: number) => void
  }
  let { verdict, expected, onjump }: Props = $props()
  let details = $state(false)

  const todo = $derived(verdict.results.filter((r) => r.status === 'todo').length)
  const headline = $derived(!verdict.valid ? 'No test' : todo === 0 ? 'Good test' : 'No faults yet')
  const sub = $derived(
    !verdict.valid
      ? verdict.feedback.length === 1
        ? '1 thing to fix'
        : `${verdict.feedback.length} things to fix`
      : todo === 0
        ? `${verdict.results.length} of ${verdict.results.length} checks passed`
        : `${verdict.results.length - todo} passed, ${todo} not built yet`,
  )
  const EXPECTED: Record<string, string> = {
    CLEAN: 'a good test',
    OUT_OF_FRAME: 'feet out of frame',
    MULTI_PERSON: 'a second person',
    WRONG_ORIENTATION: 'wrong orientation',
    TRACKING_UNSTABLE: 'tracker glitches',
    NO_CALM_START: 'no calm start',
    DEPTH_NOT_REACHED: 'a shallow squat',
    HEEL_LIFT: 'heels lifting',
    TOO_FAST: 'reps that are too fast',
  }
</script>

<section class="board" class:no={!verdict.valid} aria-live="polite">
  <JudgeLights results={verdict.results} />

  <div class="verdict">
    <h2>{headline}</h2>
    <p>{sub}</p>
    {#if expected}
      <p class="expected">Sample built to show {EXPECTED[expected] ?? expected}</p>
    {/if}
  </div>

  {#if verdict.feedback.length}
    <ol class="fixes">
      {#each verdict.feedback as f (f)}<li>{f}</li>{/each}
    </ol>
  {/if}

  <div class="checks">
    <CheckList results={verdict.results} {details} {onjump} onDark />
  </div>

  <label class="toggle">
    <input type="checkbox" bind:checked={details} />
    Measured values
  </label>
</section>

<style>
  .board {
    background: var(--ink);
    color: #f2f2f2;
    padding: 1.5rem;
    border-radius: 4px;
  }
  .verdict {
    margin: 1.5rem 0 1rem;
  }
  h2 {
    font-size: var(--step-4);
    font-stretch: 125%;
    font-weight: 850;
    color: var(--lit);
  }
  .no h2 {
    color: var(--nolift);
  }
  .verdict p {
    margin-top: 0.4rem;
    color: #c9c9c9;
    max-width: 34ch;
  }
  .expected {
    font-size: var(--step--1);
    color: #9a9a9a !important;
  }
  .fixes {
    margin: 0 0 1.25rem;
    padding: 0.9rem 1rem 0.9rem 2.1rem;
    background: #1f1f1f;
    border-left: 4px solid var(--nolift);
    font-weight: 600;
  }
  .fixes li + li {
    margin-top: 0.35rem;
  }
  .toggle {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 1rem;
    font-size: var(--step--1);
    color: #9a9a9a;
    cursor: pointer;
  }
  .toggle input {
    accent-color: var(--signal);
  }
</style>
