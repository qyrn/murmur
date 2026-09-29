import { closeMicrophone, openMicrophone, withTimeout } from './microphone'
import { createLevelEnvelope, rootMeanSquare } from './levelEnvelope'
import { initHandsFree } from './handsFree'

let activeStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelTimer: number | null = null

function startLevelMetering(stream: MediaStream): void {
  const levelEnvelope = createLevelEnvelope()
  audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const samples = new Float32Array(analyser.fftSize)
  levelTimer = window.setInterval(() => {
    if (!analyser) {
      return
    }
    analyser.getFloatTimeDomainData(samples)
    window.recorderApi.sendAudioLevel(levelEnvelope(rootMeanSquare(samples)))
  }, 50)
}

function stopLevelMetering(): void {
  if (levelTimer !== null) {
    window.clearInterval(levelTimer)
    levelTimer = null
  }
  analyser = null
  void audioContext?.close()
  audioContext = null
}

function releaseMicrophone(): void {
  closeMicrophone(activeStream)
  activeStream = null
}

async function startRecording(): Promise<void> {
  activeStream = await openMicrophone()
  chunks = []
  recorder = new MediaRecorder(activeStream, { mimeType: 'audio/webm;codecs=opus' })
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }
  recorder.start()
  startLevelMetering(activeStream)
}

async function stopRecording(): Promise<void> {
  if (!recorder) {
    return
  }
  stopLevelMetering()

  const finished = new Promise<void>((resolvePromise) => {
    if (!recorder) {
      resolvePromise()
      return
    }
    recorder.onstop = () => resolvePromise()
  })
  recorder.stop()
  await withTimeout(finished, 5000, 'recorder.onstop').catch(() => undefined)
  releaseMicrophone()

  const blob = new Blob(chunks, { type: 'audio/webm' })
  const buffer = await blob.arrayBuffer()
  window.recorderApi.sendRecordingStopped(buffer)
  recorder = null
}

window.addEventListener('beforeunload', releaseMicrophone)

window.recorderApi.onToggle((action) => {
  if (action === 'start') {
    startRecording().catch((err: unknown) => {
      releaseMicrophone()
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      window.recorderApi.sendRecordingError(message)
    })
  } else {
    void stopRecording()
  }
})

initHandsFree()
