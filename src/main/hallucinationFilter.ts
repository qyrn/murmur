const SILENCE_HALLUCINATIONS = [
  "merci d'avoir regardé cette vidéo",
  "sous-titres réalisés par la communauté d'amara.org",
  "sous-titres réalisés para la communauté d'amara.org",
  "sous-titrage st' 501",
  'sous-titrage société radio-canada',
  'abonnez-vous à la chaîne',
  "n'oubliez pas de vous abonner",
  'thank you for watching',
  'thanks for watching'
]

const SHORT_CLIP_MAX_SECONDS = 2
const SHORT_CLIP_HALLUCINATION = /^\s*merci\s*[.!…]*\s*$/iu

const NON_SPEECH_ANNOTATION = /\[[^\]]*\]|\*[^*]*\*|[♪♫]/gu

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hallucinationPattern(phrase: string): RegExp {
  const body = escapeRegex(phrase).replace(/'/g, "['’]").replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}\\s*[.!?…]*`, 'giu')
}

const HALLUCINATION_PATTERNS = SILENCE_HALLUCINATIONS.map(hallucinationPattern)

export function removeHallucinations(text: string): string {
  const cleaned = HALLUCINATION_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ' '),
    text.replace(NON_SPEECH_ANNOTATION, ' ')
  )
  return /[\p{L}\p{N}]/u.test(cleaned) ? cleaned : ''
}

export function removeShortClipHallucination(text: string, audioSeconds: number): string {
  return audioSeconds < SHORT_CLIP_MAX_SECONDS && SHORT_CLIP_HALLUCINATION.test(text) ? '' : text
}
