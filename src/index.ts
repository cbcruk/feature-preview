/**
 * feature-preview — core entry (`feature-preview`).
 *
 * Framework-agnostic engine. Pair it with a subpath:
 *   - `feature-preview/react`  → Provider + reactive hooks
 *   - `feature-preview/panel`  → a runtime debug panel for any framework
 */
export {
  createFeaturePreview,
  type FeaturePreview,
  type FeaturePreviewOptions,
  type FeatureDef,
  type FeatureMap,
  type PreviewSnapshot,
  type Stage,
} from './core/feature-preview.ts'
