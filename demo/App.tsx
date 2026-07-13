import { useEffect } from 'react'
import {
  FeaturePreviewProvider,
  Preview,
  useFeaturePreview,
  usePreviewSnapshot,
} from '../src/react.tsx'
import { mountPreviewPanel } from '../src/panel.ts'
import { preview } from './features.ts'

export function App() {
  useEffect(() => {
    // The framework-agnostic debug panel (bottom-right). Everything stays in
    // sync: flip a preview here, in the panel, or via ?preview= — one instance.
    const panel = mountPreviewPanel(preview)
    return () => panel.unmount()
  }, [])

  return (
    <FeaturePreviewProvider instance={preview}>
      <main className="wrap">
        <Header />
        <section className="grid">
          <Storefront />
          <Controls />
        </section>
        <Footer />
      </main>
    </FeaturePreviewProvider>
  )
}

function Header() {
  const instance = useFeaturePreview()
  return (
    <header className="header">
      <div>
        <h1>
          feature-preview <span className="tag">demo</span>
        </h1>
        <p className="muted">
          Flip previews with the controls, the floating panel, or a <code>?preview=</code> link —
          the storefront re-renders live.
        </p>
      </div>
      <span className="stage">stage: {instance.stage}</span>
    </header>
  )
}

/** The "app" a user sees — gated declaratively with the <Preview> component. */
function Storefront() {
  return (
    <div className="card">
      <h2>Storefront</h2>

      {/* wrap-only: render children only when previewable */}
      <Preview when="betaBanner">
        <div className="banner">🎉 Beta banner — you're on the preview build</div>
      </Preview>

      {/* wrap + fallback: swap between two branches */}
      <div className="checkout">
        <Preview
          when="newCheckoutFlow"
          fallback={
            <div className="checkout-old">
              <strong>Classic checkout</strong>
              <p className="muted">The current production flow.</p>
            </div>
          }
        >
          <div className="checkout-new">
            <strong>New checkout flow</strong>
            <p className="muted">One-page express checkout (preview).</p>
          </div>
        </Preview>
      </div>

      {/* render prop: get the live boolean */}
      <Preview when="legacyExport">
        {(on) => (
          <button className="ghost" disabled={!on}>
            {on ? 'Export (legacy)' : 'Export removed'}
          </button>
        )}
      </Preview>
    </div>
  )
}

/** A control table built on usePreviewSnapshot — mirrors what the panel shows. */
function Controls() {
  const instance = useFeaturePreview()
  const snapshot = usePreviewSnapshot()

  return (
    <div className="card">
      <div className="row spread">
        <h2>Features</h2>
        <button className="link" onClick={() => instance.clearAllPreviews()}>
          Reset all
        </button>
      </div>
      <ul className="list">
        {snapshot.map((s) => (
          <li key={s.key} className="feature">
            <div className="feature-main">
              <span className={`dot ${s.visible ? 'on' : 'off'}`} />
              <div>
                <div className="feature-name">{s.key}</div>
                <div className="muted small">
                  {s.def.jira ?? '—'} · source:{' '}
                  <span className={`src ${s.source}`}>{s.source}</span>
                </div>
              </div>
            </div>
            <div className="actions">
              <button onClick={() => instance.setPreview(s.key, true)}>Show</button>
              <button onClick={() => instance.setPreview(s.key, false)}>Hide</button>
              <button className="ghost" onClick={() => instance.clearPreview(s.key)}>
                Clear
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Footer() {
  return (
    <footer className="muted small">
      Try a shareable link: <code>?preview=newCheckoutFlow</code> ·{' '}
      <code>?preview=betaBanner:off</code> · <code>?preview=reset</code>
    </footer>
  )
}
