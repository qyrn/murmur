import { MicVAD, utils } from '@ricky0123/vad-web'
import type { HandsFreeCommand } from '../../shared/types'
import { closeMicrophone, openMicrophone } from './microphone'
import { createLevelEnvelope, rootMeanSquare } from './levelEnvelope'
import { playWakeChime } from './wakeChime'
import { SAMPLE_RATE, concatFrames, lastSeconds, trimToSeconds } from './audioFrames'
import { createCommandChecker, type CommandWindow } from './commandChecker'
import { createVoiceLoudness } from './voiceLoudness'

const SPEECH_PROBABILITY_THRESHOLD = 0.5
const COMMAND_WINDOW_SECONDS = 4
const COMMAND_STEP_SECONDS = 2
const COMMAND_LEAD_SECONDS = 1
const MIN_TAIL_SECONDS = 0.65
const MIN_VOICE_ABOVE_NOISE_DB = 30
const LISTEN_BUFFER_SECONDS = 8
const MAX_DICTATION_MS = 5 * 60 * 1000
const HOTKEY_PRE_ROLL_SECONDS = 0.2
const MAX_FRAME_GAP_MS = 300
const VAD_ASSETS_URL = new URL('../vad/', document.baseURI).href

type Phase = 'off' | 'standby' | 'dictating'
type DictationTrigger = 'voice' | 'hotkey'

let vad: MicVAD | null = null
let phase: Phase = 'off'
let dictationTrigger: DictationTrigger = 'voice'
let lastFrameAt = 0
let silenceLimitMs = 3000
let listenFrames: Float32Array[] = []
let dictationFrames: Float32Array[] = []
let speaking = false
let uncheckedSpeechSeconds = 0
let dictationStartedAt = 0
let lastSpeechAt = 0
let levelEnvelope = createLevelEnvelope()
let commandQueue: Promise<void> = Promise.resolve()
const voiceLoudness = createVoiceLoudness()

function toWav(samples: Float32Array): ArrayBuffer {
  return utils.encodeWAV(samples, 1, SAMPLE_RATE, 1, 16)
}

function commandWindow(frames: Float32Array[], seconds: number, voiceAboveNoiseDb: number | null): CommandWindow {
  return { samples: lastSeconds(frames, seconds), seconds, takenAt: performance.now(), voiceAboveNoiseDb }
}

const wakeChecker = createCommandChecker(
  (candidate) =>
    phase === 'standby'
      ? window.recorderApi.checkWakePhrase(toWav(candidate.samples), candidate.voiceAboveNoiseDb)
      : Promise.resolve(false),
  (candidate) => {
    if (phase === 'standby') {
      startDictation(candidate)
    }
  }
)

const stopChecker = createCommandChecker(
  (candidate) =>
    phase === 'dictating'
      ? window.recorderApi.checkStopPhrase(toWav(candidate.samples), candidate.voiceAboveNoiseDb)
      : Promise.resolve(false),
  () => finishDictation()
)

function activeChecker(): typeof wakeChecker {
  return phase === 'dictating' ? stopChecker : wakeChecker
}

function activeFrames(): Float32Array[] {
  return phase === 'dictating' ? dictationFrames : listenFrames
}

function isListening(): boolean {
  return phase !== 'off'
}

function listensForCommands(): boolean {
  return phase === 'standby' || (phase === 'dictating' && dictationTrigger === 'voice')
}

function forgetUncheckedSpeech(): void {
  uncheckedSpeechSeconds = 0
  voiceLoudness.forgetSpeech()
}

function isCloseToMicrophone(voiceAboveNoiseDb: number | null): boolean {
  return voiceAboveNoiseDb === null || voiceAboveNoiseDb >= MIN_VOICE_ABOVE_NOISE_DB
}

function submitUncheckedSpeech(seconds: number): void {
  const voiceAboveNoiseDb = voiceLoudness.voiceAboveNoiseDb()
  forgetUncheckedSpeech()
  if (isCloseToMicrophone(voiceAboveNoiseDb)) {
    activeChecker().submit(commandWindow(activeFrames(), seconds, voiceAboveNoiseDb))
  }
}

function trackLoudness(isSpeech: boolean, frame: Float32Array): void {
  if (!speaking) {
    voiceLoudness.trackNoise(frame)
  } else if (isSpeech) {
    voiceLoudness.trackSpeech(frame)
  }
}

function resetListening(): void {
  listenFrames = []
  speaking = false
  forgetUncheckedSpeech()
  wakeChecker.reset()
}

function beginDictation(alreadyHeard: Float32Array, trigger: DictationTrigger): void {
  dictationFrames = [alreadyHeard]
  listenFrames = []
  forgetUncheckedSpeech()
  phase = 'dictating'
  dictationTrigger = trigger
  levelEnvelope = createLevelEnvelope()
  dictationStartedAt = performance.now()
  lastSpeechAt = dictationStartedAt
}

function startDictation(wakeWindow: CommandWindow): void {
  const secondsSinceWindow = (performance.now() - wakeWindow.takenAt) / 1000
  beginDictation(lastSeconds(listenFrames, wakeWindow.seconds + secondsSinceWindow), 'voice')
  playWakeChime()
}

function takeDictationAudio(): ArrayBuffer {
  phase = 'off'
  stopChecker.reset()
  const samples = concatFrames(dictationFrames)
  dictationFrames = []
  return toWav(samples)
}

function finishDictation(): void {
  if (phase === 'dictating' && dictationTrigger === 'voice') {
    window.recorderApi.sendHandsFreeAudio(takeDictationAudio())
  }
}

function microphoneIsFlowing(): boolean {
  return performance.now() - lastFrameAt < MAX_FRAME_GAP_MS
}

export function startHotkeyDictation(): boolean {
  if (phase !== 'standby' || !microphoneIsFlowing()) {
    return false
  }
  wakeChecker.reset()
  beginDictation(lastSeconds(listenFrames, HOTKEY_PRE_ROLL_SECONDS), 'hotkey')
  return true
}

export function finishHotkeyDictation(): boolean {
  if (phase !== 'dictating' || dictationTrigger !== 'hotkey') {
    return false
  }
  window.recorderApi.sendRecordingStopped(takeDictationAudio())
  return true
}

function trackDictation(isSpeech: boolean, frame: Float32Array): void {
  window.recorderApi.sendAudioLevel(levelEnvelope(rootMeanSquare(frame)))
  if (dictationTrigger === 'hotkey') {
    return
  }
  const now = performance.now()
  if (isSpeech) {
    lastSpeechAt = now
  }
  if (now - lastSpeechAt > silenceLimitMs || now - dictationStartedAt > MAX_DICTATION_MS) {
    finishDictation()
  }
}

function handleFrame(isSpeech: boolean, frame: Float32Array): void {
  lastFrameAt = performance.now()
  if (!isListening()) {
    return
  }
  activeFrames().push(frame)
  trackLoudness(isSpeech, frame)
  if (phase === 'standby') {
    trimToSeconds(listenFrames, LISTEN_BUFFER_SECONDS)
  } else {
    trackDictation(isSpeech, frame)
  }
  if (!speaking || !listensForCommands()) {
    return
  }
  uncheckedSpeechSeconds += frame.length / SAMPLE_RATE
  if (uncheckedSpeechSeconds >= COMMAND_STEP_SECONDS) {
    submitUncheckedSpeech(COMMAND_WINDOW_SECONDS)
  }
}

function handleSpeechStart(): void {
  speaking = true
  forgetUncheckedSpeech()
  if (phase === 'standby') {
    window.recorderApi.sendHandsFreeHearing(true)
  }
}

function handleMisfire(): void {
  speaking = false
  forgetUncheckedSpeech()
  window.recorderApi.sendHandsFreeHearing(false)
}

function handleSpeechEnd(): void {
  speaking = false
  window.recorderApi.sendHandsFreeHearing(false)
  if (listensForCommands() && uncheckedSpeechSeconds >= MIN_TAIL_SECONDS) {
    submitUncheckedSpeech(Math.min(COMMAND_WINDOW_SECONDS, uncheckedSpeechSeconds + COMMAND_LEAD_SECONDS))
  }
  forgetUncheckedSpeech()
}

function createVad(): Promise<MicVAD> {
  return MicVAD.new({
    model: 'v5',
    baseAssetPath: VAD_ASSETS_URL,
    onnxWASMBasePath: VAD_ASSETS_URL,
    startOnLoad: false,
    getStream: openMicrophone,
    resumeStream: openMicrophone,
    pauseStream: async (stream) => closeMicrophone(stream),
    positiveSpeechThreshold: SPEECH_PROBABILITY_THRESHOLD,
    negativeSpeechThreshold: SPEECH_PROBABILITY_THRESHOLD - 0.15,
    redemptionMs: 600,
    preSpeechPadMs: 300,
    minSpeechMs: 250,
    submitUserSpeechOnPause: false,
    ortConfig: (ort) => {
      ort.env.wasm.numThreads = 1
      ort.env.logLevel = 'error'
    },
    onFrameProcessed: (probabilities, frame) =>
      handleFrame(probabilities.isSpeech > SPEECH_PROBABILITY_THRESHOLD, frame),
    onSpeechStart: handleSpeechStart,
    onVADMisfire: handleMisfire,
    onSpeechEnd: handleSpeechEnd
  })
}

async function applyCommand(command: HandsFreeCommand): Promise<void> {
  silenceLimitMs = command.silenceSeconds * 1000
  if (phase === 'dictating') {
    return
  }
  resetListening()
  if (command.mode === 'standby') {
    vad ??= await createVad()
    phase = 'standby'
    await vad.start()
  } else {
    phase = 'off'
    await vad?.pause()
  }
}

export function initHandsFree(): void {
  window.recorderApi.onHandsFreeMode((command) => {
    commandQueue = commandQueue
      .then(() => applyCommand(command))
      .catch((err: unknown) => {
        phase = 'off'
        void vad?.destroy()
        vad = null
        const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
        console.error('mode mains libres indisponible', message)
      })
  })
  window.recorderApi.onHandsFreeFinish(finishDictation)
}
