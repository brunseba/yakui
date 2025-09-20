import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      // Node.js polyfills for browser
      stream: 'stream-browserify',
      http: 'stream-http',
      https: 'https-browserify',
      url: 'url',
      util: 'util',
      buffer: 'buffer',
      process: 'process/browser',
      events: 'events',
      // Node.js specific modules with polyfills
      'node:child_process': './src/polyfills/node.ts',
      'node:stream': 'stream-browserify',
      'node:util': 'util',
      'child_process': './src/polyfills/node.ts',
      'fs': './src/polyfills/node.ts',
      'path': './src/polyfills/node.ts',
      'os': './src/polyfills/node.ts',
      'crypto': './src/polyfills/node.ts',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'stream-browserify',
      'stream-http',
      'https-browserify',
      'url',
      'util',
      'events',
    ],
    exclude: [
      '@kubernetes/client-node'
    ]
  },
  build: {
    rollupOptions: {
      external: [
        'child_process',
        'fs',
        'path',
        'os',
        'crypto',
        'node:child_process',
        'node:stream',
        'node:util'
      ]
    }
  }
})
