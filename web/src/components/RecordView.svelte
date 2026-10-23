<script lang="ts">
  import { onDestroy } from 'svelte'
  import CameraPose from './CameraPose.svelte'
  import CheckList from './CheckList.svelte'
  import JudgeLights from './JudgeLights.svelte'
  import Skeleton3D from './Skeleton3D.svelte'
  import { app } from '../lib/app.svelte'
  import { beep, unlockAudio } from '../lib/audio'
  import { evaluateLive, type Verdict } from '../lib/checks'
  import { jointAngleDeg, primaryPose } from '../lib/checks/util'
  import type { Joint3 } from '../lib/lifting'
  import { LM } from '../lib/pose/landmarks'
  import type { FrameContext, PoseSample } from '../lib/pose/types'
  import { library } from '../lib/trial/library.svelte'
  import { TrialRecorder } from '../lib/trial/recorder'
  import type { Frame, TestKind } from '../lib/trial/types'

  type Phase = 'ready' | 'countdown' | 'recording' | 'saving'

  const LIVE_WINDOW_MS = 1000
  const LIVE_EVERY_MS = 250

  let cameraOn = $state(false)
  let phase = $state<Phase>('ready')
  let test = $state<TestKind>('squat_front')
  let durationS = $state(20)
  let countdown = $state(0)
  /** Seconds between pressing Record and the start, to walk into position. Remembered per browser. */
  let delayS = $state(readNumber('poseproof.delayS', 5))
  let sound = $state(readNumber('poseproof.sound', 1) === 1)
  let elapsedS = $state(0)
  let live = $state<Verdict | null>(null)
  let show3d = $state(false)
  let pose3d = $state<Joint3[] | null>(null)
  let knee = $state<number | null>(null)

  const recorder = new TrialRecorder()
  let timer: ReturnType<typeof setInterval> | undefined
  let lastCtx: FrameContext | null = null
  let buffer: Frame[] = []
  let lastLive = 0

  const busy = $derived(phase !== 'ready')

  function readNumber(key: string, fallback: number): number {
    try {
      const v = localStorage.getItem(key)
      return v === null ? fallback : Number(v)
    } catch {
      return fallback
    }
  }

  $effect(() => {
    try {
      localStorage.setItem('poseproof.delayS', String(delayS))
      localStorage.setItem('poseproof.sound', sound ? '1' : '0')
    } catch {
      // storage blocked (private mode): the choice just is not remembered
    }
  })
  const blocked = $derived(!!live && live.results.some((r) => r.status === 'fail'))

  /** The recording itself starts here (after the countdown, or at once with no delay). */
  function begin() {
    if (!lastCtx) {
      phase = 'ready'
      return
    }
    recorder.start({
      test,
      model: lastCtx.model,
      image: { width: lastCtx.width, height: lastCtx.height },
      mirrored: lastCtx.mirrored,
    })
    elapsedS = 0
    phase = 'recording'
    if (sound) beep(990, 450)
  }

  /** Record pressed: count down delayS seconds (short beeps in the last 3), then begin(). */
  function startTest() {
    if (sound) unlockAudio() // must happen inside the click / key press
    if (delayS <= 0) return begin()
    phase = 'countdown'
    countdown = delayS
    if (sound && countdown <= 3) beep(660, 120)
    timer = setInterval(() => {
      countdown -= 1
      if (countdown <= 0) {
        clearInterval(timer)
        begin()
      } else if (sound && countdown <= 3) beep(660, 120)
    }, 1000)
  }

  async function finish() {
    if (phase !== 'recording') return
    if (sound) {
      beep(990, 150)
      beep(990, 150, 0.22)
    }
    const trial = recorder.stop()
    if (!trial) {
      phase = 'ready'
      return
    }
    phase = 'saving'
    await library.add(trial)
    phase = 'ready'
    app.open({ kind: 'mine', id: trial.id })
  }

  function cancel() {
    clearInterval(timer)
    recorder.stop()
    phase = 'ready'
  }

  function onframe(tMs: number, poses: PoseSample[], ctx: FrameContext) {
    lastCtx = ctx
    const frame: Frame = { t: tMs, poses }
    const p = primaryPose(frame)
    if (p) {
      const w = p.world
      const flex = (h: number, k: number, a: number) => 180 - jointAngleDeg(w[h], w[k], w[a])
      knee = (flex(LM.left_hip, LM.left_knee, LM.left_ankle) + flex(LM.right_hip, LM.right_knee, LM.right_ankle)) / 2
      if (show3d) pose3d = w.map(([x, y, z]) => [x, y, z] as Joint3)
    } else {
      knee = null
      pose3d = null
    }
    if (phase === 'recording') {
      recorder.push(tMs, poses)
      elapsedS = recorder.elapsed / 1000
      if (elapsedS >= durationS) void finish()
      return
    }
    buffer.push(frame)
    while (buffer.length && tMs - buffer[0].t > LIVE_WINDOW_MS) buffer.shift()
    if (tMs - lastLive > LIVE_EVERY_MS) {
      lastLive = tMs
      live = evaluateLive(buffer, test)
    }
  }

  function onrunning(running: boolean) {
    cameraOn = running
    buffer = []
    live = null
    if (!running) cancel()
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'SELECT') return
    if (e.key === 'r' && cameraOn && phase === 'ready') startTest()
    else if (e.key === 'Escape' && (phase === 'countdown' || phase === 'recording')) cancel()
  }

  onDestroy(() => clearInterval(timer))
</script>

<svelte:window onkeydown={onKey} />

<div class="bar">
  <div class="seg" role="radiogroup" aria-label="Test">
    <button role="radio" aria-checked={test === 'squat_front'} disabled={busy} onclick={() => (test = 'squat_front')}>Front</button>
    <button role="radio" aria-checked={test === 'squat_side'} disabled={busy} onclick={() => (test = 'squat_side')}>Side</button>
  </div>
  <label>
    <span class="sr">Length</span>
    <select bind:value={durationS} disabled={busy}>
      <option value={10}>10 s</option>
      <option value={20}>20 s</option>
      <option value={30}>30 s</option>
    </select>
  </label>
  <label>
    <span class="sr">Start delay</span>
    <select bind:value={delayS} disabled={busy} title="Time to walk into position after pressing Record">
      <option value={0}>Start now</option>
      <option value={3}>Start in 3 s</option>
      <option value={5}>Start in 5 s</option>
      <option value={10}>Start in 10 s</option>
      <option value={15}>Start in 15 s</option>
    </select>
  </label>
  <label class="chk" title="Beep on the last 3 seconds, at the start and at the end">
    <input type="checkbox" bind:checked={sound} />
    Beep
  </label>
  <label class="chk">
    <input type="checkbox" bind:checked={show3d} />
    3D
  </label>
  <span class="grow"></span>
  {#if phase === 'recording' || phase === 'countdown'}
    <button class="btn dark" onclick={cancel}>Cancel</button>
    {#if phase === 'recording'}<button class="btn go" onclick={finish}>Finish</button>{/if}
  {:else}
    <button class="btn go rec" onclick={startTest} disabled={!cameraOn || phase === 'saving'} title="Shortcut: R">
      <span class="dot" aria-hidden="true"></span>Record
    </button>
  {/if}
</div>

<div class="layout" class:split={show3d}>
  <div class="cam">
    <CameraPose {onframe} {onrunning}>
      {#if phase === 'countdown'}
        <div class="count" aria-live="assertive">
          <span class="num">{countdown}</span>
          <small>Get into position</small>
        </div>
      {:else if phase === 'recording'}
        <div class="recpill">
          <span class="blink" aria-hidden="true"></span>
          <span class="num">{elapsedS.toFixed(1)} / {durationS} s</span>
        </div>
        <div class="progress" style="--p: {Math.min(100, (100 * elapsedS) / durationS)}%"></div>
      {/if}
      <div class="readout">
        <span class="big num">{knee === null ? 'n/a' : `${Math.round(knee)}°`}</span>
        <span class="lbl">knee bend</span>
      </div>
    </CameraPose>
  </div>

  {#if show3d}
    <div class="three">
      <Skeleton3D pose={pose3d} view="front" />
      <span class="tag">MediaPipe 3D, drag to rotate</span>
    </div>
  {/if}

  <aside class="panel">
    <div class="ph">
      <JudgeLights results={live?.results ?? []} size="small" only={['setup']} />
      <h2>
        {#if !cameraOn}Camera off
        {:else if phase === 'recording'}Recording
        {:else if phase === 'countdown'}Get ready
        {:else if blocked}Fix setup
        {:else}Ready{/if}
      </h2>
    </div>
    {#if live && cameraOn}
      <CheckList results={live.results} grouped={false} onDark />
    {:else}
      <p class="hint">Hip-height camera, 2 to 3 m away. Whole body inside the corner marks.</p>
    {/if}
    <dl class="keys">
      <dt>R</dt><dd>Record (after the start delay)</dd>
      <dt>Esc</dt><dd>Cancel</dd>
    </dl>
  </aside>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 0.75rem;
  }
  .grow {
    flex: 1;
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
    min-height: 2.3rem;
    padding: 0 1rem;
    border-radius: 999px;
    font-weight: 650;
    color: var(--steel);
    transition: background-color 160ms var(--ease), color 160ms var(--ease);
  }
  .seg button[aria-checked='true'] {
    background: var(--ink);
    color: var(--chalk);
  }
  .seg button:disabled {
    cursor: not-allowed;
  }
  .chk {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-weight: 650;
    padding: 0 0.4rem;
  }
  .chk input {
    accent-color: var(--signal);
    width: 1.05rem;
    height: 1.05rem;
  }
  .rec .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--nolift);
    box-shadow: 0 0 0 2px var(--ink);
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 1rem;
    align-items: start;
  }
  .layout.split {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 300px;
  }
  @media (max-width: 1100px) {
    .layout.split {
      grid-template-columns: 1fr 1fr;
    }
    .layout.split .panel {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 820px) {
    .layout,
    .layout.split {
      grid-template-columns: 1fr;
    }
  }
  .three {
    position: relative;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: 4px;
    overflow: hidden;
  }
  .tag {
    position: absolute;
    left: 0.75rem;
    bottom: 0.5rem;
    font-size: var(--step--1);
    color: #6b6b6b;
    pointer-events: none;
  }
  .panel {
    background: var(--ink);
    color: #f2f2f2;
    border-radius: 4px;
    padding: 1.1rem 1.25rem;
  }
  .ph {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .ph h2 {
    font-size: var(--step-2);
    color: var(--lit);
  }
  .hint {
    color: #a8a8a8;
    font-size: var(--step--1);
  }
  .keys {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2rem 0.75rem;
    margin: 1rem 0 0;
    padding-top: 0.75rem;
    border-top: 1px solid #2b2b2b;
    font-size: var(--step--1);
  }
  .keys dt {
    font-weight: 700;
    color: var(--signal);
  }
  .keys dd {
    margin: 0;
    color: #a8a8a8;
  }
  .count {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    container-type: size;
    color: var(--lit);
    text-shadow: 0 4px 30px rgba(0, 0, 0, 0.6);
  }
  .count span {
    font-size: clamp(4rem, 55cqh, 14rem);
    font-weight: 900;
    line-height: 1;
  }
  .count small {
    font-size: clamp(0.9rem, 6cqh, 1.6rem);
    font-weight: 700;
  }
  .recpill {
    position: absolute;
    top: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.7);
    font-weight: 650;
  }
  .blink {
    width: 0.65rem;
    height: 0.65rem;
    border-radius: 50%;
    background: var(--nolift);
    animation: blink 1s steps(2, start) infinite;
  }
  @keyframes blink {
    to {
      visibility: hidden;
    }
  }
  .progress {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 4px;
    background: linear-gradient(to right, var(--nolift) var(--p), transparent var(--p));
  }
  .readout {
    position: absolute;
    left: 1rem;
    bottom: 1rem;
    display: flex;
    flex-direction: column;
    line-height: 1;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.7);
  }
  .big {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    color: var(--lit);
  }
  .lbl {
    font-size: var(--step--1);
    font-weight: 650;
    color: #d0d0d0;
    margin-top: 0.25rem;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
</style>
