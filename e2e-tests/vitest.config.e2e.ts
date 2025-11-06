import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./setup.e2e.ts'],
    globals: true,
    testTimeout: 30000, // 30 seconds for E2E tests
    hookTimeout: 10000, // 10 seconds for setup/teardown
    include: ['**/*.e2e.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: [
      { find: '@/components', replacement: path.resolve(__dirname, '../frontend/components') },
      { find: '@/lib', replacement: path.resolve(__dirname, '../frontend/lib') },
      { find: '@', replacement: path.resolve(__dirname, '../frontend/src') },
    ],
  },
});