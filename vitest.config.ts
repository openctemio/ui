import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./src/test/setup.ts'],

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.next',
      ],
    },

    // Include/exclude patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // These patterns need to be globbed, not bare directory names: a bare
    // 'node_modules' only matches the one at the root, so a git worktree under
    // .claude/ dragged its own node_modules — and a second copy of the app —
    // into every local run. That inflated the suite to ~16k tests and produced
    // hundreds of phantom failures from Playwright specs vitest cannot run,
    // which makes `npm test` untrustworthy exactly when you need it.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**',
      // git worktrees live here; they are separate checkouts, not this suite.
      '**/.claude/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
