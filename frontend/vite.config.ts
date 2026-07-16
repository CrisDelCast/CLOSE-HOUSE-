import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 👈 Reemplaza con el puerto real de tu NestJS (ej: 3000, 4000, etc.)
        changeOrigin: true,
        secure: false,
      },
    },
  },
})