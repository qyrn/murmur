import type { DictationRecord, VoiceShortcut } from '../../shared/types'
import { proposeCorrections } from './correctionProposals'
import { t } from './translations'

export interface CorrectionCallbacks {
  onCorrected: () => void
  onRuleLearned: (rule: VoiceShortcut) => void
}

function createButton(label: string, className: string): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = className
  button.textContent = label
  return button
}

function renderProposals(proposals: VoiceShortcut[], onRuleLearned: (rule: VoiceShortcut) => void): HTMLElement {
  const container = document.createElement('div')
  container.className = 'history-row__proposals'

  const hint = document.createElement('p')
  hint.className = 'field__hint'
  hint.textContent = t('history.learnHint')
  container.append(hint)

  for (const proposal of proposals) {
    const line = document.createElement('div')
    line.className = 'history-proposal'

    const rule = document.createElement('span')
    rule.textContent = t('history.rule', { spoken: proposal.spoken, written: proposal.written })

    const learnButton = createButton(t('history.learn'), 'button button--ghost history-proposal__learn')
    learnButton.addEventListener('click', () => {
      onRuleLearned(proposal)
      learnButton.disabled = true
      learnButton.textContent = t('history.learned')
    })

    line.append(rule, learnButton)
    container.append(line)
  }
  return container
}

export function createCorrectionButton(
  row: HTMLElement,
  textElement: HTMLElement,
  entry: DictationRecord,
  callbacks: CorrectionCallbacks
): HTMLButtonElement {
  const correctButton = createButton(t('history.correct'), 'button button--ghost history-row__action')

  correctButton.addEventListener('click', () => {
    row.querySelector('.history-row__proposals')?.remove()

    const editor = document.createElement('textarea')
    editor.className = 'history-row__editor'
    editor.rows = 3
    editor.value = entry.text

    const actions = document.createElement('div')
    actions.className = 'history-row__actions'
    const cancelButton = createButton(t('common.cancel'), 'button button--ghost history-row__action')
    const validateButton = createButton(t('history.validate'), 'button button--primary history-row__action')
    actions.append(cancelButton, validateButton)

    const closeEditor = (): void => {
      editor.remove()
      actions.remove()
      textElement.hidden = false
      correctButton.parentElement!.hidden = false
    }

    cancelButton.addEventListener('click', closeEditor)
    validateButton.addEventListener('click', () => {
      const corrected = editor.value.replace(/\s+/g, ' ').trim()
      closeEditor()
      if (corrected.length === 0 || corrected === entry.text) {
        return
      }
      const proposals = proposeCorrections(entry.text, corrected)
      void window.settingsApi.updateHistoryText(entry.timestamp, corrected)
      entry.text = corrected
      textElement.textContent = corrected
      textElement.title = corrected
      callbacks.onCorrected()
      if (proposals.length > 0) {
        row.append(renderProposals(proposals, callbacks.onRuleLearned))
      }
    })

    textElement.hidden = true
    correctButton.parentElement!.hidden = true
    textElement.after(editor, actions)
    editor.focus()
  })

  return correctButton
}
