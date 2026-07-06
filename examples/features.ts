/**
 * EXAMPLE — the per-app feature record + shared instance (single source of truth).
 *
 * This is NOT part of the published SDK. Copy it into your app and edit the
 * rows. Import from the package (`feature-preview`) rather than the relative
 * `../src` path shown here.
 *
 * One row per previewable feature. Keys are human-readable identifiers (used at
 * call sites, so make them self-describing). Jira lives in a FIELD, not the
 * key — one ticket can span rows, one row can cite one ticket, and dot-access
 * keeps call sites readable.
 *
 * `as const` gives literal key types so `preview.isPreviewable('typo')` is a
 * compile error; `satisfies FeatureMap` checks each row's shape without widening.
 */
import { createFeaturePreview, type FeatureMap, type Stage } from '../src/index.ts'

export const FEATURES = {
  newCheckoutFlow: {
    minStage: 'staging', // previewable in staging + prod-preview; hidden from prod users until GA
    jira: 'PROJ-1234',
    owner: 'eunsoo',
    reason: '2026 Q3 런치 예정, 백오피스 승인 대기',
  },
  betaBanner: {
    minStage: 'dev', // dev preview only for now
    jira: 'PROJ-1250',
    owner: 'eunsoo',
    reason: '디자인 QA 중',
  },
  legacyExport: {
    default: true, // graduated to GA everywhere — this row + its code are a cleanup target
    jira: 'PROJ-1180',
    owner: 'eunsoo',
    reason: 'GA 완료 — 다음 정리 때 이 항목 제거',
  },
} as const satisfies FeatureMap

/**
 * Resolve the build stage. This MUST fold to a build-time literal so the
 * stage-aware visibility is correct per environment. Wire it to however your
 * pipeline injects the stage — e.g. a Vite env var per build:
 *
 *   // .env.staging →  VITE_STAGE=staging
 */
const stage: Stage =
  ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STAGE as Stage) ?? 'dev'

/** The shared instance. Import this everywhere; do not create a second one. */
export const preview = createFeaturePreview(FEATURES, { stage })

// Enable shareable preview links (?preview=newCheckoutFlow). Safe to call at boot.
preview.syncFromUrl()
