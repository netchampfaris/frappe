// Minimal IndexedDB store for the dev-only docs review panel. One record per
// note, indexed by page so the panel can show notes for the current page.
const DB_NAME = 'frappe-docs-review'
const STORE = 'notes'
const VERSION = 1

export interface ReviewNote {
  id: string
  page: string // route path the note belongs to
  title: string // page title at capture time
  quote: string // optional quoted text from the page
  body: string // the note itself
  resolved: boolean // flipped once the note has been acted on
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('by_page', 'page', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb()
  return db.transaction(STORE, mode).objectStore(STORE)
}

export async function allNotes(): Promise<ReviewNote[]> {
  const s = await store('readonly')
  const notes = await reqToPromise(s.getAll() as IDBRequest<ReviewNote[]>)
  return notes.sort((a, b) => a.createdAt - b.createdAt)
}

// Insert or update (keyed by id) — used for new notes and for toggling resolved.
export async function putNote(note: ReviewNote): Promise<void> {
  const s = await store('readwrite')
  await reqToPromise(s.put(note))
}

export async function deleteNote(id: string): Promise<void> {
  const s = await store('readwrite')
  await reqToPromise(s.delete(id))
}

// Replace the entire store — used to seed/merge from review-notes.json on load.
export async function replaceAll(notes: ReviewNote[]): Promise<void> {
  const s = await store('readwrite')
  await reqToPromise(s.clear())
  for (const n of notes) await reqToPromise(s.put(n))
}
