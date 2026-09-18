import { serverBaseUrl } from './whisperServer'
import { applyDictionaryCorrections, buildInitialPrompt } from './dictionary'
import type { DictionaryEntry } from '../shared/types'

interface InferenceResponse {
  text: string
}

function normalizeFrenchTypography(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+([?!;:])/g, ' $1')
    .replace(/«\s*/g, '« ')
    .replace(/\s*»/g, ' »')
}

export async function transcribeAudio(wavBuffer: ArrayBuffer, dictionary: DictionaryEntry[]): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'dictation.wav')
  form.append('temperature', '0.0')
  form.append('temperature_inc', '0.2')
  form.append('prompt', buildInitialPrompt(dictionary))
  form.append('carry_initial_prompt', 'true')
  form.append('response_format', 'json')

  const response = await fetch(`${serverBaseUrl()}/inference`, {
    method: 'POST',
    body: form
  })

  if (!response.ok) {
    throw new Error(`Échec de la transcription : ${response.status} ${response.statusText}`)
  }

  const result = (await response.json()) as InferenceResponse
  const withCorrections = applyDictionaryCorrections(result.text, dictionary)
  return normalizeFrenchTypography(withCorrections)
}
