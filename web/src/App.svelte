<script lang="ts">
  import AboutView from './components/AboutView.svelte'
  import LiveTest from './components/LiveTest.svelte'
  import ReplayView from './components/ReplayView.svelte'

  type View = 'live' | 'replay' | 'about'

  const tabs: { id: View; label: string }[] = [
    { id: 'live', label: 'Live test' },
    { id: 'replay', label: 'Replay' },
    { id: 'about', label: 'How it works' },
  ]

  // The view lives in the URL hash, so /#replay can be shared as a direct link to the demo.
  const fromHash = (): View => {
    const h = location.hash.slice(1)
    return tabs.some((t) => t.id === h) ? (h as View) : 'live'
  }
  let view = $state<View>(fromHash())

  function go(v: View) {
    view = v
    history.replaceState(null, '', `#${v}`)
  }
</script>

<header class="top">
  <a class="brand" href="#live" onclick={(e) => (e.preventDefault(), go('live'))}>
    <img src="/favicon.svg" alt="" width="34" height="34" />
    <span>PoseProof</span>
  </a>
  <nav aria-label="Main">
    {#each tabs as tab (tab.id)}
      <a
        href="#{tab.id}"
        aria-current={view === tab.id ? 'page' : undefined}
        onclick={(e) => (e.preventDefault(), go(tab.id))}>{tab.label}</a
      >
    {/each}
  </nav>
</header>

<main>
  {#if view === 'live'}
    <LiveTest />
  {:else if view === 'replay'}
    <ReplayView />
  {:else}
    <AboutView />
  {/if}
</main>

<footer>
  <span>PoseProof by Felix Hajuj</span>
  <a href="https://github.com/justfeelix/poseproof">Source on GitHub</a>
  <span>Runs on your device. No video is uploaded.</span>
</footer>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 2rem;
    flex-wrap: wrap;
    padding: 0.75rem clamp(1rem, 4vw, 2.5rem);
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
  }
  .brand span {
    font-size: var(--step-2);
    font-stretch: 125%;
    font-weight: 850;
    letter-spacing: -0.02em;
  }
  nav {
    display: flex;
    gap: 1.75rem;
  }
  nav a {
    position: relative;
    padding: 0.5rem 0;
    font-weight: 650;
    text-decoration: none;
    color: var(--steel);
    transition: color 140ms var(--ease);
  }
  nav a:hover,
  nav a[aria-current='page'] {
    color: var(--ink);
  }
  nav a::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    border-radius: 2px;
    background: var(--signal);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 220ms var(--ease);
  }
  nav a[aria-current='page']::after {
    transform: scaleX(1);
  }
  main {
    max-width: 88rem;
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 2.5rem);
  }
  footer {
    max-width: 88rem;
    margin: 2rem auto 0;
    padding: 1.5rem clamp(1.25rem, 4vw, 2.5rem) 2.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 2rem;
    border-top: 1px solid var(--line);
    font-size: var(--step--1);
    color: var(--steel);
  }
</style>
