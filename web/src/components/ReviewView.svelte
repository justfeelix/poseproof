<script lang="ts">
  import { onMount } from 'svelte'
  import Pose2D from './Pose2D.svelte'
  import ReportCard from './ReportCard.svelte'
  import Skeleton3D from './Skeleton3D.svelte'
  import Timeline from './Timeline.svelte'
  import { app } from '../lib/app.svelte'
  import { CHECK_BY_ID, evaluateTrial } from '../lib/checks'
  import { LIFTERS, mediapipeLifter, type Lifted } from '../lib/lifting'
  import { downloadTrial, parseTrial } from '../lib/trial/io'
  import { library } from '../lib/trial/library.svelte'
  import { loadSample, loadSampleIndex, type SampleEntry } from '../lib/trial/samples'
  import type { Trial } from '../lib/trial/types'
  import { Playback } from '../lib/viz/playback.svelte'
  import type { ViewPreset } from '../lib/viz/scene3d'
  import { signals } from '../lib/viz/signals'

  type Mode = '2d' | '3d' | 'both'

  const pb = new Playback()
  let samples = $state<SampleEntry[]>([])
  let trial = $state<Trial | null>(null)
  let error = $state('')
  let mode = $state<Mode>(readMode())
  let preset = $state<ViewPreset>('front')
  let showTrail = $state(true)
  let lifterId = $state<'mediapipe' | 'temporal'>('mediapipe')
  let lifted = $state<Lifted>([])
  let trail = $state<[number, number, number][] | null>(null)
  let help = $state(false)
  let dropping = $state(false)
  let renaming = $state<string | null>(null)
  let confirmDelete = $state<string | null>(null)

  const verdict = $derived(trial ? evaluateTrial(trial) : null)
  const series = $derived(trial ? signals(trial.frames) : null)
  const frameIndex = $derived.by(() => {
    if (!trial) return 0
    const f = trial.frames
    let lo = 0
    let hi = f.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (f[mid].t <= pb.t) lo = mid
      else hi = mid - 1
    }
    return lo
  })
  const spans = $derived(
    (verdict?.results ?? [])
      .filter((r) => r.status === 'fail' && r.spans?.length)
      .map((r) => ({ id: r.id, label: CHECK_BY_ID[r.id].label, spans: r.spans! })),
  )
  const sel = $derived(app.selection)
  const expected = $derived(sel?.kind === 'sample' ? samples.find((s) => s.file === sel.file)?.expected : undefined)
  const title = $derived.by(() => {
    if (!sel) return ''
    if (sel.kind === 'sample') return samples.find((s) => s.file === sel.file)?.title ?? 'Sample'
    const m = library.items.find((i) => i.id === sel.id)
    return m ? (m.name ?? when(m.createdAt)) : 'Trial'
  })

  function readMode(): Mode {
    try {
      const m = localStorage.getItem('poseproof.mode')
      if (m === '2d' || m === '3d' || m === 'both') return m
    } catch {
      /* storage unavailable */
    }
    return 'both'
  }
  function setMode(m: Mode) {
    mode = m
    try {
      localStorage.setItem('poseproof.mode', m)
    } catch {
      /* storage unavailable */
    }
  }

  function when(iso: string) {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  onMount(() => {
    void (async () => {
      try {
        await library.load()
        samples = await loadSampleIndex()
      } catch (err) {
        error = err instanceof Error ? err.message : String(err)
      }
      if (!app.selection) {
        const first = library.items[0]
        if (first) app.open({ kind: 'mine', id: first.id })
        else if (samples[0]) app.open({ kind: 'sample', file: samples[0].file })
      }
    })()
    const onKey = (e: KeyboardEvent) => onKeydown(e)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      pb.pause()
    }
  })

  // Load whatever is selected.
  $effect(() => {
    const s = app.selection
    if (!s) return
    let cancelled = false
    error = ''
    void (async () => {
      try {
        let t: Trial | null = null
        if (s.kind === 'sample') {
          const entry = samples.find((x) => x.file === s.file)
          if (!entry) return // index not loaded yet; the effect reruns when it is
          t = await loadSample(entry)
        } else {
          t = await library.get(s.id)
          if (!t) throw new Error('This trial is no longer in your library.')
        }
        if (cancelled || !t) return
        trial = t
        pb.load(t.frames.at(-1)?.t ?? 0)
      } catch (err) {
        if (!cancelled) error = err instanceof Error ? err.message : String(err)
      }
    })()
    return () => {
      cancelled = true
    }
  })

  // Lift the selected trial to 3D with the chosen lifter.
  $effect(() => {
    const t = trial
    if (!t) return
    const lifter = LIFTERS.find((l) => l.id === lifterId) ?? mediapipeLifter
    void lifter.lift(t.frames).then(async (out) => {
      lifted = out
      const { hipTrail } = await import('../lib/viz/scene3d')
      trail = hipTrail(out)
    })
  })

  function step(frames: number) {
    if (!trial) return
    pb.pause()
    const i = Math.max(0, Math.min(trial.frames.length - 1, frameIndex + frames))
    pb.seek(trial.frames[i].t)
  }

  function onKeydown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
    if (e.key === ' ') {
      e.preventDefault()
      pb.toggle()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      if (e.shiftKey) pb.seek(pb.t + 1000)
      else step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      if (e.shiftKey) pb.seek(pb.t - 1000)
      else step(-1)
    } else if (e.key === '1') preset = 'front'
    else if (e.key === '2') preset = 'side'
    else if (e.key === '3') preset = 'top'
    else if (e.key === 'v') setMode(mode === '2d' ? '3d' : mode === '3d' ? 'both' : '2d')
    else if (e.key === 'p') showTrail = !showTrail
    else if (e.key === '?') help = !help
    else if (e.key === 'Escape') help = false
  }

  async function importFile(file: File) {
    try {
      const t = parseTrial(await file.text())
      await library.add(t)
      app.open({ kind: 'mine', id: t.id })
    } catch (err) {
      error = `${file.name}: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  async function remove(id: string) {
    if (confirmDelete !== id) {
      confirmDelete = id
      setTimeout(() => confirmDelete === id && (confirmDelete = null), 3000)
      return
    }
    confirmDelete = null
    await library.remove(id)
    if (sel?.kind === 'mine' && sel.id === id) {
      const next = library.items[0]
      if (next) app.open({ kind: 'mine', id: next.id })
      else if (samples[0]) app.open({ kind: 'sample', file: samples[0].file })
    }
  }
</script>

<svelte:window
  ondragover={(e) => {
    e.preventDefault()
    dropping = true
  }}
  ondragleave={(e) => {
    if (!e.relatedTarget) dropping = false
  }}
  ondrop={(e) => {
    e.preventDefault()
    dropping = false
    const f = e.dataTransfer?.files?.[0]
    if (f) void importFile(f)
  }}
/>

<div class="review">
  <aside class="side">
    <section>
      <h2>Your trials</h2>
      {#if library.items.length === 0}
        <p class="empty">Recordings land here. They stay in this browser.</p>
      {:else}
        <ul>
          {#each library.items as m (m.id)}
            {@const active = sel?.kind === 'mine' && sel.id === m.id}
            <li class:active>
              {#if renaming === m.id}
                <input
                  value={m.name ?? ''}
                  placeholder={when(m.createdAt)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      void library.rename(m.id, (e.currentTarget as HTMLInputElement).value.trim())
                      renaming = null
                    } else if (e.key === 'Escape') renaming = null
                  }}
                  onblur={(e) => {
                    void library.rename(m.id, e.currentTarget.value.trim())
                    renaming = null
                  }}
                />
              {:else}
                <button class="pick" onclick={() => app.open({ kind: 'mine', id: m.id })} ondblclick={() => (renaming = m.id)}>
                  <span class="t">{m.name || when(m.createdAt)}</span>
                  <span class="d">
                    <span>{m.test === 'squat_side' ? 'Side' : 'Front'}</span>
                    <span class="num">{(m.durationMs / 1000).toFixed(1)} s</span>
                  </span>
                </button>
                <span class="tools">
                  <button title="Rename" aria-label="Rename" onclick={() => (renaming = m.id)}>
                    <svg viewBox="0 0 16 16"><path d="M3 11.5V13h1.5l7-7L10 4.5l-7 7zM11 3.5l1.5 1.5 1-1L12 2.5l-1 1z" /></svg>
                  </button>
                  <button class:danger={confirmDelete === m.id} title="Delete" aria-label="Delete" onclick={() => remove(m.id)}>
                    {#if confirmDelete === m.id}Delete?{:else}
                      <svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke-width="1.8" /></svg>
                    {/if}
                  </button>
                </span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <label class="import">
        <input type="file" accept="application/json,.json" onchange={(e) => e.currentTarget.files?.[0] && importFile(e.currentTarget.files[0])} />
        Import JSON
      </label>
    </section>

    <section>
      <h2>Samples</h2>
      <ul>
        {#each samples as s (s.file)}
          {@const active = sel?.kind === 'sample' && sel.file === s.file}
          <li class:active>
            <button class="pick" onclick={() => app.open({ kind: 'sample', file: s.file })}>
              <span class="t">{s.title}</span>
              <span class="d"><span>{s.synthetic ? 'Synthetic' : 'Recorded'}</span></span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  </aside>

  <div class="work">
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if trial && series}
      <div class="bar">
        <h1>{title}</h1>
        <div class="tools">
          <div class="seg" role="radiogroup" aria-label="View">
            {#each [['2d', '2D'], ['3d', '3D'], ['both', 'Both']] as [id, label] (id)}
              <button role="radio" aria-checked={mode === id} onclick={() => setMode(id as Mode)}>{label}</button>
            {/each}
          </div>
          {#if mode !== '2d'}
            <div class="seg" role="radiogroup" aria-label="Camera">
              {#each [['front', 'Front'], ['side', 'Side'], ['top', 'Top']] as [id, label] (id)}
                <button role="radio" aria-checked={preset === id} onclick={() => (preset = id as ViewPreset)}>{label}</button>
              {/each}
            </div>
          {/if}
          <button class="icon" title="Download JSON" aria-label="Download JSON" onclick={() => trial && downloadTrial(trial)}>
            <svg viewBox="0 0 16 16"><path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10" stroke-width="1.8" fill="none" /></svg>
          </button>
          <button class="icon" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" onclick={() => (help = !help)}>?</button>
        </div>
      </div>

      <div class="views" class:both={mode === 'both'}>
        {#if mode !== '3d'}
          <div class="pane"><Pose2D {trial} tMs={pb.t} /></div>
        {/if}
        {#if mode !== '2d'}
          <div class="pane three" style="aspect-ratio: {trial.image.width / trial.image.height}">
            <Skeleton3D
              pose={lifted[frameIndex] ?? null}
              trail={showTrail ? trail : null}
              view={preset}
              onorbit={() => (preset = 'free')}
            />
            <div class="hud">
              <label>
                <span class="sr">3D source</span>
                <select bind:value={lifterId}>
                  {#each LIFTERS as l (l.id)}
                    <option value={l.id} disabled={!l.available}>{l.name}{l.available ? '' : ' (soon)'}</option>
                  {/each}
                </select>
              </label>
              <label class="chk"><input type="checkbox" bind:checked={showTrail} /> Hip path</label>
            </div>
            <span class="scale">Grid 50 cm</span>
          </div>
        {/if}
      </div>

      <div class="transport">
        <button class="play" onclick={() => pb.toggle()} aria-label={pb.playing ? 'Pause' : 'Play'}>
          {#if pb.playing}
            <svg viewBox="0 0 20 20"><rect x="5" y="4" width="3.5" height="12" /><rect x="11.5" y="4" width="3.5" height="12" /></svg>
          {:else}
            <svg viewBox="0 0 20 20"><path d="M6 4l10 6-10 6z" /></svg>
          {/if}
        </button>
        <button class="icon" aria-label="Previous frame" onclick={() => step(-1)}>
          <svg viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke-width="2" fill="none" /></svg>
        </button>
        <button class="icon" aria-label="Next frame" onclick={() => step(1)}>
          <svg viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke-width="2" fill="none" /></svg>
        </button>
        <span class="time num">{(pb.t / 1000).toFixed(2)}<small> / {(pb.duration / 1000).toFixed(1)} s</small></span>
        <span class="frame num">frame {frameIndex + 1}</span>
        <label class="speed">
          <span class="sr">Speed</span>
          <select bind:value={pb.speed}>
            <option value={0.25}>0.25×</option>
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>

      <Timeline {series} durationMs={pb.duration} tMs={pb.t} {spans} onseek={(ms) => pb.seek(ms)} />
    {:else if !error}
      <p class="quiet">Loading</p>
    {/if}
  </div>

  <div class="board">
    {#if verdict && trial}
      {#key trial.id}
        <ReportCard {verdict} {expected} onjump={(ms) => (pb.pause(), pb.seek(ms))} />
      {/key}
    {/if}
  </div>
</div>

{#if help}
  <div class="help" role="dialog" aria-label="Keyboard shortcuts">
    <h3>Shortcuts</h3>
    <dl>
      <dt>Space</dt><dd>Play or pause</dd>
      <dt>← →</dt><dd>One frame</dd>
      <dt>Shift ← →</dt><dd>One second</dd>
      <dt>1 2 3</dt><dd>Front, side, top</dd>
      <dt>V</dt><dd>2D, 3D, both</dd>
      <dt>P</dt><dd>Hip path</dd>
      <dt>Drag</dt><dd>Rotate the 3D view; scroll to zoom</dd>
    </dl>
    <button class="btn" onclick={() => (help = false)}>Close</button>
  </div>
{/if}

{#if dropping}
  <div class="drop" aria-hidden="true"><span>Drop a trial file to add it</span></div>
{/if}

<style>
  .review {
    display: grid;
    grid-template-columns: 210px minmax(0, 1fr) minmax(280px, 330px);
    gap: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1150px) {
    .review {
      grid-template-columns: 200px minmax(0, 1fr);
    }
    .board {
      grid-column: 2;
    }
  }
  @media (max-width: 760px) {
    .review {
      grid-template-columns: 1fr;
    }
    .board {
      grid-column: auto;
    }
    .work {
      order: -1;
    }
  }

  /* sidebar */
  .side h2 {
    font-size: var(--step--1);
    font-stretch: 100%;
    font-weight: 700;
    color: var(--steel);
    margin: 0 0 0.4rem;
  }
  .side section + section {
    margin-top: 1.5rem;
  }
  .side ul {
    list-style: none;
    margin: 0;
    padding: 0;
    border-top: 2px solid var(--ink);
  }
  .side li {
    position: relative;
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--line);
  }
  .side li.active {
    background: var(--ink);
    color: var(--chalk);
  }
  .pick {
    flex: 1;
    min-width: 0;
    text-align: left;
    border: 0;
    background: transparent;
    padding: 0.55rem 0.5rem;
    display: flex;
    flex-direction: column;
  }
  .side li:not(.active) .pick:hover {
    background: var(--plate);
  }
  .t {
    font-weight: 650;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .d {
    display: flex;
    gap: 0.75rem;
    font-size: var(--step--1);
    color: var(--steel);
  }
  .active .d {
    color: #bdbdbd;
  }
  .side .tools {
    display: flex;
    align-items: center;
    opacity: 0;
    transition: opacity 120ms;
  }
  .side li:hover .tools,
  .side li:focus-within .tools,
  .side li.active .tools {
    opacity: 1;
  }
  .side .tools button {
    border: 0;
    background: transparent;
    padding: 0 0.35rem;
    height: 100%;
    font-size: var(--step--1);
    font-weight: 700;
  }
  .side .tools svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
    stroke: currentColor;
  }
  .side .tools .danger {
    color: var(--nolift);
  }
  .side input:not([type='file']) {
    flex: 1;
    font: inherit;
    padding: 0.55rem 0.5rem;
    border: 2px solid var(--signal);
    border-radius: 0;
  }
  .empty {
    font-size: var(--step--1);
    color: var(--steel);
    padding: 0.6rem 0;
    border-top: 2px solid var(--ink);
  }
  .import {
    display: inline-block;
    margin-top: 0.6rem;
    font-size: var(--step--1);
    font-weight: 650;
    text-decoration: underline;
    text-underline-offset: 0.2em;
    cursor: pointer;
    position: relative;
  }
  .import input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  /* workspace */
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  h1 {
    font-size: var(--step-2);
  }
  .bar .tools {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .seg {
    display: inline-flex;
    padding: 3px;
    border-radius: 999px;
    background: var(--plate);
  }
  .seg button {
    border: 0;
    background: transparent;
    min-height: 2.1rem;
    padding: 0 0.85rem;
    border-radius: 999px;
    font-weight: 650;
    color: var(--steel);
    transition: background-color 160ms var(--ease), color 160ms var(--ease);
  }
  .seg button[aria-checked='true'] {
    background: var(--ink);
    color: var(--chalk);
  }
  .icon {
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: var(--chalk);
    display: grid;
    place-items: center;
    font-weight: 800;
  }
  .icon svg {
    width: 15px;
    height: 15px;
    stroke: var(--ink);
  }
  .views {
    display: grid;
    gap: 0.75rem;
  }
  .views.both {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 1000px) {
    .views.both {
      grid-template-columns: 1fr;
    }
  }
  .pane {
    position: relative;
  }
  .three {
    background: #000;
    border-radius: 4px;
    overflow: hidden;
  }
  .hud {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .hud select {
    min-height: 2rem;
    font-size: var(--step--1);
    background-color: rgba(0, 0, 0, 0.6);
    color: #f2f2f2;
    border-color: #3a3a3a;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23f2f2f2' stroke-width='1.6' fill='none'/%3E%3C/svg%3E");
  }
  .hud option {
    color: var(--ink);
  }
  .chk {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: var(--step--1);
    font-weight: 600;
    color: #d0d0d0;
  }
  .chk input {
    accent-color: var(--signal);
  }
  .scale {
    position: absolute;
    right: 0.75rem;
    bottom: 0.5rem;
    font-size: var(--step--1);
    color: #6b6b6b;
    pointer-events: none;
  }
  .transport {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem 0 0.5rem;
  }
  .play {
    width: 2.9rem;
    height: 2.9rem;
    border-radius: 50%;
    border: 0;
    background: var(--signal);
    display: grid;
    place-items: center;
    transition: transform 120ms var(--ease);
  }
  .play:active {
    transform: scale(0.94);
  }
  .play svg {
    width: 1.1rem;
    height: 1.1rem;
    fill: var(--ink);
  }
  .time {
    margin-left: 0.5rem;
    font-size: var(--step-2);
    font-weight: 700;
  }
  .time small {
    font-size: var(--step-0);
    color: var(--steel);
    font-weight: 600;
  }
  .frame {
    color: var(--steel);
    font-size: var(--step--1);
    margin-left: auto;
  }
  .speed select {
    min-height: 2.4rem;
  }
  .error {
    color: var(--nolift);
    font-weight: 650;
    margin-bottom: 0.75rem;
  }

  .help {
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    z-index: 30;
    background: var(--ink);
    color: #f2f2f2;
    padding: 1.25rem 1.5rem;
    border-radius: 4px;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
    min-width: 280px;
  }
  .help h3 {
    font-size: var(--step-1);
    margin-bottom: 0.75rem;
  }
  .help dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 1rem;
    margin: 0 0 1rem;
  }
  .help dt {
    font-weight: 700;
    color: var(--signal);
  }
  .help dd {
    margin: 0;
    color: #d0d0d0;
  }
  .drop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(240, 100, 15, 0.12);
    border: 4px dashed var(--signal);
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .drop span {
    background: var(--ink);
    color: #fff;
    padding: 0.8rem 1.4rem;
    border-radius: 999px;
    font-weight: 700;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
