let mediaStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelTimer: number | null = null

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolvePromise(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        rejectPromise(err)
      }
    )
  })
}

async function ensureStream(): Promise<MediaStream> {
  if (mediaStream) {
    return mediaStream
  }
  mediaStream = await withTimeout(navigator.mediaDevices.getUserMedia({ audio: true }), 5000, 'getUserMedia')
  return mediaStream
}

function startLevelMetering(stream: MediaStream): void {
  audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 256
  source.connect(analyser)

  const data = new Uint8Array(analyser.frequencyBinCount)
  levelTimer = window.setInterval(() => {
    if (!analyser) {
      return
    }
    analyser.getByteTimeDomainData(data)
    let sumSquares = 0
    for (const value of data) {
      const normalized = (value - 128) / 128
      sumSquares += normalized * normalized
    }
    const rms = Math.sqrt(sumSquares / data.length)
    window.recorderApi.sendAudioLevel(Math.min(1, rms * 4))
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

async function startRecording(): Promise<void> {
  const stream = await ensureStream()
  chunks = []
  recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }
  recorder.start()
  startLevelMetering(stream)
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

  const blob = new Blob(chunks, { type: 'audio/webm' })
  const buffer = await blob.arrayBuffer()
  window.recorderApi.sendRecordingStopped(buffer)
  recorder = null
}

window.recorderApi.onToggle((action) => {
  if (action === 'start') {
    startRecording().catch((err: unknown) => {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      window.recorderApi.sendRecordingError(message)
    })
  } else {
    void stopRecording()
  }
})
