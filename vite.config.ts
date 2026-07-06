import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: ['src/index.ts', 'src/react.tsx', 'src/panel.ts'],
    dts: {
      tsgo: true,
    },
    // `exports` are hand-maintained in package.json (with explicit `types`
    // conditions per subpath); `react` is externalized via peerDependencies.
    exports: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    semi: false,
    singleQuote: true,
  },
})
