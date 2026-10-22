<script lang="ts">
  import AboutView from './components/AboutView.svelte'
  import RecordView from './components/RecordView.svelte'
  import ReviewView from './components/ReviewView.svelte'
  import { app, type View } from './lib/app.svelte'
  import { library } from './lib/trial/library.svelte'

  const tabs: { id: View; label: string }[] = [
    { id: 'record', label: 'Record' },
    { id: 'review', label: 'Review' },
    { id: 'method', label: 'Method' },
  ]

  void library.load()
</script>

<header class="top">
  <a class="brand" href="#record" onclick={(e) => (e.preventDefault(), app.go('record'))}>
    <img src="/favicon.svg" alt="" width="30" height="30" />
    <span>PoseProof</span>
  </a>
  <nav aria-label="Main">
    {#each tabs as tab (tab.id)}
      <a
        href="#{tab.id}"
        aria-current={app.view === tab.id ? 'page' : undefined}
        onclick={(e) => (e.preventDefault(), app.go(tab.id))}
      >
        {tab.label}
        {#if tab.id === 'review' && library.items.length}<span class="count num">{library.items.length}</span>{/if}
      </a>
    {/each}
  </nav>
  <a class="gh" href="https://github.com/justfeelix/poseproof" aria-label="Source code on GitHub">
    <svg viewBox="0 0 16 16" aria-hidden="true"
      ><path
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      /></svg
    >
  </a>
</header>

<main>
  {#if app.view === 'record'}
    <RecordView />
  {:else if app.view === 'review'}
    <ReviewView />
  {:else}
    <AboutView />
  {/if}
</main>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 1rem 2.5rem;
    padding: 0.6rem clamp(1rem, 3vw, 2rem);
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    text-decoration: none;
  }
  .brand span {
    font-size: var(--step-1);
    font-stretch: 125%;
    font-weight: 850;
    letter-spacing: -0.02em;
  }
  nav {
    display: flex;
    gap: 1.6rem;
    flex: 1;
  }
  nav a {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0;
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
    bottom: -0.6rem;
    height: 3px;
    background: var(--signal);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 220ms var(--ease);
  }
  nav a[aria-current='page']::after {
    transform: scaleX(1);
  }
  .count {
    min-width: 1.3rem;
    height: 1.3rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: var(--ink);
    color: var(--chalk);
    font-size: 0.75rem;
    display: inline-grid;
    place-items: center;
  }
  .gh svg {
    width: 22px;
    height: 22px;
    fill: var(--ink);
    display: block;
  }
  main {
    max-width: 96rem;
    margin: 0 auto;
    padding: clamp(1rem, 3vw, 1.75rem) clamp(1rem, 3vw, 2rem) 3rem;
  }
  @media (max-width: 560px) {
    .brand span {
      display: none;
    }
    nav {
      gap: 1.1rem;
    }
  }
</style>
