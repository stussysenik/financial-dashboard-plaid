import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./server/__tests__/setup.ts'],
    include: ['server/__tests__/**/*.test.ts'],
    deps: {
      interopDefault: true
    }
  },
}); 