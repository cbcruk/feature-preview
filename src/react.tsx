/**
 * feature-preview — React bindings (`feature-preview/react`).
 *
 * Thin, reactive wrappers over a `createFeaturePreview` instance. Components
 * re-render when a preview is flipped (via a hook, the debug panel, a URL sync,
 * or a cross-tab change) — all through React's `useSyncExternalStore`, so it is
 * concurrent-safe and SSR-safe (falls back to stage defaults on the server).
 *
 *   import { preview } from './features'
 *   import { FeaturePreviewProvider, useIsPreviewable } from 'feature-preview/react'
 *
 *   <FeaturePreviewProvider instance={preview}>
 *     <App />
 *   </FeaturePreviewProvider>
 *
 *   function Checkout() {
 *     return useIsPreviewable('newCheckoutFlow') ? <NewCheckout /> : <OldCheckout />
 *   }
 *
 * `react` is an optional peer dependency — pulled in only by this subpath.
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import type { FeatureMap, FeaturePreview, PreviewSnapshot } from './core/feature-preview.ts'

const PreviewContext = createContext<FeaturePreview<FeatureMap> | null>(null)

export interface FeaturePreviewProviderProps<T extends FeatureMap> {
  /** The shared instance from `createFeaturePreview`. */
  instance: FeaturePreview<T>
  /**
   * Re-read previews when another tab writes to localStorage (a `storage`
   * event). Default: `true`. Set `false` to ignore cross-tab changes.
   */
  watchStorage?: boolean
  children?: ReactNode
}

/** Provides a feature-preview instance to the hooks below. */
export function FeaturePreviewProvider<T extends FeatureMap>({
  instance,
  watchStorage = true,
  children,
}: FeaturePreviewProviderProps<T>) {
  useEffect(() => {
    if (!watchStorage || typeof window === 'undefined') return
    const onStorage = () => instance.refresh()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [instance, watchStorage])

  // Erase the key type for the context; `useFeaturePreview<T>()` restores it.
  const erased = instance as unknown as FeaturePreview<FeatureMap>
  return createElement(PreviewContext.Provider, { value: erased }, children)
}

/**
 * The provided instance. Pass your `FeatureMap` type for key-level type-safety:
 * `useFeaturePreview<typeof FEATURES>().setPreview('newCheckoutFlow', true)`.
 */
export function useFeaturePreview<T extends FeatureMap = FeatureMap>(): FeaturePreview<T> {
  const instance = useContext(PreviewContext)
  if (!instance) {
    throw new Error('feature-preview: hooks must be used within <FeaturePreviewProvider>')
  }
  return instance as unknown as FeaturePreview<T>
}

/** Reactive visibility for a single feature. Re-renders when the preview flips. */
export function useIsPreviewable(key: string): boolean {
  const instance = useFeaturePreview()
  const read = () => instance.isPreviewable(key)
  return useSyncExternalStore((cb) => instance.subscribe(cb), read, read)
}

/** Reactive full snapshot — visibility, source, and metadata for every feature. */
export function usePreviewSnapshot(): PreviewSnapshot<string>[] {
  const instance = useFeaturePreview()
  // `list()` returns a memoized reference (stable between changes), so calling
  // it in getSnapshot is safe for useSyncExternalStore.
  const read = () => instance.list()
  return useSyncExternalStore((cb) => instance.subscribe(cb), read, read)
}
