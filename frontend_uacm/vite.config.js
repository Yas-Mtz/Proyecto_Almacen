import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/static/',
  build: {
    outDir: 'build-react',
    rollupOptions: {
      input: {
        home:  resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        gestiondeproductos: resolve(__dirname, 'gestiondeproductos.html'),
        solicitud:          resolve(__dirname, 'solicitud.html'),
        reportes:           resolve(__dirname, 'reportes.html'),
        personal:           resolve(__dirname, 'personal.html'),
      }
    }
  },
})
