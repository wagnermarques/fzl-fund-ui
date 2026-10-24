import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FzlWebcomponentsEs6',
      fileName: 'fzl-es6',
      formats: ['es']
    },
    rollupOptions: {
      external: []
    }
  },
  plugins: [dts({ rollupTypes: true })]
});
