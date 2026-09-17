import type { DictationSettings, DictionaryEntry, WhisperModel } from '../../shared/types'

const hotkeyInput = document.querySelector<HTMLInputElement>('#hotkey')!
const autoPasteInput = document.querySelector<HTMLInputElement>('#auto-paste')!
const modelSelect = document.querySelector<HTMLSelectElement>('#model')!
const microphoneSelect = document.querySelector<HTMLSelectElement>('#microphone')!
const detectMicrophonesButton = document.querySelector<HTMLButtonElement>('#detect-microphones')!
const microphoneStatus = document.querySelector<HTMLParagraphElement>('#microphone-status')!
const dictionaryList = document.querySelector<HTMLDivElement>('#dictionary-list')!
const addTermButton = document.querySelector<HTMLButtonElement>('#add-term')!
const saveButton = document.querySelector<HTMLButtonElement>('#save')!
const saveStatus = document.querySelector<HTMLSpanElement>('#save-status')!

let dictionary: DictionaryEntry[] = []
let storedMicrophoneDeviceId: string | null = null

async function populateMicrophoneList(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const inputs = devices.filter((device) => device.kind === 'audioinput')

  microphoneSelect.innerHTML = ''
  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = 'Périphérique par défaut du système'
  microphoneSelect.append(defaultOption)

  for (const device of inputs) {
    const option = document.createElement('option')
    option.value = device.deviceId
    option.textContent = device.label || `Microphone (${device.deviceId.slice(0, 8)})`
    microphoneSelect.append(option)
  }

  if (storedMicrophoneDeviceId && inputs.some((device) => device.deviceId === storedMicrophoneDeviceId)) {
    microphoneSelect.value = storedMicrophoneDeviceId
  }
}

detectMicrophonesButton.addEventListener('click', () => {
  void (async () => {
    microphoneStatus.textContent = 'Détection en cours…'
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      await populateMicrophoneList()
      microphoneStatus.textContent = 'Liste mise à jour.'
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      microphoneStatus.textContent = `Impossible d'accéder au micro : ${message}`
    }
    setTimeout(() => {
      microphoneStatus.textContent = ''
    }, 3000)
  })()
})

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
      microphoneDeviceId: microphoneSelect.value || null
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
  storedMicrophoneDeviceId = settings.microphoneDeviceId
  await populateMicrophoneList()

  dictionary = await window.settingsApi.getDictionary()
  renderDictionary()
}

void init()
