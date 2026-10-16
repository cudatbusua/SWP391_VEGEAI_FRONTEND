import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  server: {
    proxy: {
      '/api': { target: env.API_PROXY_TARGET || 'http://localhost:8081', changeOrigin: true },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  }
})
