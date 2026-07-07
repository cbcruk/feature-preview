/**
 * DEMO — the feature record + shared instance for the interactive demo.
 *
 * In a real app this lives in your codebase and imports from the package
 * (`feature-preview`); here we import from `../src` so the demo runs straight
 * against the source with `vp dev`.
 */
import { createFeaturePreview, type FeatureMap } from '../src/index.ts'

export const FEATURES = {
  newCheckoutFlow: {
    minStage: 'staging', // hidden from dev/prod users by default — preview it to see it
    jira: 'PROJ-1234',
    owner: 'eunsoo',
    reason: '2026 Q3 런치 예정',
  },
  betaBanner: {
    minStage: 'dev', // visible in dev by default
    jira: 'PROJ-1250',
    owner: 'eunsoo',
    reason: '디자인 QA 중',
  },
  legacyExport: {
    default: true, // graduated to GA everywhere
    jira: 'PROJ-1180',
    owner: 'eunsoo',
    reason: 'GA 완료',
  },
} as const satisfies FeatureMap

/** The demo runs at the `dev` stage. */
export const preview = createFeaturePreview(FEATURES, { stage: 'dev' })

// Shareable preview links: try ?preview=newCheckoutFlow in the URL.
preview.syncFromUrl()
