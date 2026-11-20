import { applyDictionaryCorrections, applyVoiceShortcuts } from '../../src/main/dictionary'
import type { DictionaryEntry, VoiceShortcut } from '../../src/shared/types'
import { requireElement } from './dom'
import { onLanguageChange } from './i18n/language'
import { runtimeText } from './i18n/runtimeText'

const MAX_SHORTCUTS = 8
const MAX_TERMS = 12

function removeButton(label: string, onRemove: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'remove-button'
  button.textContent = '×'
  button.setAttribute('aria-label', label)
  button.addEventListener('click', onRemove)
  return button
}

export function setupShortcutPlayground(): void {
  const spokenInput = requireElement<HTMLTextAreaElement>('#spoken-input')
  const writtenOutput = requireElement<HTMLOutputElement>('#written-output')
  const shortcutRows = requireElement<HTMLTableSectionElement>('#shortcut-rows')
  const shortcutForm = requireElement<HTMLFormElement>('#shortcut-form')
  const shortcutSpoken = requireElement<HTMLInputElement>('#shortcut-spoken')
  const shortcutWritten = requireElement<HTMLInputElement>('#shortcut-written')
  const termList = requireElement<HTMLUListElement>('#term-list')
  const termForm = requireElement<HTMLFormElement>('#term-form')
  const termInput = requireElement<HTMLInputElement>('#term-input')

  let shortcuts: VoiceShortcut[] = [
    { spoken: 'slash', written: '/' },
    { spoken: 'cloud code', written: 'Claude Code' }
  ]
  let dictionary: DictionaryEntry[] = [
    { term: 'GitHub', note: '' },
    { term: 'README', note: '' },
    { term: 'TypeScript', note: '' }
  ]

  const renderOutput = (): void => {
    const corrected = applyDictionaryCorrections(spokenInput.value, dictionary)
    writtenOutput.textContent = applyVoiceShortcuts(corrected, shortcuts)
  }

  const renderShortcuts = (): void => {
    shortcutRows.replaceChildren(
      ...shortcuts.map((shortcut) => {
        const row = document.createElement('tr')
        const spokenCell = document.createElement('td')
        spokenCell.textContent = shortcut.spoken
        const writtenCell = document.createElement('td')
        writtenCell.textContent = shortcut.written
        const actionCell = document.createElement('td')
        actionCell.append(
          removeButton(runtimeText('playground.removeShortcut', { name: shortcut.spoken }), () => {
            shortcuts = shortcuts.filter((candidate) => candidate !== shortcut)
            renderShortcuts()
          })
        )
        row.append(spokenCell, writtenCell, actionCell)
        return row
      })
    )
    renderOutput()
  }

  const renderTerms = (): void => {
    termList.replaceChildren(
      ...dictionary.map((entry) => {
        const item = document.createElement('li')
        const label = document.createElement('span')
        label.textContent = entry.term
        item.append(
          label,
          removeButton(runtimeText('playground.removeTerm', { name: entry.term }), () => {
            dictionary = dictionary.filter((candidate) => candidate !== entry)
            renderTerms()
          })
        )
        return item
      })
    )
    renderOutput()
  }

  shortcutForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const spoken = shortcutSpoken.value.trim()
    const written = shortcutWritten.value.trim()
    if (spoken.length === 0 || written.length === 0) {
      return
    }
    shortcuts = [...shortcuts.filter((candidate) => candidate.spoken !== spoken), { spoken, written }].slice(-MAX_SHORTCUTS)
    shortcutForm.reset()
    renderShortcuts()
  })

  termForm.addEventListener('submit', (event) => {
    event.preventDefault()
    const term = termInput.value.trim()
    if (term.length === 0) {
      return
    }
    dictionary = [...dictionary.filter((candidate) => candidate.term !== term), { term, note: '' }].slice(-MAX_TERMS)
    termForm.reset()
    renderTerms()
  })

  spokenInput.addEventListener('input', renderOutput)
  renderShortcuts()
  renderTerms()
  onLanguageChange(() => {
    renderShortcuts()
    renderTerms()
  })
}
