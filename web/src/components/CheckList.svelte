<script lang="ts">
  import { CHECK_BY_ID, type CheckResult } from '../lib/checks'

  interface Props {
    results: CheckResult[]
    /** Show measured value and threshold (developer view). */
    details?: boolean
  }
  let { results, details = false }: Props = $props()

  const ICON: Record<CheckResult['status'], string> = { pass: '✓', fail: '✕', warn: '!', todo: '…' }

  function fmt(r: CheckResult): string {
    if (r.value === undefined) return ''
    const v = Math.abs(r.value) >= 10 ? r.value.toFixed(0) : r.value.toFixed(3)
    const t = r.threshold === undefined ? '' : ` (limit ${r.threshold})`
    return `${v} ${r.unit ?? ''}${t}`
  }
</script>

<ul>
  {#each results as r (r.id)}
    <li class={r.status}>
      <span class="icon" aria-label={r.status}>{ICON[r.status]}</span>
      <div>
        <span class="label">{CHECK_BY_ID[r.id].label}</span>
        {#if r.status === 'todo'}
          <span class="sub">not implemented yet</span>
        {:else if details && (r.value !== undefined || r.detail)}
          <span class="sub">{fmt(r)}{r.detail ? ` · ${r.detail}` : ''}</span>
        {/if}
      </div>
    </li>
  {/each}
</ul>

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  li {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
  }
  li div {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }
  .icon {
    flex: 0 0 1.4rem;
    height: 1.4rem;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }
  .pass .icon {
    background: var(--pass);
  }
  .fail .icon {
    background: var(--fail);
  }
  .warn .icon {
    background: var(--warn);
  }
  .todo .icon {
    background: var(--todo);
  }
  .todo .label {
    color: var(--muted);
  }
  .sub {
    font-size: 0.8rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }
</style>
