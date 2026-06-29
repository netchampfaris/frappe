import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// Dev-only bridge for the review panel: persists the in-browser notes to
// docs/review-notes.json so they can be read back and acted on. Only attaches
// to the dev server (`apply: 'serve'`), so it never affects production builds.
export function reviewNotesPlugin(rootDir: string): Plugin {
  const outFile = path.resolve(rootDir, 'review-notes.json')
  return {
    name: 'docs-review-notes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__review-notes', (req, res) => {
        if (req.method === 'GET') {
          let data = '[]'
          try {
            data = fs.readFileSync(outFile, 'utf-8')
          } catch {}
          res.setHeader('Content-Type', 'application/json')
          res.end(data)
          return
        }
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => (body += chunk))
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body)
              fs.writeFileSync(outFile, JSON.stringify(parsed, null, 2), 'utf-8')
              res.statusCode = 200
              res.end('{"ok":true}')
            } catch {
              res.statusCode = 400
              res.end('{"ok":false}')
            }
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}
