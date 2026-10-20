const MURMUR_WORD = String.raw`(?:(?:mets?|et)\s+)?(?:en|on|un)\s+mur(?:\s?mure?s?)?|mur\s?mure?s?`
const SEPARATOR = String.raw`[\s,.!?…'’-]*`
const START_WORD = String.raw`st?ar(?:te?s?|c?ks?|s)?`
const STOP_WORD = String.raw`stop(?:p?e)?s?`
const MISHEARD_WORD = String.raw`[\p{L}\p{N}'’-]+`
const MAX_MISHEARD_WORDS_BEFORE_ACTION = 3
const MAX_MISHEARD_WORDS_BEFORE_TRAILING_STOP = 2

function commandPattern(actionWord: string, flags: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${MURMUR_WORD})${SEPARATOR}(?:${actionWord})(?![\\p{L}\\p{N}])${SEPARATOR}`, flags)
}

function shortUtterancePattern(actionWord: string): RegExp {
  return new RegExp(
    `^${SEPARATOR}(?:${MISHEARD_WORD}${SEPARATOR}){0,${MAX_MISHEARD_WORDS_BEFORE_ACTION}}(?<![\\p{L}\\p{N}])(?:${actionWord})${SEPARATOR}$`,
    'iu'
  )
}

const WAKE_PATTERN = commandPattern(START_WORD, 'iu')
const STOP_PATTERN = commandPattern(STOP_WORD, 'iu')
const STOP_PATTERN_ALL = commandPattern(STOP_WORD, 'giu')
const SHORT_WAKE_PATTERN = shortUtterancePattern(START_WORD)
const SHORT_STOP_PATTERN = shortUtterancePattern(STOP_WORD)
const TRAILING_STOP_PATTERN = new RegExp(
  `(?:^|[.!?…]\\s*)((?:${MISHEARD_WORD}\\s+){0,${MAX_MISHEARD_WORDS_BEFORE_TRAILING_STOP}}(?<![\\p{L}\\p{N}])(?:${STOP_WORD})${SEPARATOR})$`,
  'iu'
)

function withoutAccents(text: string): string {
  return Array.from(text, (character) => {
    const base = character.normalize('NFD').replace(/\p{M}/gu, '')
    return base.length === character.length ? base : character
  }).join('')
}

export function containsWakePhrase(text: string): boolean {
  const plainText = withoutAccents(text)
  return WAKE_PATTERN.test(plainText) || SHORT_WAKE_PATTERN.test(plainText)
}

export function containsStopPhrase(text: string): boolean {
  const plainText = withoutAccents(text)
  return STOP_PATTERN.test(plainText) || SHORT_STOP_PATTERN.test(plainText)
}

function withoutTrailingStop(text: string): string {
  const trailingStop = TRAILING_STOP_PATTERN.exec(withoutAccents(text))
  if (!trailingStop?.[1]) {
    return text
  }
  return text.slice(0, trailingStop.index + trailingStop[0].length - trailingStop[1].length).trimEnd()
}

export function extractDictation(text: string): string {
  const wake = WAKE_PATTERN.exec(withoutAccents(text))
  const afterWake = wake ? text.slice(wake.index + wake[0].length) : text
  const stops = Array.from(withoutAccents(afterWake).matchAll(STOP_PATTERN_ALL))
  const lastStop = stops.at(-1)
  if (lastStop?.index === undefined) {
    return withoutTrailingStop(afterWake)
  }
  return afterWake.slice(0, lastStop.index).replace(/[\s,;]*,[\s,;]*$/u, '.')
}
