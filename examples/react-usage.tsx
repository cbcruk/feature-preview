/**
 * EXAMPLE — wiring the React bindings and the runtime debug panel.
 *
 * Not part of the published SDK. In your app, import from the package
 * (`feature-preview/react`, `feature-preview/panel`) instead of `../src`.
 */
import { useEffect } from 'react'
import { FeaturePreviewProvider, useIsPreviewable } from '../src/react.tsx'
import { mountPreviewPanel } from '../src/panel.ts'
import { preview } from './features.ts'

export function App() {
  // Dev-only floating panel to flip previews at runtime.
  useEffect(() => {
    const panel = mountPreviewPanel(preview)
    return () => panel.unmount()
  }, [])

  return (
    <FeaturePreviewProvider instance={preview}>
      <Checkout />
    </FeaturePreviewProvider>
  )
}

function Checkout() {
  // Re-renders automatically when the preview is flipped (hook, panel, or URL).
  return useIsPreviewable('newCheckoutFlow') ? <div>new checkout</div> : <div>old checkout</div>
}
