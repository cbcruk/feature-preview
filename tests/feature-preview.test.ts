import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'
import { createFeaturePreview, type FeatureMap } from '../src/feature-preview.ts'

const FEATURES = {
  fromStaging: { minStage: 'staging' },
  fromDev: { minStage: 'dev' },
  ga: { default: true },
  off: { default: false },
  bare: {},
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

describe('stage-aware defaults', () => {
  test('minStage gates visibility by build stage', () => {
    const dev = createFeaturePreview(FEATURES, { stage: 'dev' })
    const staging = createFeaturePreview(FEATURES, { stage: 'staging' })
    const prod = createFeaturePreview(FEATURES, { stage: 'production' })

    expect(dev.isPreviewable('fromStaging')).toBe(false)
    expect(staging.isPreviewable('fromStaging')).toBe(true)
    expect(prod.isPreviewable('fromStaging')).toBe(true)

    expect(dev.isPreviewable('fromDev')).toBe(true)
  })

  test('default:true is visible everywhere, missing baseline is hidden', () => {
    const prod = createFeaturePreview(FEATURES, { stage: 'production' })
    expect(prod.isPreviewable('ga')).toBe(true)
    expect(prod.isPreviewable('off')).toBe(false)
    expect(prod.isPreviewable('bare')).toBe(false)
  })
})

describe('preview overrides', () => {
  test('override wins over stage default in both directions', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })

    p.setPreview('fromStaging', true)
    expect(p.isPreviewable('fromStaging')).toBe(true)

    p.setPreview('ga', false)
    expect(p.isPreviewable('ga')).toBe(false)
  })

  test('clearPreview restores the stage default', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    p.setPreview('fromStaging', true)
    p.clearPreview('fromStaging')
    expect(p.isPreviewable('fromStaging')).toBe(false)
  })

  test('clearAllPreviews drops every override', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    p.setPreview('fromStaging', true)
    p.setPreview('off', true)
    p.clearAllPreviews()
    expect(p.isPreviewable('fromStaging')).toBe(false)
    expect(p.isPreviewable('off')).toBe(false)
  })

  test('namespace isolates storage keys', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev', namespace: 'pv/' })
    p.setPreview('off', true)
    expect(localStorage.getItem('pv/off')).toBe('1')
    expect(localStorage.getItem('preview:off')).toBeNull()
  })
})

describe('production lockout', () => {
  test('allowPreviewInProduction:false ignores overrides in prod', () => {
    const p = createFeaturePreview(FEATURES, {
      stage: 'production',
      allowPreviewInProduction: false,
    })
    p.setPreview('off', true)
    expect(localStorage.getItem('preview:off')).toBeNull()
    expect(p.isPreviewable('off')).toBe(false)
    expect(p.isPreviewable('ga')).toBe(true)
  })

  test('lockout does not affect non-production stages', () => {
    const p = createFeaturePreview(FEATURES, {
      stage: 'staging',
      allowPreviewInProduction: false,
    })
    p.setPreview('off', true)
    expect(p.isPreviewable('off')).toBe(true)
  })
})

describe('syncFromUrl', () => {
  test('shows, hides, and handles multiple comma-separated keys', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const touched = p.syncFromUrl('?preview=fromStaging,off:off,ga')
    expect(touched).toEqual(['fromStaging', 'off', 'ga'])
    expect(p.isPreviewable('fromStaging')).toBe(true)
    expect(p.isPreviewable('off')).toBe(false)
  })

  test('unknown keys are ignored (typo-safe)', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    const touched = p.syncFromUrl('?preview=fromStaging,typoo')
    expect(touched).toEqual(['fromStaging'])
  })

  test('reset clears all overrides', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    p.setPreview('off', true)
    p.syncFromUrl('?preview=reset')
    expect(p.isPreviewable('off')).toBe(false)
  })

  test('respects a custom urlParam and empty search', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev', urlParam: 'pv' })
    expect(p.syncFromUrl('?pv=off')).toEqual(['off'])
    expect(p.isPreviewable('off')).toBe(true)
    expect(p.syncFromUrl('')).toEqual([])
  })
})

describe('list snapshot', () => {
  test('reports visibility, source, and metadata', () => {
    const p = createFeaturePreview(FEATURES, { stage: 'dev' })
    p.setPreview('off', true)
    const byKey = Object.fromEntries(p.list().map((s) => [s.key, s]))

    expect(byKey.off.visible).toBe(true)
    expect(byKey.off.source).toBe('preview')
    expect(byKey.fromStaging.source).toBe('default')
    expect(byKey.fromStaging.visible).toBe(false)
    expect(byKey.ga.def).toBe(FEATURES.ga)
  })
})

describe('SSR / no storage', () => {
  test('falls back to stage defaults when localStorage is absent', () => {
    delete asGlobal.localStorage
    const p = createFeaturePreview(FEATURES, { stage: 'staging' })
    expect(p.isPreviewable('fromStaging')).toBe(true)
    expect(p.isPreviewable('off')).toBe(false)
    expect(() => p.setPreview('off', true)).not.toThrow()
    expect(p.syncFromUrl('?preview=off')).toEqual(['off'])
  })
})
