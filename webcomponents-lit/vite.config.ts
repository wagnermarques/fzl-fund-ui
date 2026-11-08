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
        crumb: resolve(__dirname, 'src/components/crumb/crumb.component.ts'),
        'card-list': resolve(__dirname, 'src/components/card-list/card-list.component.ts'),
        'reader-chapterview': resolve(__dirname, 'src/components/reader-chapterview/reader-chapterview.component.ts'),
        'availability-grid': resolve(__dirname, 'src/components/availability-grid/availability-grid.component.ts'),
        'avatar-upload': resolve(__dirname, 'src/components/avatar-upload/avatar-upload.component.ts'),
        'geo-map': resolve(__dirname, 'src/components/geo/geo-map.component.ts'),
        'geo-explorer': resolve(__dirname, 'src/components/geo/geo-explorer.component.ts'),
        form: resolve(__dirname, 'src/components/form/form.component.ts'),
        'data-grid': resolve(__dirname, 'src/components/grid/data-grid.component.ts'),
        'reader-mark-bar': resolve(__dirname, 'src/components/reader/reader-mark-bar.component.ts'),
        'reader-content': resolve(__dirname, 'src/components/reader/reader-content.component.ts')
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
