const SILENT_LEVEL_DB = -100
const NOISE_FLOOR_FALL_RATE = 0.3
const NOISE_FLOOR_RISE_RATE = 0.02
const NOISE_FLOOR_RISE_WINDOW_DB = 6
const PEAK_DECAY_DB_PER_SECOND = 4
const MIN_SPEECH_SPAN_DB = 18
const NOISE_GATE_DB = 3
const DISPLAY_RANGE_DB = 24
const ATTACK_RATE = 0.6
const RELEASE_RATE = 0.25

export function rootMeanSquare(samples: ArrayLike<number>): number {
  let sumSquares = 0
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index] ?? 0
    sumSquares += sample * sample
  }
  return samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0
}

function decibels(rms: number): number {
  return rms > 0 ? Math.max(SILENT_LEVEL_DB, 20 * Math.log10(rms)) : SILENT_LEVEL_DB
}

export function createVoiceLevelMeter(): (rms: number) => number {
  let noiseFloorDb: number | null = null
  let peakDb = SILENT_LEVEL_DB
  let lastFrameAt = performance.now()
  let level = 0

  return (rms) => {
    const now = performance.now()
    const elapsedSeconds = (now - lastFrameAt) / 1000
    lastFrameAt = now
    const levelDb = decibels(rms)

    if (noiseFloorDb === null) {
      noiseFloorDb = levelDb
    } else {
      if (levelDb < noiseFloorDb) {
        noiseFloorDb += (levelDb - noiseFloorDb) * NOISE_FLOOR_FALL_RATE
      } else if (levelDb < noiseFloorDb + NOISE_FLOOR_RISE_WINDOW_DB) {
        noiseFloorDb += (levelDb - noiseFloorDb) * NOISE_FLOOR_RISE_RATE
      }
    }

    peakDb = Math.max(levelDb, peakDb - PEAK_DECAY_DB_PER_SECOND * elapsedSeconds, noiseFloorDb + MIN_SPEECH_SPAN_DB)
    const quietestShownDb = Math.max(noiseFloorDb + NOISE_GATE_DB, peakDb - DISPLAY_RANGE_DB)
    const target = Math.min(1, Math.max(0, (levelDb - quietestShownDb) / (peakDb - quietestShownDb)))

    level += (target - level) * (target > level ? ATTACK_RATE : RELEASE_RATE)
    return level
  }
}
