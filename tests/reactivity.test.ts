import { afterEach, beforeEach, describe, expect, test, vi } from 'vite-plus/test'
import { createFeaturePreview, type FeatureMap } from '../src/core/feature-preview.ts'

const FEATURES = {
  fromStaging: { minStage: 'staging' },
  off: { default: false },
} as const satisfies FeatureMap

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

const asGlobal = globalThis as { localStorage?: Storage }

beforeEach(() => {
  asGlobal.localStorage = new MemoryStorage() as unknown as Storage
})

afterEach(() => {
  delete asGlobal.localStorage
})

describe('subscribe / notify', () => {
  test('fires on every kind of mutation', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const listener = vi.fn()
    p.subscribe(listener)

    p.setPreview('off', true)
    p.clearPreview('off')
    p.clearAllPreviews()
    p.refresh()
    expect(listener).toHaveBeenCalledTimes(4)
  })

  test('syncFromUrl notifies once when it touches keys, not at all otherwise', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const listener = vi.fn()
    p.subscribe(listener)

    p.syncFromUrl('?preview=off,fromStaging')
    expect(listener).toHaveBeenCalledTimes(1) // batched

    p.syncFromUrl('?preview=unknownKey')
    expect(listener).toHaveBeenCalledTimes(1) // nothing touched → no notify
  })

  test('unsubscribe stops further notifications', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const listener = vi.fn()
    const unsubscribe = p.subscribe(listener)

    p.setPreview('off', true)
    unsubscribe()
    p.setPreview('off', false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  test('a disallowed setPreview (production lockout) does not notify', () => {
    const p = createFeaturePreview(FEATURES, {
      stage: 'production',
      allowPreviewInProduction: false,
    })
    const listener = vi.fn()
    p.subscribe(listener)
    p.setPreview('off', true)
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('list() memoization', () => {
  test('returns a stable reference until a mutation invalidates it', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const first = p.list()
    expect(p.list()).toBe(first) // same reference — safe for useSyncExternalStore

    p.setPreview('off', true)
    const second = p.list()
    expect(second).not.toBe(first) // rebuilt after the change
    expect(second.find((s) => s.key === 'off')?.visible).toBe(true)
  })
})
