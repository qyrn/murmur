const MURMUR_WORD = String.raw`(?:(?:mets?|et)\s+)?(?:en|on|un)\s+mur(?:\s?mure?s?)?|mur\s?mure?s?`
const SEPARATOR = String.raw`[\s,.!?…'’-]*`
const START_WORD = String.raw`st?ar(?:te?s?|c?ks?|s)?`
const STOP_WORD = String.raw`stop(?:p?e)?s?`

function commandPattern(actionWord: string, flags: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${MURMUR_WORD})${SEPARATOR}(?:${actionWord})(?![\\p{L}\\p{N}])${SEPARATOR}`, flags)
}

const WAKE_PATTERN = commandPattern(START_WORD, 'iu')
const STOP_PATTERN = commandPattern(STOP_WORD, 'iu')
const STOP_PATTERN_ALL = commandPattern(STOP_WORD, 'giu')

export function containsWakePhrase(text: string): boolean {
  return WAKE_PATTERN.test(text)
}

export function containsStopPhrase(text: string): boolean {
  return STOP_PATTERN.test(text)
}

export function soundsLikeMurmur(text: string): boolean {
  return /m[ou]{1,2}r/iu.test(text)
}

export function extractDictation(text: string): string {
  const wake = WAKE_PATTERN.exec(text)
  const afterWake = wake ? text.slice(wake.index + wake[0].length) : text
  const stops = Array.from(afterWake.matchAll(STOP_PATTERN_ALL))
  const lastStop = stops.at(-1)
  if (lastStop?.index === undefined) {
    return afterWake
  }
  return afterWake.slice(0, lastStop.index).replace(/[\s,;]*,[\s,;]*$/u, '.')
}
