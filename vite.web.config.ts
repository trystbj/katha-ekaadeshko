import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/web',
  plugins: [react()],
  base: '/',
  server: {
    port: 4173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  publicDir: resolve(__dirname, 'build'),
  build: {
    outDir: resolve(__dirname, 'web-dist'),
    emptyOutDir: true
  }
})

