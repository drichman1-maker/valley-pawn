import { defineConfig } from 'vitest/config';

// Runs the SQL migrations against a real PostgreSQL database (see tests/db/README in docs/TESTING.md).
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
