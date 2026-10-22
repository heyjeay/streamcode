import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

/**
 * The website lives at https://heyjeay.github.io/streamcode/ (GitHub Pages, project site).
 * The hero runs the real overlay in its demo mode, so the overlay page from the repo root is
 * served as /overlay.html in dev and copied into the build: the site always shows the overlay
 * exactly as the extension ships it.
 */
const OVERLAY = fileURLToPath(new URL('../stream_code.html', import.meta.url))

function overlay(): Plugin {
  return {
    name: 'stream-code-overlay',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !/\/overlay\.html(\?|$)/.test(req.url)) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(readFileSync(OVERLAY))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'overlay.html', source: readFileSync(OVERLAY, 'utf-8') })
    },
  }
}

export default defineConfig({
  base: '/streamcode/',
  plugins: [vue(), overlay()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // the screenshots and icon live with the extension; the site imports them from there
      '@ext': fileURLToPath(new URL('../extension', import.meta.url)),
    },
  },
  server: { fs: { allow: ['..'] } },
})
