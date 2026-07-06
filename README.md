# feature-preview

Zero-dependency, localStorage-backed **feature preview** SDK for web clients — see finished-but-unreleased work in any deployed environment (including production) without a redeploy.

Deliberately **not** a feature-flag system: there are no operator-flipped control switches (rollout / kill-switch / A-B). Each feature's visibility is a pure function of `(build stage, this browser's preview override)`.

The SDK ships three entry points — a framework-agnostic core, a React binding, and a runtime debug panel:

| Import                  | What it is                                                                 |
| ----------------------- | -------------------------------------------------------------------------- |
| `feature-preview`       | Core engine — `createFeaturePreview`, types. Zero dependencies.            |
| `feature-preview/react` | React `Provider` + reactive hooks. `react` is an optional peer dependency. |
| `feature-preview/panel` | Framework-agnostic floating debug panel to flip previews at runtime.       |

## Core

Define your features once (the single source of truth) and create the shared instance:

```ts
import { createFeaturePreview, type FeatureMap, type Stage } from 'feature-preview'

export const FEATURES = {
  newCheckoutFlow: { minStage: 'staging', jira: 'PROJ-1234', owner: 'eunsoo' },
  betaBanner: { minStage: 'dev' },
} as const satisfies FeatureMap

const stage: Stage = (import.meta.env.VITE_STAGE as Stage) ?? 'dev'

export const preview = createFeaturePreview(FEATURES, { stage })
preview.syncFromUrl() // enable shareable ?preview= links at boot
```

```ts
if (preview.isPreviewable('newCheckoutFlow')) {
  // ...
}
```

Keys are type-safe via `as const` — `preview.isPreviewable('typoo')` is a compile error.

Shareable preview links persist to localStorage at boot:

```
https://app.example.com/?preview=newCheckoutFlow          # show
https://app.example.com/?preview=newCheckoutFlow:off      # hide
https://app.example.com/?preview=a,b:off,c                # multiple
https://app.example.com/?preview=reset                    # clear all
```

## React

Wrap your app once, then read previews reactively — components re-render when a preview is flipped (via a hook, the panel, a URL sync, or another tab):

```tsx
import { FeaturePreviewProvider, useIsPreviewable } from 'feature-preview/react'
import { preview } from './features'

function Root() {
  return (
    <FeaturePreviewProvider instance={preview}>
      <Checkout />
    </FeaturePreviewProvider>
  )
}

function Checkout() {
  return useIsPreviewable('newCheckoutFlow') ? <NewCheckout /> : <OldCheckout />
}
```

- `useIsPreviewable(key)` — reactive boolean for one feature.
- `usePreviewSnapshot()` — reactive list of every feature (visibility, source, metadata).
- `useFeaturePreview<typeof FEATURES>()` — the instance, with key-level type-safety.

## Debug panel

A floating panel that lists every feature and lets you toggle previews for this browser. Framework-agnostic (it only touches the DOM) and SSR-safe (a no-op without `document`):

```ts
import { mountPreviewPanel } from 'feature-preview/panel'
import { preview } from './features'

if (import.meta.env.DEV) mountPreviewPanel(preview)
```

## Design notes

The source files carry the full design rationale, visibility resolution order, and trade-offs (tree-shaking, security boundary, stage injection) as inline documentation. In short:

- **Not tree-shaken away.** Previewable code ships in the bundle so it can be revealed at runtime. For work that MUST be stripped from production, gate it on a build-time literal instead.
- **Obfuscation, not access control.** localStorage/URL previews are UI/UX only — never gate paid or confidential access on them.

## Layout

- [`src/core/feature-preview.ts`](src/core/feature-preview.ts) — the engine (zero dependencies)
- [`src/react.tsx`](src/react.tsx) — React bindings (`feature-preview/react`)
- [`src/panel.ts`](src/panel.ts) — runtime debug panel (`feature-preview/panel`)
- [`src/index.ts`](src/index.ts) — core entry point (`feature-preview`)
- [`examples/`](examples) — copy-paste starting points (feature record + React/panel wiring)

## Development

```bash
vp install   # install dependencies
vp test      # run the unit tests
vp check     # format, lint, type check
vp pack      # build the SDK (core + react + panel)
```
