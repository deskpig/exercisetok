import { defineConfig } from 'vite';

// Manifest content scripts are classic scripts, so shared imports must be bundled into an IIFE.
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/assets', emptyOutDir: false,
    lib: { entry: 'src/content/index.ts', name: 'ExerciseTokCapture', formats: ['iife'], fileName: () => 'content.js' }
  }
});
