let mediaStream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []

async function ensureStream(): Promise<MediaStream> {
  if (mediaStream) {
    return mediaStream
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  return mediaStream
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
}

async function stopRecording(): Promise<void> {
  if (!recorder) {
    return
  }
  const finished = new Promise<void>((resolvePromise) => {
    if (!recorder) {
      resolvePromise()
      return
    }
    recorder.onstop = () => resolvePromise()
  })
  recorder.stop()
  await finished

  const blob = new Blob(chunks, { type: 'audio/webm' })
  const buffer = await blob.arrayBuffer()
  window.recorderApi.sendRecordingStopped(buffer)
  recorder = null
}

window.recorderApi.onToggle((action) => {
  if (action === 'start') {
    void startRecording()
  } else {
    void stopRecording()
  }
})
