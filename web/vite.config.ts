/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// SINGLE_BUNDLE=1 puts everything into one JS file (used only to build offline previews).
const single = !!process.env.SINGLE_BUNDLE

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    // three.js is loaded lazily as its own chunk (~560 kB, ~140 kB gzipped)
    chunkSizeWarningLimit: 700,
    rollupOptions: single ? { output: { inlineDynamicImports: true } } : {},
  },
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
