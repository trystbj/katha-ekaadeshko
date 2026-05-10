import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/**
 * Vite alone (`npm run dev` / `npm run web:dev`) has no `/api` — Settings "Mode" stays Offline until you either:
 * - run `npm run dev:vercel` (vercel dev, API on same port; needs `vercel login`), or
 * - set `KATHA_DEV_API_PROXY` in `.env.local` to your deployed app (forwards `/api/*`, avoids CORS).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy = (env.KATHA_DEV_API_PROXY || env.DEV_API_PROXY || '').replace(/\/+$/, '')

  return {
    root: 'web',
    plugins: [react()],
    base: '/',
    server: {
      port: 4173,
      /** If 4173 is taken, Vite picks the next port — watch the terminal for the real URL. */
      strictPort: false,
      open: true,
      proxy: apiProxy
        ? { '/api': { target: apiProxy, changeOrigin: true, secure: true } }
        : undefined
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'shared'),
        '@core': resolve(__dirname, 'core')
      }
    },
    publicDir: resolve(__dirname, 'public'),
    build: {
      outDir: resolve(__dirname, 'web-dist'),
      emptyOutDir: true,
      chunkSizeWarningLimit: 650,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'web/index.html'),
          saved: resolve(__dirname, 'web/saved.html')
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n'
            if (id.includes('react-dom')) return 'vendor-react'
            if (id.includes('node_modules/react/')) return 'vendor-react'
            if (id.includes('zustand')) return 'vendor-zustand'
          }
        }
      }
    }
  }
})
