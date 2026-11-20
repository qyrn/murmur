import { requireElement } from './dom'
import { runtimeText } from './i18n/runtimeText'

const COPY_FEEDBACK_MS = 1800

function selectTab(tabs: HTMLButtonElement[], selected: HTMLButtonElement): void {
  tabs.forEach((tab) => {
    const isSelected = tab === selected
    tab.setAttribute('aria-selected', String(isSelected))
    tab.tabIndex = isSelected ? 0 : -1
    const panelId = tab.getAttribute('aria-controls')
    const panel = panelId ? document.getElementById(panelId) : null
    if (panel) {
      panel.hidden = !isSelected
    }
  })
}

function setupTabs(): void {
  const tabList = requireElement<HTMLElement>('[role="tablist"]')
  const tabs = Array.from(tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tabs, tab))
    tab.addEventListener('keydown', (event) => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (offset === 0) {
        return
      }
      const next = tabs[(index + offset + tabs.length) % tabs.length]
      if (next) {
        selectTab(tabs, next)
        next.focus()
      }
    })
  })
}

function setupCopyButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const label = button.textContent ?? ''
      const source = document.getElementById(button.dataset.copyTarget ?? '')
      try {
        await navigator.clipboard.writeText(source?.textContent ?? '')
        button.textContent = runtimeText('copy.done')
      } catch {
        button.textContent = runtimeText('copy.blocked')
      }
      window.setTimeout(() => {
        button.textContent = label
      }, COPY_FEEDBACK_MS)
    })
  })
}

export function setupInstallSection(): void {
  setupTabs()
  setupCopyButtons()
}
