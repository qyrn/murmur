const BASE_PROMPT = 'Dictée en français, avec parfois des mots ou expressions en anglais conservés tels quels'
const MAX_PROMPT_CHARACTERS = 600

export function promptWithTerms(terms: string[]): string {
  return terms.length === 0 ? `${BASE_PROMPT}.` : `${BASE_PROMPT}, notamment : ${terms.join(', ')}.`
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function countMentions(term: string, dictations: string[]): number {
  const words = term.split(/\s+/).map(escapeRegex).join('\\s+')
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${words}(?![\\p{L}\\p{N}])`, 'giu')
  return dictations.reduce((total, text) => total + (text.match(pattern)?.length ?? 0), 0)
}

export function termsThatFitInPrompt(rawTerms: string[], recentDictations: string[]): string[] {
  const terms = [...new Set(rawTerms.map((term) => term.trim()).filter(Boolean))]
  const mentions = new Map(terms.map((term) => [term, countMentions(term, recentDictations)]))
  const byPriority = terms
    .map((term, position) => ({ term, position, mentions: mentions.get(term) ?? 0 }))
    .sort((first, second) => second.mentions - first.mentions || second.position - first.position)

  const kept = new Set<string>()
  for (const { term } of byPriority) {
    const candidate = terms.filter((other) => kept.has(other) || other === term)
    if (promptWithTerms(candidate).length <= MAX_PROMPT_CHARACTERS) {
      kept.add(term)
    }
  }
  return terms.filter((term) => kept.has(term))
}
