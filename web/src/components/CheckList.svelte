<script lang="ts">
  import { CHECK_BY_ID, type CheckResult } from '../lib/checks'
  import { JUDGES } from '../lib/checks/judges'

  interface Props {
    results: CheckResult[]
    /** Show measured value and limit next to each check. */
    details?: boolean
    /** Group rows under the three judges. */
    grouped?: boolean
    /** Light text for use on the black stage. */
    onDark?: boolean
    /** Called when a row with time spans is clicked (jump to the problem). */
    onjump?: (ms: number) => void
  }
  let { results, details = false, grouped = true, onDark = false, onjump }: Props = $props()

  const STATUS = { pass: 'good', fail: 'no', warn: 'check', todo: 'not built yet' } as const

  const groups = $derived(
    grouped
      ? JUDGES.map((j) => ({ name: j.name, rows: results.filter((r) => j.checks.includes(r.id)) })).filter((g) => g.rows.length)
      : [{ name: '', rows: results }],
  )

  function measured(r: CheckResult): string {
    if (r.value === undefined) return ''
    const v = Math.abs(r.value) >= 10 ? r.value.toFixed(0) : Math.abs(r.value) >= 1 ? r.value.toFixed(2) : r.value.toFixed(3)
    return r.threshold === undefined ? v : `${v} / ${r.threshold}`
  }
</script>

<div class="list" class:onDark>
  {#each groups as g (g.name)}
    {#if g.name}<h4>{g.name}</h4>{/if}
    <ul>
      {#each g.rows as r (r.id)}
        <li class={r.status}>
          <span class="mark" aria-hidden="true"></span>
          {#if onjump && r.spans?.length}
            <button class="label jump" onclick={() => onjump(r.spans![0][0])} title="Jump to where it happened">
              {CHECK_BY_ID[r.id].label}
              <span class="sr">: {STATUS[r.status]}, jump to where it happened</span>
              <span class="when num" aria-hidden="true">{(r.spans[0][0] / 1000).toFixed(1)} s</span>
            </button>
          {:else}
            <span class="label">
              {CHECK_BY_ID[r.id].label}
              <span class="sr">: {STATUS[r.status]}</span>
            </span>
          {/if}
          {#if r.status === 'todo'}
            <span class="value quiet">to build</span>
          {:else if details}
            <span class="value num" title={r.detail ?? ''}>{measured(r)} {r.unit ?? ''}</span>
          {/if}
          {#if details && r.detail && r.status !== 'todo'}
            <span class="detail">{r.detail}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/each}
</div>

<style>
  h4 {
    margin: 1rem 0 0.35rem;
    font-size: var(--step--1);
    font-weight: 700;
    color: var(--steel);
  }
  .list > h4:first-child {
    margin-top: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: grid;
    grid-template-columns: 0.9rem 1fr auto;
    align-items: center;
    column-gap: 0.7rem;
    padding: 0.45rem 0;
    border-bottom: 1px solid var(--line);
  }
  li:last-child {
    border-bottom: 0;
  }
  .mark {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    border: 2px solid var(--ink);
  }
  .pass .mark {
    background: var(--ink);
  }
  .fail .mark {
    background: var(--nolift);
    border-color: var(--nolift);
  }
  .warn .mark {
    background: var(--signal);
    border-color: var(--signal);
  }
  .todo .mark {
    border-style: dashed;
    border-color: #a5a5a5;
  }
  .todo .label {
    color: var(--steel);
  }
  .fail .label {
    font-weight: 650;
  }
  .jump {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    gap: 0.5rem;
    align-items: baseline;
    text-decoration: underline;
    text-decoration-color: rgba(227, 38, 43, 0.6);
    text-underline-offset: 0.2em;
  }
  .jump:focus-visible {
    outline: 3px solid var(--signal);
    outline-offset: 2px;
  }
  .when {
    font-size: var(--step--1);
    color: #ff8a8d;
    text-decoration: none;
  }
  .value {
    font-size: var(--step--1);
    text-align: right;
    white-space: nowrap;
  }
  .detail {
    grid-column: 2 / -1;
    font-size: var(--step--1);
    color: var(--steel);
  }

  .onDark h4 {
    color: #9a9a9a;
  }
  .onDark li {
    border-bottom-color: #2b2b2b;
    color: #f2f2f2;
  }
  .onDark .mark {
    border-color: #f2f2f2;
  }
  .onDark .pass .mark {
    background: var(--lit);
  }
  .onDark .todo .label,
  .onDark .quiet,
  .onDark .detail {
    color: #9a9a9a;
  }

  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
