import { defineConfig } from 'vitest/config'

// Domain logic is plain TypeScript, so tests run in a node environment with no
// Vite plugins (the app's Cloudflare/React plugins are not needed for unit tests).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
