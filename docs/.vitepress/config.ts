import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineDocsConfig } from 'frappe-ui/vitepress'
import { sidebar } from './sidebar'
import { reviewNotesPlugin } from './plugins/reviewNotes'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Read __version__ from frappe/__init__.py at build time (runs in Node).
function frappeVersion(): string {
  try {
    const src = fs.readFileSync(
      path.resolve(rootDir, '../frappe/__init__.py'),
      'utf-8',
    )
    return src.match(/__version__\s*=\s*["']([^"']+)["']/)?.[1] ?? ''
  } catch {
    return ''
  }
}

const config = defineDocsConfig({
  rootDir,
  name: 'Frappe Framework',
  description: 'The complete guide to building apps on Frappe Framework',
  base: '/',
  githubUrl: 'https://github.com/frappe/frappe',
  version: frappeVersion(),
  sidebar,
})

// Dev-only: mirror the review panel's notes to docs/review-notes.json.
config.vite ??= {}
;(config.vite.plugins ??= []).push(reviewNotesPlugin(rootDir))

// Pin a unique dev port so the review panel's IndexedDB (scoped per origin)
// stays stable across restarts. strictPort fails loudly instead of silently
// hopping ports (which would orphan the notes); hydrate-from-file recovers
// them either way.
config.vite.server ??= {}
config.vite.server.port = 4280
config.vite.server.strictPort = true

export default config
