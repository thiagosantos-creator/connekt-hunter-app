import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@connekt/db': resolve(__dirname, '../../packages/db/src/index.ts'),
    },
  },
});
