import type { DictationSettings, DictionaryEntry, WhisperModel } from '../../shared/types'

const hotkeyInput = document.querySelector<HTMLInputElement>('#hotkey')!
const autoPasteInput = document.querySelector<HTMLInputElement>('#auto-paste')!
const modelSelect = document.querySelector<HTMLSelectElement>('#model')!
const dictionaryList = document.querySelector<HTMLDivElement>('#dictionary-list')!
const addTermButton = document.querySelector<HTMLButtonElement>('#add-term')!
const saveButton = document.querySelector<HTMLButtonElement>('#save')!
const saveStatus = document.querySelector<HTMLSpanElement>('#save-status')!

let dictionary: DictionaryEntry[] = []

function renderDictionary(): void {
  dictionaryList.innerHTML = ''
  dictionary.forEach((entry, index) => {
    const row = document.createElement('div')
    row.className = 'dictionary-row'

    const termInput = document.createElement('input')
    termInput.type = 'text'
    termInput.placeholder = 'terme'
    termInput.value = entry.term
    termInput.addEventListener('input', () => {
      dictionary[index] = { ...dictionary[index]!, term: termInput.value }
    })

    const noteInput = document.createElement('input')
    noteInput.type = 'text'
    noteInput.placeholder = 'note (optionnel)'
    noteInput.value = entry.note
    noteInput.addEventListener('input', () => {
      dictionary[index] = { ...dictionary[index]!, note: noteInput.value }
    })

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'button button--remove'
    removeButton.textContent = 'Retirer'
    removeButton.addEventListener('click', () => {
      dictionary.splice(index, 1)
      renderDictionary()
    })

    row.append(termInput, noteInput, removeButton)
    dictionaryList.append(row)
  })
}

addTermButton.addEventListener('click', () => {
  dictionary.push({ term: '', note: '' })
  renderDictionary()
})

saveButton.addEventListener('click', () => {
  void (async () => {
    const settings: DictationSettings = {
      hotkey: hotkeyInput.value.trim(),
      model: modelSelect.value as WhisperModel,
      autoPaste: autoPasteInput.checked,
      microphoneDeviceId: null
    }
    await window.settingsApi.setSettings(settings)
    await window.settingsApi.setDictionary(dictionary.filter((entry) => entry.term.trim().length > 0))
    saveStatus.textContent = 'Enregistré'
    setTimeout(() => {
      saveStatus.textContent = ''
    }, 2000)
  })()
})

async function init(): Promise<void> {
  const settings = await window.settingsApi.getSettings()
  hotkeyInput.value = settings.hotkey
  autoPasteInput.checked = settings.autoPaste
  modelSelect.value = settings.model

  dictionary = await window.settingsApi.getDictionary()
  renderDictionary()
}

void init()
