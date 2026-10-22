import { mount } from 'svelte'
// Archivo, self-hosted (no request to a font CDN): one family, width axis 62-125%.
import '@fontsource-variable/archivo/wdth.css'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
