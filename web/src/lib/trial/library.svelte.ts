/**
 * Your recorded trials, kept in this browser (IndexedDB). Nothing is uploaded.
 *
 * Two object stores: "meta" (small, listed in the sidebar) and "trials" (full landmark
 * data, loaded only when opened). If IndexedDB is unavailable (private mode in some
 * browsers), the library falls back to memory for the session.
 */
import type { Trial } from './types'

export interface TrialMeta {
  id: string
  test: Trial['test']
  createdAt: string
  frames: number
  durationMs: number
  source: Trial['source']
  name?: string
}

export const metaOf = (t: Trial): TrialMeta => ({
  id: t.id,
  test: t.test,
  createdAt: t.createdAt,
  frames: t.frames.length,
  durationMs: t.frames.at(-1)?.t ?? 0,
  source: t.source,
})

const DB = 'poseproof'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('meta', { keyPath: 'id' })
      req.result.createObjectStore('trials', { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function get<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

class Library {
  items = $state<TrialMeta[]>([])
  persistent = $state(true)
  private db: Promise<IDBDatabase> | null = null
  private memory = new Map<string, Trial>()

  private async open(): Promise<IDBDatabase | null> {
    if (!this.persistent) return null
    try {
      this.db ??= openDb()
      return await this.db
    } catch {
      this.persistent = false
      return null
    }
  }

  async load() {
    const db = await this.open()
    if (!db) return
    const all = await get(db.transaction('meta').objectStore('meta').getAll() as IDBRequest<TrialMeta[]>)
    this.items = all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async add(trial: Trial) {
    const meta = metaOf(trial)
    this.memory.set(trial.id, trial)
    this.items = [meta, ...this.items.filter((m) => m.id !== meta.id)]
    const db = await this.open()
    if (!db) return
    const tx = db.transaction(['meta', 'trials'], 'readwrite')
    tx.objectStore('meta').put(meta)
    tx.objectStore('trials').put(trial)
    await done(tx)
  }

  async get(id: string): Promise<Trial | null> {
    const cached = this.memory.get(id)
    if (cached) return cached
    const db = await this.open()
    if (!db) return null
    const trial = (await get(db.transaction('trials').objectStore('trials').get(id))) as Trial | undefined
    if (trial) this.memory.set(id, trial)
    return trial ?? null
  }

  async rename(id: string, name: string) {
    this.items = this.items.map((m) => (m.id === id ? { ...m, name } : m))
    const db = await this.open()
    if (!db) return
    const meta = this.items.find((m) => m.id === id)
    if (!meta) return
    const tx = db.transaction('meta', 'readwrite')
    tx.objectStore('meta').put($state.snapshot(meta))
    await done(tx)
  }

  async remove(id: string) {
    this.memory.delete(id)
    this.items = this.items.filter((m) => m.id !== id)
    const db = await this.open()
    if (!db) return
    const tx = db.transaction(['meta', 'trials'], 'readwrite')
    tx.objectStore('meta').delete(id)
    tx.objectStore('trials').delete(id)
    await done(tx)
  }
}

export const library = new Library()
