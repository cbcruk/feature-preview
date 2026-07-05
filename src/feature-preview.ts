/**
 * localStorage-backed feature PREVIEW for web clients.
 *
 * This is deliberately NOT a feature-flag system: nothing here is a control
 * switch a privileged operator flips (rollout / kill-switch / A-B). Instead,
 * each feature's visibility is a pure function of (build stage, this browser's
 * preview override). The purpose is to SEE finished-but-unreleased work early,
 * in any deployed environment — including production — without a redeploy.
 *
 * Design boundary (important):
 *   Because visibility is a runtime localStorage read, previewable code SHIPS
 *   in the bundle — it is NOT tree-shaken out. That is the deliberate trade for
 *   being able to reveal a feature at runtime. For work that MUST be stripped
 *   from the production bundle (embargoed / sensitive), do NOT use this
 *   library; gate it on a build-time literal instead (e.g. `if (__IS_PROD__)`
 *   with a `define`-injected constant) so the bundler folds the branch away.
 *
 * Security note:
 *   localStorage/URL previews are OBFUSCATION, not access control. Anyone can
 *   open devtools and set them. Fine for UI/UX preview; never gate paid or
 *   confidential access on this.
 */

export type Stage = 'dev' | 'staging' | 'production'

const STAGE_ORDER: Record<Stage, number> = { dev: 0, staging: 1, production: 2 }

export interface FeatureDef {
  /** Enters the preview set from this stage upward (dev < staging < production). */
  minStage?: Stage
  /** Baseline visibility when `minStage` is absent. Defaults to false. */
  default?: boolean
  /** Tracking metadata — the `evidence` field, kept next to the code. */
  jira?: string
  owner?: string
  reason?: string
}

export type FeatureMap = Record<string, FeatureDef>

export interface FeaturePreviewOptions {
  /**
   * Current build stage. Must resolve to a build-time literal for correct
   * per-build visibility (e.g. injected via Vite `define` / `import.meta.env`).
   */
  stage: Stage
  /** localStorage key prefix. Default: 'preview:'. */
  namespace?: string
  /**
   * Allow localStorage previews in production. Default: true — previewing in
   * prod is the whole point. Set false to lock the preview layer out of
   * production entirely (stage visibility then governs alone).
   */
  allowPreviewInProduction?: boolean
  /** URL query param name consumed by `syncFromUrl()`. Default: 'preview'. */
  urlParam?: string
}

export interface PreviewSnapshot<K extends string> {
  key: K
  visible: boolean
  source: 'preview' | 'default'
  def: FeatureDef
}

export function createFeaturePreview<T extends FeatureMap>(
  features: T,
  options: FeaturePreviewOptions,
) {
  type Key = keyof T & string

  const {
    stage,
    namespace = 'preview:',
    allowPreviewInProduction = true,
    urlParam = 'preview',
  } = options

  const previewAllowed = stage !== 'production' || allowPreviewInProduction

  // ---- guarded localStorage access (private mode / SSR can throw) ----------
  const safeGet = (k: string): string | null => {
    try {
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(k)
    } catch {
      return null
    }
  }
  const safeSet = (k: string, v: string): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, v)
    } catch {
      /* storage unavailable — silently skip */
    }
  }
  const safeRemove = (k: string): void => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k)
    } catch {
      /* storage unavailable — silently skip */
    }
  }

  const storageKey = (key: Key): string => `${namespace}${key}`

  /** Per-browser preview override, if any. undefined when unset/not allowed. */
  const readPreview = (key: Key): boolean | undefined => {
    if (!previewAllowed) return undefined
    const raw = safeGet(storageKey(key))
    if (raw === '1') return true
    if (raw === '0') return false
    return undefined
  }

  /** Stage-aware baseline from the static record. */
  const staticDefault = (key: Key): boolean => {
    const def = features[key]
    if (def.minStage) return STAGE_ORDER[stage] >= STAGE_ORDER[def.minStage]
    return def.default ?? false
  }

  /** Is this feature visible to the current viewer? Preview override wins, else stage default. */
  const isPreviewable = (key: Key): boolean => {
    const p = readPreview(key)
    return p !== undefined ? p : staticDefault(key)
  }

  /** Force a feature shown/hidden for THIS browser only. No-op if previews disallowed. */
  const setPreview = (key: Key, visible: boolean): void => {
    if (!previewAllowed) return
    safeSet(storageKey(key), visible ? '1' : '0')
  }

  /** Drop a single preview → the feature falls back to its stage default. */
  const clearPreview = (key: Key): void => safeRemove(storageKey(key))

  /** Drop every preview override. */
  const clearAllPreviews = (): void => {
    for (const key of Object.keys(features) as Key[]) safeRemove(storageKey(key))
  }

  /**
   * Parse preview overrides from the URL and persist them → shareable preview
   * links. Call once at app boot. Grammar (value of the `preview` param):
   *   ?preview=newCheckout          show
   *   ?preview=newCheckout:off      hide
   *   ?preview=a,b:off,c            multiple, comma-separated
   *   ?preview=reset                clear all previews
   * Unknown keys are ignored (typo-safe). Returns the keys it touched.
   */
  const syncFromUrl = (
    search: string = (globalThis as { location?: { search?: string } }).location?.search ?? '',
  ): Key[] => {
    if (!previewAllowed || !search) return []
    const raw = new URLSearchParams(search).get(urlParam)
    if (!raw) return []
    if (raw === 'reset') {
      clearAllPreviews()
      return []
    }
    const touched: Key[] = []
    for (const token of raw.split(',')) {
      const [name, state] = token.split(':')
      if (!(name in features)) continue // ignore unknown keys
      const key = name as Key
      setPreview(key, state !== 'off')
      touched.push(key)
    }
    return touched
  }

  /** Full snapshot for a debug panel / logging: visibility + source + metadata. */
  const list = (): PreviewSnapshot<Key>[] =>
    (Object.keys(features) as Key[]).map((key) => {
      const p = readPreview(key)
      return {
        key,
        visible: p !== undefined ? p : staticDefault(key),
        source: p !== undefined ? 'preview' : 'default',
        def: features[key],
      }
    })

  return {
    stage,
    isPreviewable,
    setPreview,
    clearPreview,
    clearAllPreviews,
    syncFromUrl,
    list,
  }
}

export type FeaturePreview<T extends FeatureMap> = ReturnType<typeof createFeaturePreview<T>>
