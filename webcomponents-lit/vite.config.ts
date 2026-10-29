import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      // One entry per component (subpath exports in package.json) plus the
      // aggregate index, so consumers can import only what they use.
      entry: {
        'fzl-lit': resolve(__dirname, 'src/index.ts'),
        button: resolve(__dirname, 'src/components/button/button.component.ts'),
        crumb: resolve(__dirname, 'src/components/crumb/crumb.component.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      // lit stays a peer dependency: bundling it would load a second copy of
      // Lit in the consumer (e.g. the appshell).
      external: [/^lit($|\/)/, /^@lit\//]
    }
  },
  plugins: [dts({ rollupTypes: true })]
});
