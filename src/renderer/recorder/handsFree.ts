import { MicVAD, utils } from '@ricky0123/vad-web'
import type { HandsFreeCommand } from '../../shared/types'
import { closeMicrophone, openMicrophone } from './microphone'
import { createLevelEnvelope, rootMeanSquare } from './levelEnvelope'
import { playWakeChime } from './wakeChime'

const SAMPLE_RATE = 16000
const SPEECH_PROBABILITY_THRESHOLD = 0.5
const PRE_SPEECH_SECONDS = 0.4
const WAKE_WINDOW_SECONDS = 2.5
const STOP_WINDOW_SECONDS = 3
const MAX_DICTATION_MS = 5 * 60 * 1000
const VAD_ASSETS_URL = new URL('../vad/', document.baseURI).href

type Phase = 'off' | 'standby' | 'dictating'

let vad: MicVAD | null = null
let phase: Phase = 'off'
let silenceLimitMs = 3000
let recentFrames: Float32Array[] = []
let segmentFrames: Float32Array[] | null = null
let wakeCheckedForSegment = false
let wakeCheckInFlight = false
let stopCheckInFlight = false
let dictationFrames: Float32Array[] = []
let dictationStartedAt = 0
let lastSpeechAt = 0
let levelEnvelope = createLevelEnvelope()
let commandQueue: Promise<void> = Promise.resolve()

function sampleCount(frames: Float32Array[]): number {
  return frames.reduce((total, frame) => total + frame.length, 0)
}

function concatFrames(frames: Float32Array[]): Float32Array {
  const joined = new Float32Array(sampleCount(frames))
  let offset = 0
  for (const frame of frames) {
    joined.set(frame, offset)
    offset += frame.length
  }
  return joined
}

function firstSeconds(frames: Float32Array[], seconds: number): Float32Array {
  return concatFrames(frames).slice(0, Math.round(seconds * SAMPLE_RATE))
}

function lastSeconds(frames: Float32Array[], seconds: number): Float32Array {
  const joined = concatFrames(frames)
  return joined.slice(Math.max(0, joined.length - Math.round(seconds * SAMPLE_RATE)))
}

function toWav(samples: Float32Array): ArrayBuffer {
  return utils.encodeWAV(samples, 1, SAMPLE_RATE, 1, 16)
}

function keepRecentFrames(frame: Float32Array): void {
  recentFrames.push(frame)
  while (sampleCount(recentFrames) > PRE_SPEECH_SECONDS * SAMPLE_RATE) {
    recentFrames.shift()
  }
}

function resetStandbyBuffers(): void {
  recentFrames = []
  segmentFrames = null
  wakeCheckedForSegment = false
}

function startDictation(): void {
  phase = 'dictating'
  dictationFrames = segmentFrames ?? [...recentFrames]
  resetStandbyBuffers()
  levelEnvelope = createLevelEnvelope()
  dictationStartedAt = performance.now()
  lastSpeechAt = dictationStartedAt
  playWakeChime()
}

function finishDictation(): void {
  if (phase !== 'dictating') {
    return
  }
  phase = 'off'
  const samples = concatFrames(dictationFrames)
  dictationFrames = []
  window.recorderApi.sendHandsFreeAudio(toWav(samples))
}

async function checkWake(samples: Float32Array): Promise<void> {
  wakeCheckedForSegment = true
  if (wakeCheckInFlight) {
    return
  }
  wakeCheckInFlight = true
  try {
    const woke = await window.recorderApi.checkWakePhrase(toWav(samples))
    if (woke && phase === 'standby') {
      startDictation()
    }
  } finally {
    wakeCheckInFlight = false
  }
}

async function checkStop(samples: Float32Array): Promise<void> {
  if (stopCheckInFlight) {
    return
  }
  stopCheckInFlight = true
  try {
    const stopped = await window.recorderApi.checkStopPhrase(toWav(samples))
    if (stopped) {
      finishDictation()
    }
  } finally {
    stopCheckInFlight = false
  }
}

function handleFrame(isSpeech: boolean, frame: Float32Array): void {
  if (phase === 'dictating') {
    dictationFrames.push(frame)
    window.recorderApi.sendAudioLevel(levelEnvelope(rootMeanSquare(frame)))
    const now = performance.now()
    if (isSpeech) {
      lastSpeechAt = now
    }
    if (now - lastSpeechAt > silenceLimitMs || now - dictationStartedAt > MAX_DICTATION_MS) {
      finishDictation()
    }
    return
  }
  if (phase !== 'standby') {
    return
  }
  keepRecentFrames(frame)
  if (!segmentFrames) {
    return
  }
  segmentFrames.push(frame)
  if (!wakeCheckedForSegment && sampleCount(segmentFrames) >= WAKE_WINDOW_SECONDS * SAMPLE_RATE) {
    void checkWake(firstSeconds(segmentFrames, WAKE_WINDOW_SECONDS))
  }
}

function handleSpeechStart(): void {
  if (phase !== 'standby') {
    return
  }
  segmentFrames = [...recentFrames]
  wakeCheckedForSegment = false
  window.recorderApi.sendHandsFreeHearing(true)
}

function handleMisfire(): void {
  segmentFrames = null
  window.recorderApi.sendHandsFreeHearing(false)
}

function handleSpeechEnd(): void {
  window.recorderApi.sendHandsFreeHearing(false)
  if (phase === 'dictating') {
    void checkStop(lastSeconds(dictationFrames, STOP_WINDOW_SECONDS))
    return
  }
  if (phase === 'standby' && segmentFrames && !wakeCheckedForSegment) {
    void checkWake(firstSeconds(segmentFrames, WAKE_WINDOW_SECONDS))
  }
  segmentFrames = null
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
    onFrameProcessed: (probabilities, frame) => handleFrame(probabilities.isSpeech > SPEECH_PROBABILITY_THRESHOLD, frame),
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
  resetStandbyBuffers()
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
