import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Variables VITE_* públicas en frontend/.env (se leen desde esta carpeta).
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // El backend (Express) corre en localhost:3001.
      // Las rutas bajo /api se enrutan al backend (sin CORS).
      '/api': 'http://localhost:3001',
    },
  },
})
