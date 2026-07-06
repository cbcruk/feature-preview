// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vite-plus/test'
import { act, cleanup, render } from '@testing-library/react'
import { createFeaturePreview, type FeatureMap } from '../src/core/feature-preview.ts'
import { FeaturePreviewProvider, useIsPreviewable, usePreviewSnapshot } from '../src/react.tsx'

const FEATURES = {
  fromStaging: { minStage: 'staging' },
  off: { default: false },
} as const satisfies FeatureMap

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function Checkout() {
  return <span>{useIsPreviewable('fromStaging') ? 'new' : 'old'}</span>
}

function VisibleCount() {
  const snapshot = usePreviewSnapshot()
  return <span>{snapshot.filter((s) => s.visible).length}</span>
}

describe('React bindings', () => {
  test('useIsPreviewable re-renders when the preview flips', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    const { container } = render(
      <FeaturePreviewProvider instance={preview}>
        <Checkout />
      </FeaturePreviewProvider>,
    )
    expect(container.textContent).toBe('old')

    act(() => preview.setPreview('fromStaging', true))
    expect(container.textContent).toBe('new')

    act(() => preview.clearPreview('fromStaging'))
    expect(container.textContent).toBe('old')
  })

  test('usePreviewSnapshot tracks the reactive list', () => {
    const preview = createFeaturePreview(FEATURES, { stage: 'dev' })
    const { container } = render(
      <FeaturePreviewProvider instance={preview}>
        <VisibleCount />
      </FeaturePreviewProvider>,
    )
    expect(container.textContent).toBe('0')

    act(() => preview.setPreview('off', true))
    expect(container.textContent).toBe('1')
  })

  test('hooks throw outside a provider', () => {
    // Silence React's error-boundary logging for the expected throw.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Checkout />)).toThrow(/FeaturePreviewProvider/)
    spy.mockRestore()
  })
})
