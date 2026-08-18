import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000'
    }
  },
  build: {
    chunkSizeWarningLimit: 1000, // Aumenta el límite de advertencia a 1000 kB (1MB)
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'; // Agrupa las librerías en un archivo separado
          }
        }
      }
    }
  }
})
