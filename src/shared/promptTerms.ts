const BASE_PROMPT = 'Dictée en français, avec parfois des mots ou expressions en anglais conservés tels quels'
const MAX_PROMPT_CHARACTERS = 600

export function promptWithTerms(terms: string[]): string {
  return terms.length === 0 ? `${BASE_PROMPT}.` : `${BASE_PROMPT}, notamment : ${terms.join(', ')}.`
}

export function termsThatFitInPrompt(rawTerms: string[]): string[] {
  let terms = [...new Set(rawTerms.map((term) => term.trim()).filter(Boolean))]
  while (terms.length > 0 && promptWithTerms(terms).length > MAX_PROMPT_CHARACTERS) {
    terms = terms.slice(1)
  }
  return terms
}
