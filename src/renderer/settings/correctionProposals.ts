import type { VoiceShortcut } from '../../shared/types'

const OUTER_PUNCTUATION = /^[«"'(\s]+|[.,;:!?…»"')\s]+$/gu

interface ChangedSpan {
  spoken: string[]
  written: string[]
}

function comparableWord(word: string): string {
  return word.replace(OUTER_PUNCTUATION, '')
}

function remainingCommonWordCounts(before: string[], after: string[]): number[][] {
  const lengths = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0))
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i]![j] =
        comparableWord(before[i]!) === comparableWord(after[j]!)
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
    }
  }
  return lengths
}

function changedSpans(before: string[], after: string[]): ChangedSpan[] {
  const lengths = remainingCommonWordCounts(before, after)
  const spans: ChangedSpan[] = []
  let current: ChangedSpan = { spoken: [], written: [] }
  const closeSpan = (): void => {
    if (current.spoken.length > 0 || current.written.length > 0) {
      spans.push(current)
      current = { spoken: [], written: [] }
    }
  }

  let i = 0
  let j = 0
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && comparableWord(before[i]!) === comparableWord(after[j]!)) {
      closeSpan()
      i++
      j++
    } else if (j >= after.length || (i < before.length && lengths[i + 1]![j]! >= lengths[i]![j + 1]!)) {
      current.spoken.push(before[i]!)
      i++
    } else {
      current.written.push(after[j]!)
      j++
    }
  }
  closeSpan()
  return spans
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

export function proposeCorrections(transcribed: string, corrected: string): VoiceShortcut[] {
  const proposals = new Map<string, VoiceShortcut>()
  for (const span of changedSpans(words(transcribed), words(corrected))) {
    const spoken = span.spoken.join(' ').replace(OUTER_PUNCTUATION, '')
    const written = span.written.join(' ').replace(OUTER_PUNCTUATION, '')
    const isMeaningful = /[\p{L}\p{N}]/u.test(spoken) && written.length > 0 && spoken !== written
    if (isMeaningful) {
      proposals.set(spoken.toLowerCase(), { spoken, written })
    }
  }
  return [...proposals.values()]
}
