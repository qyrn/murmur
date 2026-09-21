let activeStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelTimer: number | null = null
let levelEnvelope = 0

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

async function openMicrophone(): Promise<MediaStream> {
  const deviceId = await window.recorderApi.getMicrophoneDeviceId()

  if (deviceId) {
    try {
      const stream = await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } }),
        5000,
        'getUserMedia'
      )
      activeStream = stream
      return stream
    } catch (err) {
      // Le périphérique choisi dans les réglages n'existe plus (ex : casque Bluetooth
      // qui a changé d'identifiant après une reconnexion) : on retombe sur le micro
      // par défaut plutôt que d'échouer la dictée.
      console.warn('microphone choisi introuvable, repli sur le micro par defaut', err)
    }
  }

  const stream = await withTimeout(navigator.mediaDevices.getUserMedia({ audio: true }), 5000, 'getUserMedia')
  activeStream = stream
  return stream
}

function closeMicrophone(): void {
  activeStream?.getTracks().forEach((track) => track.stop())
  activeStream = null
}

function startLevelMetering(stream: MediaStream): void {
  levelEnvelope = 0
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
    const target = Math.min(1, Math.pow(rms, 0.5) * 2.2)
    const rate = target > levelEnvelope ? 0.55 : 0.12
    levelEnvelope += (target - levelEnvelope) * rate
    window.recorderApi.sendAudioLevel(levelEnvelope)
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
  const stream = await openMicrophone()
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
  closeMicrophone()

  const blob = new Blob(chunks, { type: 'audio/webm' })
  const buffer = await blob.arrayBuffer()
  window.recorderApi.sendRecordingStopped(buffer)
  recorder = null
}

window.addEventListener('beforeunload', () => {
  closeMicrophone()
})

window.recorderApi.onToggle((action) => {
  if (action === 'start') {
    startRecording().catch((err: unknown) => {
      closeMicrophone()
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
      window.recorderApi.sendRecordingError(message)
    })
  } else {
    void stopRecording()
  }
})
