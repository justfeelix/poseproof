<script lang="ts">
  import LiveTest from './components/LiveTest.svelte'
  import ReplayView from './components/ReplayView.svelte'

  type View = 'live' | 'replay' | 'about'
  let view = $state<View>('live')

  const tabs: { id: View; label: string }[] = [
    { id: 'live', label: 'Live test' },
    { id: 'replay', label: 'Replay' },
    { id: 'about', label: 'How it works' },
  ]
</script>

<header>
  <div class="brand">
    <img src="/favicon.svg" alt="" width="28" height="28" />
    <div>
      <strong>PoseProof</strong>
      <span class="muted">is this test valid?</span>
    </div>
  </div>
  <nav>
    {#each tabs as tab (tab.id)}
      <button class:active={view === tab.id} onclick={() => (view = tab.id)}>{tab.label}</button>
    {/each}
  </nav>
</header>

<main>
  {#if view === 'live'}
    <section class="panel">
      <h2>Live test</h2>
      <p class="muted">Stand 2 to 3 m from the camera so your whole body is visible.</p>
      <LiveTest />
    </section>
  {:else if view === 'replay'}
    <section class="panel">
      <h2>Replay</h2>
      <p class="muted">Recorded trials, landmarks only (no video).</p>
      <ReplayView />
    </section>
  {:else}
    <section class="panel">
      <h2>How it works</h2>
      <p>
        PoseProof runs MediaPipe Pose in your browser, records body landmarks during a squat
        test and checks whether the test was done validly: framing, orientation, visible joints,
        stable tracking, a calm start, depth, heels and tempo.
      </p>
      <p class="muted">No video is uploaded. Everything runs on this device.</p>
    </section>
  {/if}
</main>

<footer class="muted">
  PoseProof · <a href="https://github.com/justfeelix/poseproof">source on GitHub</a>
</footer>

<style>
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 0.9rem 1.5rem;
    background: var(--panel);
    border-bottom: 1px solid var(--line);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .brand div {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .brand span {
    font-size: 0.85rem;
  }
  nav {
    display: flex;
    gap: 0.4rem;
  }
  nav button.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  main {
    max-width: 1100px;
    margin: 1.5rem auto;
    padding: 0 1rem;
  }
  h2 {
    margin-top: 0;
  }
  footer {
    text-align: center;
    padding: 2rem 1rem;
    font-size: 0.85rem;
  }
  footer a {
    color: inherit;
  }
</style>
