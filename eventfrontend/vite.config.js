import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    // Disable minification completely to prevent variable conflicts
    keepNames: true,
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: false,
  },
  build: {
    // Disable minification completely for debugging
    minify: false,
    // More conservative chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          axios: ['axios'],
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
      keepNames: true,
      minifyIdentifiers: false,
    },
  },
})
