import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // The seed is read from disk, not imported; `vitest --changed` (pnpm test:changed) cannot
    // see it in the module graph, so a change reruns every test.
    forceRerunTriggers: [...configDefaults.forceRerunTriggers, '**/seed/**'],
  },
});
