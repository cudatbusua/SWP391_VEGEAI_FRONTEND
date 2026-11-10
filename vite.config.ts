import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'http://localhost:8081',
          changeOrigin: true,
          headers: {
            Origin: 'http://localhost:5173',
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
