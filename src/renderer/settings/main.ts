import type {
  DictationRecord,
  DictationSettings,
  DictionaryEntry,
  HandsFreeActivity,
  HandsFreeStatus,
  InterfaceLanguageSetting,
  OverlayPosition,
  VoiceShortcut,
  WhisperModel
} from '../../shared/types'
import { termsThatFitInPrompt } from '../../shared/promptTerms'
import type { MessageKey } from '../../shared/messages'
import { setLanguage, t, translateStaticText } from './translations'

const ACCENT_PRESETS = ['#9df2ff', '#ffb547', '#7dffa1', '#ff8fd8', '#e9eef3']

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
const disableHotkeyInFullscreenInput = document.querySelector<HTMLInputElement>('#disable-hotkey-fullscreen')!
const handsFreeEnabledInput = document.querySelector<HTMLInputElement>('#hands-free-enabled')!
const handsFreeSilenceSelect = document.querySelector<HTMLSelectElement>('#hands-free-silence')!
const handsFreeStatusBox = document.querySelector<HTMLDivElement>('.listen-status')!
const handsFreeActivityLabel = document.querySelector<HTMLSpanElement>('#hands-free-activity')!
const handsFreeLastHeard = document.querySelector<HTMLSpanElement>('#hands-free-last-heard')!
const launchAtStartupInput = document.querySelector<HTMLInputElement>('#launch-at-startup')!
const launchAtStartupHint = document.querySelector<HTMLParagraphElement>('#launch-at-startup-hint')!
const modelSelect = document.querySelector<HTMLSelectElement>('#model')!
const microphoneSelect = document.querySelector<HTMLSelectElement>('#microphone')!
const keepMicrophoneOpenInput = document.querySelector<HTMLInputElement>('#keep-microphone-open')!
const detectMicrophonesButton = document.querySelector<HTMLButtonElement>('#detect-microphones')!
const microphoneStatus = document.querySelector<HTMLParagraphElement>('#microphone-status')!
const overlayPositionSelect = document.querySelector<HTMLSelectElement>('#overlay-position')!
const accentSwatchesContainer = document.querySelector<HTMLDivElement>('#accent-swatches')!
const showWaveformInput = document.querySelector<HTMLInputElement>('#show-waveform')!
const dictionaryList = document.querySelector<HTMLDivElement>('#dictionary-list')!
const addTermButton = document.querySelector<HTMLButtonElement>('#add-term')!
const dictionaryOverflowHint = document.querySelector<HTMLParagraphElement>('#dictionary-overflow')!
const shortcutList = document.querySelector<HTMLDivElement>('#shortcut-list')!
const addShortcutButton = document.querySelector<HTMLButtonElement>('#add-shortcut')!
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
const interfaceLanguageSelect = document.querySelector<HTMLSelectElement>('#interface-language')!

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
  statWpm.textContent = totalMinutes > 0.05 ? Math.round(totalWords / totalMinutes).toString() : '--'

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
    return t('time.now')
  }
  if (diffMin < 60) {
    return t('time.minutes', { count: String(diffMin) })
  }
  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) {
    return t('time.hours', { count: String(diffHours) })
  }
  return t('time.days', { count: String(Math.round(diffHours / 24)) })
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
    copyButton.textContent = t('history.copy')
    copyButton.addEventListener('click', () => {
      void navigator.clipboard.writeText(entry.text).then(() => {
        copyButton.textContent = t('history.copied')
        setTimeout(() => {
          copyButton.textContent = t('history.copy')
        }, 1500)
      })
    })

    row.append(meta, text, copyButton)
    historyList.append(row)
  }
}

let dictionary: DictionaryEntry[] = []
let shortcuts: VoiceShortcut[] = []
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

function refreshPromptOverflow(): void {
  const termsSentToWhisper = new Set(termsThatFitInPrompt(dictionary.map((entry) => entry.term)))
  let anyTermLeftOut = false
  Array.from(dictionaryList.children).forEach((row, index) => {
    const term = dictionary[index]?.term.trim() ?? ''
    const isLeftOut = term.length > 0 && !termsSentToWhisper.has(term)
    row.classList.toggle('is-left-out', isLeftOut)
    anyTermLeftOut ||= isLeftOut
  })
  dictionaryOverflowHint.hidden = !anyTermLeftOut
}

function renderDictionary(): void {
  dictionaryList.innerHTML = ''
  dictionary.forEach((entry, index) => {
    const row = document.createElement('div')
    row.className = 'dictionary-row'

    const termInput = document.createElement('input')
    termInput.type = 'text'
    termInput.placeholder = t('dictionary.termPlaceholder')
    termInput.value = entry.term
    termInput.addEventListener('input', () => {
      dictionary[index] = { ...dictionary[index]!, term: termInput.value }
      refreshPromptOverflow()
    })

    const noteInput = document.createElement('input')
    noteInput.type = 'text'
    noteInput.placeholder = t('dictionary.notePlaceholder')
    noteInput.value = entry.note
    noteInput.addEventListener('input', () => {
      dictionary[index] = { ...dictionary[index]!, note: noteInput.value }
    })

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'button button--remove'
    removeButton.textContent = t('common.remove')
    removeButton.addEventListener('click', () => {
      dictionary.splice(index, 1)
      renderDictionary()
    })

    row.append(termInput, noteInput, removeButton)
    dictionaryList.append(row)
  })
  refreshPromptOverflow()
}

addTermButton.addEventListener('click', () => {
  dictionary.push({ term: '', note: '' })
  renderDictionary()
})

function renderShortcuts(): void {
  shortcutList.innerHTML = ''
  shortcuts.forEach((shortcut, index) => {
    const row = document.createElement('div')
    row.className = 'shortcut-row'

    const spokenInput = document.createElement('input')
    spokenInput.type = 'text'
    spokenInput.placeholder = t('shortcuts.spokenPlaceholder')
    spokenInput.value = shortcut.spoken
    spokenInput.addEventListener('input', () => {
      shortcuts[index] = { ...shortcuts[index]!, spoken: spokenInput.value }
    })

    const arrow = document.createElement('span')
    arrow.className = 'shortcut-row__arrow'
    arrow.textContent = '→'

    const writtenInput = document.createElement('input')
    writtenInput.type = 'text'
    writtenInput.placeholder = t('shortcuts.writtenPlaceholder')
    writtenInput.value = shortcut.written
    writtenInput.addEventListener('input', () => {
      shortcuts[index] = { ...shortcuts[index]!, written: writtenInput.value }
    })

    const removeButton = document.createElement('button')
    removeButton.type = 'button'
    removeButton.className = 'button button--remove'
    removeButton.textContent = t('common.remove')
    removeButton.addEventListener('click', () => {
      shortcuts.splice(index, 1)
      renderShortcuts()
    })

    row.append(spokenInput, arrow, writtenInput, removeButton)
    shortcutList.append(row)
  })
}

addShortcutButton.addEventListener('click', () => {
  shortcuts.push({ spoken: '', written: '' })
  renderShortcuts()
})

async function populateMicrophoneList(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  const inputs = devices.filter((device) => device.kind === 'audioinput')

  microphoneSelect.innerHTML = ''
  const defaultOption = document.createElement('option')
  defaultOption.value = ''
  defaultOption.textContent = t('microphone.default')
  microphoneSelect.append(defaultOption)

  for (const device of inputs) {
    const option = document.createElement('option')
    option.value = device.deviceId
    option.textContent = device.label || t('microphone.unnamed', { id: device.deviceId.slice(0, 8) })
    microphoneSelect.append(option)
  }

  if (!storedMicrophoneDeviceId) {
    return
  }
  if (!inputs.some((device) => device.deviceId === storedMicrophoneDeviceId)) {
    const unpluggedOption = document.createElement('option')
    unpluggedOption.value = storedMicrophoneDeviceId
    unpluggedOption.textContent = t('microphone.unplugged')
    microphoneSelect.append(unpluggedOption)
  }
  microphoneSelect.value = storedMicrophoneDeviceId
}

detectMicrophonesButton.addEventListener('click', () => {
  void (async () => {
    microphoneStatus.textContent = t('microphone.detecting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      await populateMicrophoneList()
      microphoneStatus.textContent = t('microphone.updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      microphoneStatus.textContent = t('microphone.error', { message })
    }
    setTimeout(() => {
      microphoneStatus.textContent = ''
    }, 3000)
  })()
})

const HANDS_FREE_LABELS: Record<HandsFreeActivity, MessageKey> = {
  disabled: 'handsFree.disabled',
  paused: 'handsFree.paused',
  standby: 'handsFree.standby',
  hearing: 'handsFree.hearing',
  dictating: 'handsFree.dictating'
}

function labelMissingModels(installed: WhisperModel[]): void {
  for (const option of Array.from(modelSelect.options)) {
    if (!installed.some((model) => model === option.value)) {
      option.textContent = t('model.notInstalled', { model: option.value })
    }
  }
}

let lastHandsFreeStatus: HandsFreeStatus | null = null

function renderHandsFreeStatus(status: HandsFreeStatus): void {
  lastHandsFreeStatus = status
  handsFreeStatusBox.dataset['activity'] = status.activity
  handsFreeActivityLabel.textContent = t(HANDS_FREE_LABELS[status.activity])
  handsFreeLastHeard.textContent = status.lastHeard ? t('handsFree.lastHeard', { text: status.lastHeard }) : ''
}

saveButton.addEventListener('click', () => {
  void (async () => {
    const settings: DictationSettings = {
      hotkey: hotkeyInput.value.trim(),
      model: modelSelect.value as WhisperModel,
      autoPaste: autoPasteInput.checked,
      disableHotkeyInFullscreen: disableHotkeyInFullscreenInput.checked,
      microphoneDeviceId: microphoneSelect.value || null,
      keepMicrophoneOpen: keepMicrophoneOpenInput.checked,
      launchAtStartup: launchAtStartupInput.checked,
      startMinimized: false,
      overlayPosition: overlayPositionSelect.value as OverlayPosition,
      accentColor: selectedAccentColor,
      showWaveform: showWaveformInput.checked,
      handsFreeEnabled: handsFreeEnabledInput.checked,
      handsFreeSilenceSeconds: Number(handsFreeSilenceSelect.value),
      interfaceLanguage: interfaceLanguageSelect.value as InterfaceLanguageSetting
    }
    await window.settingsApi.setSettings(settings)
    await window.settingsApi.setDictionary(dictionary.filter((entry) => entry.term.trim().length > 0))
    await window.settingsApi.setShortcuts(
      shortcuts.filter((shortcut) => shortcut.spoken.trim().length > 0 && shortcut.written.length > 0)
    )
    await refreshLanguage()
    saveStatus.textContent = t('footer.saved')
    setTimeout(() => {
      saveStatus.textContent = ''
    }, 2000)
  })()
})

let installedModels: WhisperModel[] = []
let history: DictationRecord[] = []
let isPackaged = false
let appVersion = ''

function translateSilenceOptions(): void {
  for (const option of Array.from(handsFreeSilenceSelect.options)) {
    option.textContent = t('handsFree.seconds', { count: option.value })
  }
}

function renderTranslatedContent(): void {
  translateStaticText()
  translateSilenceOptions()
  labelMissingModels(installedModels)
  renderDictionary()
  renderShortcuts()
  renderHistory(history)
  if (lastHandsFreeStatus) {
    renderHandsFreeStatus(lastHandsFreeStatus)
  }
  launchAtStartupHint.textContent = isPackaged ? '' : t('general.startupDevOnly')
  aboutVersion.textContent = t('about.version', { version: appVersion })
}

async function refreshLanguage(): Promise<void> {
  setLanguage(await window.settingsApi.getInterfaceLanguage())
  const selectedMicrophone = microphoneSelect.value
  renderTranslatedContent()
  await populateMicrophoneList()
  microphoneSelect.value = selectedMicrophone
}

async function init(): Promise<void> {
  setLanguage(await window.settingsApi.getInterfaceLanguage())
  translateStaticText()
  const settings = await window.settingsApi.getSettings()
  interfaceLanguageSelect.value = settings.interfaceLanguage
  hotkeyInput.value = settings.hotkey
  autoPasteInput.checked = settings.autoPaste
  disableHotkeyInFullscreenInput.checked = settings.disableHotkeyInFullscreen
  modelSelect.value = settings.model
  installedModels = await window.settingsApi.getInstalledModels()
  overlayPositionSelect.value = settings.overlayPosition
  showWaveformInput.checked = settings.showWaveform
  handsFreeEnabledInput.checked = settings.handsFreeEnabled
  handsFreeSilenceSelect.value = String(settings.handsFreeSilenceSeconds)
  lastHandsFreeStatus = await window.settingsApi.getHandsFreeStatus()
  window.settingsApi.onHandsFreeStatus(renderHandsFreeStatus)
  selectedAccentColor = settings.accentColor
  renderAccentSwatches()
  storedMicrophoneDeviceId = settings.microphoneDeviceId
  keepMicrophoneOpenInput.checked = settings.keepMicrophoneOpen
  await populateMicrophoneList()

  isPackaged = await window.settingsApi.isPackaged()
  launchAtStartupInput.checked = settings.launchAtStartup
  launchAtStartupInput.disabled = !isPackaged

  dictionary = await window.settingsApi.getDictionary()
  shortcuts = await window.settingsApi.getShortcuts()
  homeHotkey.textContent = settings.hotkey
  history = await window.settingsApi.getHistory()
  renderStats(history)
  appVersion = await window.settingsApi.getAppVersion()
  renderTranslatedContent()
}

void init()
