import type { DictationRecord, DictationSettings, DictionaryEntry, OverlayPosition, WhisperModel } from '../../shared/types'

const ACCENT_PRESETS = ['#e0a248', '#5b9279', '#c1653f', '#5b7a9d', '#8a8578']

const navItems = Array.from(document.querySelectorAll<HTMLLIElement>('.nav-item'))
const panes = Array.from(document.querySelectorAll<HTMLElement>('.pane'))

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const section = item.dataset['section']
    navItems.forEach((other) => other.classList.toggle('is-active', other === item))
    panes.forEach((pane) => pane.classList.toggle('is-active', pane.id === `section-${section}`))
  })
})

document.querySelector<HTMLButtonElement>('#win-close')!.addEventListener('click', () => {
  window.settingsApi.closeWindow()
})
document.querySelector<HTMLButtonElement>('#win-min')!.addEventListener('click', () => {
  window.settingsApi.minimizeWindow()
})
document.querySelector<HTMLButtonElement>('#win-max')!.addEventListener('click', () => {
  window.settingsApi.toggleMaximizeWindow()
})

const hotkeyInput = document.querySelector<HTMLInputElement>('#hotkey')!
const autoPasteInput = document.querySelector<HTMLInputElement>('#auto-paste')!
const launchAtStartupInput = document.querySelector<HTMLInputElement>('#launch-at-startup')!
const launchAtStartupHint = document.querySelector<HTMLParagraphElement>('#launch-at-startup-hint')!
const modelSelect = document.querySelector<HTMLSelectElement>('#model')!
const microphoneSelect = document.querySelector<HTMLSelectElement>('#microphone')!
const detectMicrophonesButton = document.querySelector<HTMLButtonElement>('#detect-microphones')!
const microphoneStatus = document.querySelector<HTMLParagraphElement>('#microphone-status')!
const overlayPositionSelect = document.querySelector<HTMLSelectElement>('#overlay-position')!
const accentSwatchesContainer = document.querySelector<HTMLDivElement>('#accent-swatches')!
const showWaveformInput = document.querySelector<HTMLInputElement>('#show-waveform')!
const dictionaryList = document.querySelector<HTMLDivElement>('#dictionary-list')!
const addTermButton = document.querySelector<HTMLButtonElement>('#add-term')!
const saveButton = document.querySelector<HTMLButtonElement>('#save')!
const saveStatus = document.querySelector<HTMLSpanElement>('#save-status')!
const statWpm = document.querySelector<HTMLSpanElement>('#stat-wpm')!
const statWords = document.querySelector<HTMLSpanElement>('#stat-words')!
const statApps = document.querySelector<HTMLSpanElement>('#stat-apps')!
const statSaved = document.querySelector<HTMLSpanElement>('#stat-saved')!
const homeHotkey = document.querySelector<HTMLElement>('#home-hotkey')!
const historyList = document.querySelector<HTMLDivElement>('#history-list')!
const historyEmpty = document.querySelector<HTMLParagraphElement>('#history-empty')!
const aboutVersion = document.querySelector<HTMLParagraphElement>('#about-version')!

const TYPING_WPM = 40
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function formatMinutes(minutes: number): string {
  if (minutes < 1) {
    return '< 1 min'
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

function renderStats(history: DictationRecord[]): void {
  const now = Date.now()
  const thisWeek = history.filter((entry) => now - entry.timestamp <= WEEK_MS)

  const totalWords = history.reduce((sum, entry) => sum + entry.wordCount, 0)
  const totalMinutes = history.reduce((sum, entry) => sum + entry.durationMs / 60000, 0)
  statWpm.textContent = totalMinutes > 0.05 ? Math.round(totalWords / totalMinutes).toString() : '—'

  const wordsThisWeek = thisWeek.reduce((sum, entry) => sum + entry.wordCount, 0)
  statWords.textContent = wordsThisWeek.toString()

  const appsThisWeek = new Set(thisWeek.map((entry) => entry.appName))
  statApps.textContent = appsThisWeek.size.toString()

  const savedMinutes = thisWeek.reduce((sum, entry) => {
    const saved = entry.wordCount / TYPING_WPM - entry.durationMs / 60000
    return sum + Math.max(0, saved)
  }, 0)
  statSaved.textContent = formatMinutes(savedMinutes)
}

function formatRelativeDate(timestamp: number): string {
  const diffMin = Math.round((Date.now() - timestamp) / 60000)
  if (diffMin < 1) {
    return "à l'instant"
  }
  if (diffMin < 60) {
    return `il y a ${diffMin} min`
  }
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) {
    return `il y a ${diffHours} h`
  }
  return `il y a ${Math.round(diffHours / 24)} j`
}

function renderHistory(history: DictationRecord[]): void {
  const recent = [...history].reverse().slice(0, 50)
  historyList.innerHTML = ''
  historyEmpty.hidden = recent.length > 0

  for (const entry of recent) {
    const row = document.createElement('div')
    row.className = 'history-row'

    const meta = document.createElement('div')
    meta.className = 'history-row__meta'
    meta.textContent = `${formatRelativeDate(entry.timestamp)} · ${entry.appName}`

    const text = document.createElement('div')
    text.className = 'history-row__text'
    text.textContent = entry.text
    text.title = entry.text

    const copyButton = document.createElement('button')
    copyButton.type = 'button'
    copyButton.className = 'button button--ghost history-row__copy'
    copyButton.textContent = 'Copier'
    copyButton.addEventListener('click', () => {
      void navigator.clipboard.writeText(entry.text).then(() => {
        copyButton.textContent = 'Copié'
        setTimeout(() => {
          copyButton.textContent = 'Copier'
        }, 1500)
      })
    })

    row.append(meta, text, copyButton)
    historyList.append(row)
  }
}

let dictionary: DictionaryEntry[] = []
let storedMicrophoneDeviceId: string | null = null
let selectedAccentColor = ACCENT_PRESETS[0]!

function renderAccentSwatches(): void {
  accentSwatchesContainer.innerHTML = ''
  for (const color of ACCENT_PRESETS) {
    const swatch = document.createElement('button')
    swatch.type = 'button'
    swatch.className = 'swatch'
    swatch.style.background = color
    swatch.classList.toggle('is-selected', color === selectedAccentColor)
    swatch.addEventListener('click', () => {
      selectedAccentColor = color
      renderAccentSwatches()
    })
    accentSwatchesContainer.append(swatch)
  }
}

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

saveButton.addEventListener('click', () => {
  void (async () => {
    const settings: DictationSettings = {
      hotkey: hotkeyInput.value.trim(),
      model: modelSelect.value as WhisperModel,
      autoPaste: autoPasteInput.checked,
      microphoneDeviceId: microphoneSelect.value || null,
      launchAtStartup: launchAtStartupInput.checked,
      startMinimized: false,
      overlayPosition: overlayPositionSelect.value as OverlayPosition,
      accentColor: selectedAccentColor,
      showWaveform: showWaveformInput.checked
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
  overlayPositionSelect.value = settings.overlayPosition
  showWaveformInput.checked = settings.showWaveform
  selectedAccentColor = settings.accentColor
  renderAccentSwatches()
  storedMicrophoneDeviceId = settings.microphoneDeviceId
  await populateMicrophoneList()

  const packaged = await window.settingsApi.isPackaged()
  launchAtStartupInput.checked = settings.launchAtStartup
  launchAtStartupInput.disabled = !packaged
  launchAtStartupHint.textContent = packaged
    ? ''
    : "Disponible une fois l'application installée (pas en mode développement)."

  dictionary = await window.settingsApi.getDictionary()
  renderDictionary()

  homeHotkey.textContent = settings.hotkey
  const history = await window.settingsApi.getHistory()
  renderStats(history)
  renderHistory(history)

  const version = await window.settingsApi.getAppVersion()
  aboutVersion.textContent = `Version ${version}`
}

void init()
