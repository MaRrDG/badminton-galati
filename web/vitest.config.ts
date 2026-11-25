import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
    // Files the tests read from disk instead of importing; `vitest --changed` (pnpm
    // test:changed) cannot see them in the module graph, so a change reruns every test.
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/src/styles/tokens.css',
      '**/src/fixtures/**',
      '**/public/img/**',
      '**/studio/seed/**',
    ],
  },
});
