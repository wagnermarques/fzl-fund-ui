import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    angular({
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      // Workspace .ts sources outside src/ (e.g. @fzl/design-tokens) must be part of the
      // Angular compilation, otherwise the plugin emits them empty (esbuild is disabled).
      workspaceRoot: resolve(__dirname, '..'),
      include: ['/packages/design-tokens/src/**/*.ts']
    }),
    dts({ rollupTypes: true })
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FzlWebcomponentsAngular',
      fileName: 'fzl-angular',
      formats: ['es']
    },
    rollupOptions: {
      external: []
    }
  }
});
