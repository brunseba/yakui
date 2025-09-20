/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['../app/src/test/setup.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'app/src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'build/',
      ]
    },
    include: ['../app/src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules/', 'dist/', 'build/']
  },
})
