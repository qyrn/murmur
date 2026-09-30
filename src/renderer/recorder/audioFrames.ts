export const SAMPLE_RATE = 16000

export function sampleCount(frames: Float32Array[]): number {
  return frames.reduce((total, frame) => total + frame.length, 0)
}

export function concatFrames(frames: Float32Array[]): Float32Array {
  const joined = new Float32Array(sampleCount(frames))
  let offset = 0
  for (const frame of frames) {
    joined.set(frame, offset)
    offset += frame.length
  }
  return joined
}

export function lastSeconds(frames: Float32Array[], seconds: number): Float32Array {
  const joined = concatFrames(frames)
  return joined.slice(Math.max(0, joined.length - Math.round(seconds * SAMPLE_RATE)))
}

export function trimToSeconds(frames: Float32Array[], seconds: number): void {
  const maxSamples = seconds * SAMPLE_RATE
  let total = sampleCount(frames)
  while (frames.length > 0 && total - (frames[0]?.length ?? 0) >= maxSamples) {
    total -= frames.shift()?.length ?? 0
  }
}
