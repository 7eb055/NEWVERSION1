import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    // Disable minification issues with variable names
    keepNames: true,
  },
  build: {
    // Use esbuild for minification with safer settings
    minify: 'esbuild',
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
      keepNames: true,
    },
  },
})
