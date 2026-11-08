import { defineConfig } from 'vitest/config';

// Tests mirror src/ under test/. The exhaustive census of Lotto takes a few seconds.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 120000,
  },
});
