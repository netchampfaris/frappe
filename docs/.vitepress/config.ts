import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformerStyleToClass } from '@shikijs/transformers'
import { lucideIcons } from 'frappe-ui/vite'
import { defineConfig, type DefaultTheme, type UserConfig } from 'vitepress'
import { sidebar } from './sidebar'
import { reviewNotesPlugin } from './plugins/reviewNotes'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = path.resolve(rootDir, 'node_modules/frappe-ui')

type HeadConfig = NonNullable<UserConfig['head']>[number]

interface DocsThemeConfig extends DefaultTheme.Config {
  name?: string
  version?: string
  githubUrl?: string
  sections?: typeof sidebar
}

function generatedHead(name: string, description: string): HeadConfig[] {
  return [
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: name }],
    ['meta', { property: 'og:title', content: name }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: name }],
    ['meta', { name: 'twitter:description', content: description }],
  ]
}

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

const name = 'Frappe Framework'
const description = 'The complete guide to building apps on Frappe Framework'
const toClass = transformerStyleToClass({ classPrefix: 's_' })
const base = process.env.DOCS_BASE ?? '/'

const config = defineConfig<DocsThemeConfig>({
  base,
  srcDir: 'content',
  cleanUrls: true,
  lastUpdated: true,
  title: name,
  description,
  head: generatedHead(name, description),
  markdown: {
    theme: { dark: 'tokyo-night', light: 'github-light' },
    codeTransformers: process.env.NODE_ENV === 'production' ? [toClass] : [],
  },
  themeConfig: {
    name,
    version: frappeVersion(),
    githubUrl: 'https://github.com/frappe/frappe',
    sidebar,
    sections: sidebar,
    search: { provider: 'local' },
  },
  vite: {
    plugins: [lucideIcons()],
    resolve: {
      alias: {
        '@/components': path.resolve(rootDir, 'components'),
        'frappe-ui/vitepress': path.resolve(packageRoot, 'vitepress/index.ts'),
      },
    },
    server: {
      fs: {
        allow: [rootDir, fs.realpathSync(packageRoot)],
      },
    },
    ssr: {
      noExternal: ['frappe-ui', 'dayjs'],
    },
  },
  transformHead: () => {
    const css = toClass.getCSS()
    if (!css) return []
    return [['style', { 'data-shiki': '' }, css]]
  },
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
