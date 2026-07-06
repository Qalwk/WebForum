import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * В dev с `VITE_API_BASE_URL=/api/v1` браузер бьёт в тот же origin (нет CORS), Vite пересылает на бэкенд.
 * Цель по умолчанию — тот же хост, что и в .env.example (можно переопределить VITE_DEV_PROXY_TARGET).
 */
const devProxyTarget =
  process.env.VITE_DEV_PROXY_TARGET ?? 'https://oleg-forum-site.matthew-0203.ru'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
      },
    },
  },
})
