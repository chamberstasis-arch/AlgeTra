import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El backend (server/) corre aparte; en desarrollo Vite le reenvía /api.
const apiTarget = process.env.API_URL ?? 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
  preview: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
})
