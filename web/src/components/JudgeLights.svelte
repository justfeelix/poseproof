<script lang="ts">
  import { onMount } from 'svelte'
  import { JUDGES, lightFor } from '../lib/checks/judges'
  import type { CheckResult } from '../lib/checks'

  interface Props {
    results: CheckResult[]
    /** Larger lamps for the main verdict, smaller for the live setup view. */
    size?: 'large' | 'small'
    /** Only show these judges (live view shows setup only). */
    only?: string[]
  }
  let { results, size = 'large', only }: Props = $props()

  const judges = $derived(only ? JUDGES.filter((j) => only.includes(j.id)) : JUDGES)
  const LABEL = { white: 'good', red: 'no', off: 'not judged' } as const

  // The one orchestrated moment: lamps start dark and switch on one judge after another.
  let lit = $state(false)
  onMount(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => (lit = true)))
    return () => cancelAnimationFrame(id)
  })
</script>

<ol class="lights {size}">
  {#each judges as judge, i (judge.id)}
    {@const light = lightFor(judge, results)}
    <li>
      <span class="lamp {lit ? light : 'off'}" style="--i: {i}" aria-hidden="true"></span>
      <span class="name">{judge.name}</span>
      <span class="sr">{judge.name}: {LABEL[light]}</span>
    </li>
  {/each}
</ol>

<style>
  .lights {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 1.25rem;
  }
  li {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .lamp {
    --d: 3.25rem;
    width: var(--d);
    height: var(--d);
    border-radius: 50%;
    background: #2a2a2a;
    box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.6);
    transition:
      background-color 260ms var(--ease) calc(var(--i) * 140ms),
      box-shadow 260ms var(--ease) calc(var(--i) * 140ms);
  }
  .small .lamp {
    --d: 1.6rem;
  }
  .lamp.white {
    background: var(--lit);
    box-shadow:
      0 0 0 3px rgba(255, 255, 255, 0.15),
      0 0 28px 4px rgba(255, 255, 255, 0.45);
  }
  .lamp.red {
    background: var(--nolift);
    box-shadow:
      0 0 0 3px rgba(227, 38, 43, 0.2),
      0 0 28px 4px rgba(227, 38, 43, 0.55);
  }
  .name {
    font-size: var(--step--1);
    font-weight: 600;
    color: #bdbdbd;
  }
  .small .name {
    display: none;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
