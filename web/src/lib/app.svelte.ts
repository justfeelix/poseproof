/**
 * Which screen is open and which trial is selected, mirrored in the URL hash so any state
 * can be linked: #record, #review/sample/synthetic_heel_lift, #review/mine/<id>, #method.
 */
export type View = 'record' | 'review' | 'method'
export type Selection = { kind: 'sample'; file: string } | { kind: 'mine'; id: string }

const LEGACY: Record<string, View> = { live: 'record', replay: 'review', about: 'method' }

class AppState {
  view = $state<View>('record')
  selection = $state<Selection | null>(null)

  constructor() {
    if (typeof window === 'undefined') return
    this.read()
    window.addEventListener('hashchange', () => this.read())
  }

  private read() {
    const [v, kind, ...rest] = location.hash.slice(1).split('/')
    const view = (LEGACY[v] ?? v) as View
    this.view = ['record', 'review', 'method'].includes(view) ? view : 'record'
    const key = decodeURIComponent(rest.join('/'))
    if (kind === 'sample' && key) this.selection = { kind: 'sample', file: key }
    else if (kind === 'mine' && key) this.selection = { kind: 'mine', id: key }
  }

  private write() {
    const s = this.selection
    const tail = this.view === 'review' && s ? `/${s.kind}/${encodeURIComponent(s.kind === 'sample' ? s.file : s.id)}` : ''
    history.replaceState(null, '', `#${this.view}${tail}`)
  }

  go(view: View) {
    this.view = view
    this.write()
  }

  open(selection: Selection) {
    this.selection = selection
    this.view = 'review'
    this.write()
  }
}

export const app = new AppState()
