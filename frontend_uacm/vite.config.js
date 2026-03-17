import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/static/',          // los assets se referencian como /static/assets/...
  build: {
    outDir: 'build-react',  // carpeta de salida separada para no tocar el build actual
  },
})
