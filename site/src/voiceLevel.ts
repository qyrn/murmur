export interface VoiceLevelSource {
  read(): number
  stop(): void
}

export function createSyntheticVoice(): VoiceLevelSource {
  const startedAt = performance.now()
  return {
    read: () => {
      const elapsed = performance.now() - startedAt
      const syllables = 0.55 + 0.45 * Math.abs(Math.sin(elapsed * 0.009))
      const pauses = Math.sin(elapsed * 0.0017) > -0.75 ? 1 : 0.15
      return Math.min(1, syllables * pauses * (0.75 + Math.random() * 0.25))
    },
    stop: () => undefined
  }
}

const MICROPHONE_GAIN = 4.5

export async function openMicrophoneVoice(): Promise<VoiceLevelSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }
  })
  const context = new AudioContext()
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  context.createMediaStreamSource(stream).connect(analyser)
  const samples = new Float32Array(analyser.fftSize)

  return {
    read: () => {
      analyser.getFloatTimeDomainData(samples)
      let sumOfSquares = 0
      for (const sample of samples) {
        sumOfSquares += sample * sample
      }
      return Math.min(1, Math.sqrt(sumOfSquares / samples.length) * MICROPHONE_GAIN)
    },
    stop: () => {
      stream.getTracks().forEach((track) => track.stop())
      void context.close()
    }
  }
}
