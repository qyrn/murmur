const FILLER_PATTERN = /(?<![\p{L}\p{N}'’-])(?:e+u+h+|h+e+u+h*|h+u+m+|h+m+|m+h+)(?![\p{L}\p{N}'’-])(\s*(?:\.{2,}|…|,))?\s*/giu
const ENDS_SENTENCE = /(?:^|[.!?…])\s*$/u
const ELLIPSIS = /\.{2,}|…/u

const WORDS_CAPITALIZED_AFTER_ELLIPSIS = new Set([
  'je', 'j', 'tu', 't', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'ça', 'c', 'ce', 'cet', 'cette',
  'et', 'mais', 'ou', 'donc', 'alors', 'puis', 'ouais', 'oui', 'non', 'bah', 'ben', 'genre', 'enfin', 'en',
  'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'à', 'au', 'aux', 'pour', 'par', 'sur', 'dans',
  'avec', 'sans', 'que', 'qu', 'qui', 'quoi', 'comment', 'pourquoi', 'est', 'si', 's', 'pas', 'plus', 'faut',
  'faudrait', 'dis', 'fais', 'va', 'là', 'y', 'n', 'm'
])

type WordCase = 'keep' | 'capitalize' | 'lowercase'

function recaseFirstWord(text: string, wordCase: WordCase): string {
  if (wordCase === 'capitalize') {
    return text.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase())
  }
  if (wordCase === 'lowercase') {
    return text.replace(/^\p{Lu}[\p{Ll}]*/u, (word) =>
      WORDS_CAPITALIZED_AFTER_ELLIPSIS.has(word.toLowerCase()) ? word.toLowerCase() : word
    )
  }
  return text
}

function tidyOrphanPunctuation(text: string): string {
  return text
    .replace(/,(?=\s*[.!?…])/gu, '')
    .replace(/(?<=[\p{L}\p{N}])\s+(?=[.,…]+(?:\s|$))/gu, '')
    .replace(/([.!?…])\s+[.,…]+(?=\s|$)/gu, '$1')
    .replace(/^[\s.,…]+/u, '')
}

export function removeFillerWords(text: string): string {
  let cleaned = ''
  let cursor = 0
  let nextWordCase: WordCase = 'keep'
  for (const match of text.matchAll(FILLER_PATTERN)) {
    cleaned += recaseFirstWord(text.slice(cursor, match.index), nextWordCase)
    cursor = match.index + match[0].length
    if (ENDS_SENTENCE.test(cleaned)) {
      nextWordCase = 'capitalize'
    } else if (match[1] && ELLIPSIS.test(match[1])) {
      nextWordCase = 'lowercase'
    } else {
      nextWordCase = 'keep'
    }
  }
  cleaned += recaseFirstWord(text.slice(cursor), nextWordCase)
  return tidyOrphanPunctuation(cleaned)
}
