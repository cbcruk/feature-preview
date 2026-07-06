/**
 * feature-preview — runtime debug panel (`feature-preview/panel`).
 *
 * A framework-agnostic, zero-dependency floating panel that lists every
 * feature, shows whether it is visible (and why — preview override vs. stage
 * default), and lets you flip previews for THIS browser at runtime. Drop it
 * into any app — React, Vue, vanilla — since it only touches the DOM.
 *
 *   import { preview } from './features'          // your shared instance
 *   import { mountPreviewPanel } from 'feature-preview/panel'
 *
 *   if (import.meta.env.DEV) mountPreviewPanel(preview)
 *
 * SSR-safe: a no-op (returns an inert handle) when there is no `document`.
 */
import type { FeatureMap, FeaturePreview, PreviewSnapshot } from './core/feature-preview.ts'

export type PanelPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface PreviewPanelOptions {
  /** Element to append the panel to. Default: `document.body`. */
  container?: HTMLElement
  /** Corner to dock the panel in. Default: `'bottom-right'`. */
  position?: PanelPosition
  /** Render collapsed to a small badge on mount. Default: `false`. */
  collapsed?: boolean
  /** Heading shown at the top of the panel. Default: `'Feature Preview'`. */
  title?: string
}

export interface PreviewPanelHandle {
  /** Remove the panel from the DOM and detach all listeners. */
  unmount(): void
  /** Show/hide without unmounting. */
  setCollapsed(collapsed: boolean): void
}

const CORNER: Record<
  PanelPosition,
  Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>
> = {
  'bottom-right': { bottom: '16px', right: '16px' },
  'bottom-left': { bottom: '16px', left: '16px' },
  'top-right': { top: '16px', right: '16px' },
  'top-left': { top: '16px', left: '16px' },
}

const inert: PreviewPanelHandle = {
  unmount() {},
  setCollapsed() {},
}

/**
 * Mount the debug panel for a `createFeaturePreview` instance. Returns a handle
 * to collapse or remove it. Call once (e.g. behind a dev-only guard).
 */
export function mountPreviewPanel<T extends FeatureMap>(
  preview: FeaturePreview<T>,
  options: PreviewPanelOptions = {},
): PreviewPanelHandle {
  if (typeof document === 'undefined') return inert

  const {
    container = document.body,
    position = 'bottom-right',
    title = 'Feature Preview',
  } = options
  let collapsed = options.collapsed ?? false

  const root = document.createElement('div')
  Object.assign(root.style, {
    position: 'fixed',
    zIndex: '2147483647',
    font: '12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace',
    color: '#e5e7eb',
    ...CORNER[position],
  })
  root.setAttribute('data-feature-preview-panel', '')

  const badge = document.createElement('button')
  Object.assign(badge.style, {
    all: 'unset',
    cursor: 'pointer',
    padding: '6px 10px',
    borderRadius: '9999px',
    background: '#111827',
    border: '1px solid #374151',
    boxShadow: '0 4px 14px rgba(0,0,0,.35)',
  })
  badge.textContent = '⚑ preview'
  badge.addEventListener('click', () => api.setCollapsed(false))

  const card = document.createElement('div')
  Object.assign(card.style, {
    width: '300px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0b1220',
    border: '1px solid #374151',
    borderRadius: '10px',
    boxShadow: '0 10px 30px rgba(0,0,0,.45)',
    overflow: 'hidden',
  })

  const header = document.createElement('div')
  Object.assign(header.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid #1f2937',
    background: '#111827',
  })
  const heading = document.createElement('strong')
  heading.textContent = `${title} · ${preview.stage}`
  const collapseBtn = mkIconButton('–', 'Collapse', () => api.setCollapsed(true))
  header.append(heading, collapseBtn)

  const rows = document.createElement('div')
  Object.assign(rows.style, { overflowY: 'auto', padding: '4px 0' })

  const footer = document.createElement('div')
  Object.assign(footer.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '8px 10px',
    borderTop: '1px solid #1f2937',
  })
  const resetAll = mkTextButton('Reset all', () => preview.clearAllPreviews())
  footer.append(resetAll)

  card.append(header, rows, footer)
  root.append(card)
  container.append(root)

  const render = (): void => {
    rows.replaceChildren(...preview.list().map(renderRow))
  }

  function renderRow(snap: PreviewSnapshot<keyof T & string>): HTMLElement {
    const row = document.createElement('label')
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      cursor: 'pointer',
    })

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = snap.visible
    checkbox.addEventListener('change', () => {
      preview.setPreview(snap.key, checkbox.checked)
      render() // reflect the true state (e.g. production lockout may reject it)
    })

    const label = document.createElement('span')
    Object.assign(label.style, { flex: '1', overflow: 'hidden', textOverflow: 'ellipsis' })
    label.textContent = snap.key
    const meta = snap.def.jira ?? snap.def.owner
    if (meta) label.title = meta

    const badgeEl = document.createElement('span')
    Object.assign(badgeEl.style, {
      fontSize: '10px',
      padding: '1px 6px',
      borderRadius: '9999px',
      color: snap.source === 'preview' ? '#fbbf24' : '#6b7280',
      border: `1px solid ${snap.source === 'preview' ? '#78350f' : '#374151'}`,
    })
    badgeEl.textContent = snap.source

    row.append(checkbox, label, badgeEl)
    if (snap.source === 'preview') {
      row.append(
        mkIconButton('↺', 'Clear override', (e) => {
          e.preventDefault()
          preview.clearPreview(snap.key)
        }),
      )
    }
    return row
  }

  const api: PreviewPanelHandle = {
    setCollapsed(next: boolean) {
      collapsed = next
      badge.style.display = collapsed ? 'block' : 'none'
      card.style.display = collapsed ? 'none' : 'flex'
    },
    unmount() {
      unsubscribe()
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
      root.remove()
    },
  }

  root.append(badge)
  const onStorage = (): void => preview.refresh()
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  const unsubscribe = preview.subscribe(render)

  render()
  api.setCollapsed(collapsed)
  return api
}

function mkIconButton(
  glyph: string,
  title: string,
  onClick: (e: MouseEvent) => void,
): HTMLButtonElement {
  const b = document.createElement('button')
  Object.assign(b.style, {
    all: 'unset',
    cursor: 'pointer',
    padding: '0 6px',
    color: '#9ca3af',
    lineHeight: '1',
  })
  b.textContent = glyph
  b.title = title
  b.addEventListener('click', onClick)
  return b
}

function mkTextButton(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  Object.assign(b.style, {
    all: 'unset',
    cursor: 'pointer',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #374151',
    color: '#e5e7eb',
  })
  b.textContent = text
  b.addEventListener('click', onClick)
  return b
}
