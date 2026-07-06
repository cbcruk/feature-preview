// @vitest-environment happy-dom
import { afterEach, describe, expect, test } from 'vite-plus/test'
import { createFeaturePreview, type FeatureMap } from '../src/core/feature-preview.ts'
import { mountPreviewPanel } from '../src/panel.ts'

const FEATURES = {
  fromStaging: { minStage: 'staging', jira: 'PROJ-1' },
  ga: { default: true },
  off: { default: false },
} as const satisfies FeatureMap

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

const panelRoot = () => document.querySelector('[data-feature-preview-panel]')
const checkbox = (index: number) =>
  document.querySelectorAll<HTMLInputElement>(
    '[data-feature-preview-panel] input[type="checkbox"]',
  )[index]

describe('mountPreviewPanel', () => {
  test('renders one row per feature reflecting current visibility', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    mountPreviewPanel(preview)

    const boxes = document.querySelectorAll<HTMLInputElement>(
      '[data-feature-preview-panel] input[type="checkbox"]',
    )
    expect(boxes).toHaveLength(3)
    // order matches Object.keys(FEATURES): fromStaging(false), ga(true), off(false)
    expect([...boxes].map((b) => b.checked)).toEqual([false, true, false])
  })

  test('toggling a checkbox writes a preview override and re-renders the badge', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    mountPreviewPanel(preview)

    checkbox(0).click() // flip fromStaging on
    expect(preview.isPreviewable('fromStaging')).toBe(true)
    expect(localStorage.getItem('preview:fromStaging')).toBe('1')

    const badges = panelRoot()!.textContent ?? ''
    expect(badges).toContain('preview') // source badge switched from 'default'
  })

  test('external changes are reflected via subscribe', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    mountPreviewPanel(preview)

    preview.setPreview('off', true) // change through the API, not the UI
    expect(checkbox(2).checked).toBe(true)
  })

  test('Reset all clears every override', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    mountPreviewPanel(preview)
    preview.setPreview('fromStaging', true)

    const resetAll = [...panelRoot()!.querySelectorAll('button')].find(
      (b) => b.textContent === 'Reset all',
    )!
    resetAll.click()
    expect(preview.isPreviewable('fromStaging')).toBe(false)
    expect(checkbox(0).checked).toBe(false)
  })

  test('unmount removes the panel and stops reacting', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    const handle = mountPreviewPanel(preview)
    handle.unmount()
    expect(panelRoot()).toBeNull()
  })
})
