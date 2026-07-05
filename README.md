# feature-preview

Zero-dependency, localStorage-backed **feature preview** for web clients — see finished-but-unreleased work in any deployed environment (including production) without a redeploy.

Deliberately **not** a feature-flag system: there are no operator-flipped control switches (rollout / kill-switch / A-B). Each feature's visibility is a pure function of `(build stage, this browser's preview override)`.

```ts
import { preview } from 'feature-preview'

if (preview.isPreviewable('newCheckoutFlow')) {
  // ...
}
```

Keys are type-safe via `as const` — `preview.isPreviewable("typoo")` is a compile error.

Shareable preview links persist to localStorage at boot:

```
https://app.example.com/?preview=newCheckoutFlow          # show
https://app.example.com/?preview=newCheckoutFlow:off      # hide
https://app.example.com/?preview=a,b:off,c                # multiple
https://app.example.com/?preview=reset                    # clear all
```

The source files carry the full design rationale, visibility resolution order, and trade-offs (tree-shaking, security boundary, stage injection) as inline documentation.

## Layout

- [`src/feature-preview.ts`](src/feature-preview.ts) — the library (zero dependencies)
- [`src/features.ts`](src/features.ts) — the SSOT feature record + shared instance (fill in per project)
- [`src/index.ts`](src/index.ts) — public entry point

## Development

```bash
vp install   # install dependencies
vp test      # run the unit tests
vp check     # format, lint, type check
vp pack      # build the library
```
