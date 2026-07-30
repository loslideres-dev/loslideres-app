import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode, isSsrBuild }) => {
  // Build del servidor (entry-server): genera el módulo de render
  if (isSsrBuild) {
    return {
      plugins: [react()],
      build: {
        ssr: true,
        rollupOptions: {
          input: './entry-server.jsx',
          output: {
            entryFileNames: 'entry-server.js',
          },
        },
        outDir: 'dist/server',
        // El server bundle no necesita minificar
        minify: false,
      },
    }
  }

  // Build del cliente (el que ya existía): igual que antes
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
  }
})
