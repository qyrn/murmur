import { rootMeanSquare } from './levelEnvelope'

const SILENT_LEVEL_DB = -100
const NOISE_FLOOR_RISE_RATE = 0.02
const NOISE_FLOOR_FALL_RATE = 0.2

export interface VoiceLoudness {
  trackNoise: (frame: Float32Array) => void
  trackSpeech: (frame: Float32Array) => void
  voiceAboveNoiseDb: () => number | null
  forgetSpeech: () => void
}

function decibels(frame: Float32Array): number {
  const rms = rootMeanSquare(frame)
  return rms > 0 ? Math.max(SILENT_LEVEL_DB, 20 * Math.log10(rms)) : SILENT_LEVEL_DB
}

export function createVoiceLoudness(): VoiceLoudness {
  let noiseFloorDb: number | null = null
  let loudestSpeechDb = SILENT_LEVEL_DB

  return {
    trackNoise: (frame) => {
      const levelDb = decibels(frame)
      if (noiseFloorDb === null) {
        noiseFloorDb = levelDb
        return
      }
      const rate = levelDb > noiseFloorDb ? NOISE_FLOOR_RISE_RATE : NOISE_FLOOR_FALL_RATE
      noiseFloorDb += (levelDb - noiseFloorDb) * rate
    },
    trackSpeech: (frame) => {
      loudestSpeechDb = Math.max(loudestSpeechDb, decibels(frame))
    },
    voiceAboveNoiseDb: () => (noiseFloorDb === null ? null : loudestSpeechDb - noiseFloorDb),
    forgetSpeech: () => {
      loudestSpeechDb = SILENT_LEVEL_DB
    }
  }
}
