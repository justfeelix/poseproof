<script lang="ts">
  import CheckList from './CheckList.svelte'
  import type { Verdict } from '../lib/checks'

  interface Props {
    verdict: Verdict
    /** Optional: what the trial was built or labelled to show, for comparison. */
    expected?: string
  }
  let { verdict, expected }: Props = $props()
  let details = $state(false)

  const headline = $derived(
    !verdict.valid ? 'Not valid' : verdict.complete ? 'Valid test' : 'No problems found so far',
  )
</script>

<div class="card" class:valid={verdict.valid} class:invalid={!verdict.valid}>
  <div class="head">
    <strong>{headline}</strong>
    {#if expected}
      <span class="muted expected">expected: <code>{expected}</code></span>
    {/if}
  </div>

  {#if verdict.feedback.length}
    <ul class="feedback">
      {#each verdict.feedback as f (f)}<li>{f}</li>{/each}
    </ul>
  {/if}

  {#if !verdict.complete}
    <p class="muted note">Some checks are not implemented yet, so this result is incomplete.</p>
  {/if}

  <CheckList results={verdict.results} {details} />

  <label class="toggle">
    <input type="checkbox" bind:checked={details} />
    show measured values
  </label>
</div>

<style>
  .card {
    border: 1px solid var(--line);
    border-left-width: 5px;
    border-radius: var(--radius);
    padding: 1rem;
    background: var(--panel);
  }
  .card.valid {
    border-left-color: var(--pass);
  }
  .card.invalid {
    border-left-color: var(--fail);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
    font-size: 1.15rem;
  }
  .valid .head strong {
    color: var(--pass);
  }
  .invalid .head strong {
    color: var(--fail);
  }
  .expected {
    font-size: 0.8rem;
  }
  .feedback {
    margin: 0 0 0.75rem;
    padding-left: 1.1rem;
  }
  .note {
    font-size: 0.85rem;
    margin: 0 0 0.75rem;
  }
  .toggle {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    margin-top: 0.75rem;
    font-size: 0.85rem;
    color: var(--muted);
  }
</style>
