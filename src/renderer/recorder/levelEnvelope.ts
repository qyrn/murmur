export function rootMeanSquare(samples: ArrayLike<number>): number {
  let sumSquares = 0
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index] ?? 0
    sumSquares += sample * sample
  }
  return samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0
}

export function createLevelEnvelope(): (rms: number) => number {
  let envelope = 0
  return (rms) => {
    const target = Math.min(1, Math.pow(rms, 0.5) * 2.2)
    const rate = target > envelope ? 0.55 : 0.12
    envelope += (target - envelope) * rate
    return envelope
  }
}
