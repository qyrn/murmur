import { serverBaseUrl } from './whisperServer'
import { applyDictionaryCorrections, applyVoiceShortcuts, buildInitialPrompt } from './dictionary'
import { removeHallucinations } from './hallucinationFilter'
import { extractDictation } from './voiceCommands'
import type { DictionaryEntry, VoiceShortcut } from '../shared/types'

interface InferenceResponse {
  text: string
}

const COMMAND_PROMPT = 'Murmur start. Murmur stop.'

function normalizeFrenchTypography(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+([?!;:])/g, ' $1')
    .replace(/«\s*/g, '« ')
    .replace(/\s*»/g, ' »')
}

async function requestTranscription(wavBuffer: ArrayBuffer, prompt: string): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'dictation.wav')
  form.append('temperature', '0.0')
  form.append('temperature_inc', '0.2')
  form.append('prompt', prompt)
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
  return result.text
}

function polishDictation(spokenText: string, dictionary: DictionaryEntry[], shortcuts: VoiceShortcut[]): string {
  const withShortcuts = applyVoiceShortcuts(removeHallucinations(spokenText), shortcuts)
  const withCorrections = applyDictionaryCorrections(withShortcuts, dictionary)
  return normalizeFrenchTypography(withCorrections)
}

export async function transcribeAudio(
  wavBuffer: ArrayBuffer,
  dictionary: DictionaryEntry[],
  shortcuts: VoiceShortcut[]
): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, buildInitialPrompt(dictionary, shortcuts))
  return polishDictation(spokenText, dictionary, shortcuts)
}

export async function transcribeHandsFreeAudio(
  wavBuffer: ArrayBuffer,
  dictionary: DictionaryEntry[],
  shortcuts: VoiceShortcut[]
): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, buildInitialPrompt(dictionary, shortcuts))
  return polishDictation(extractDictation(spokenText), dictionary, shortcuts)
}

export function transcribeVoiceCommand(wavBuffer: ArrayBuffer): Promise<string> {
  return requestTranscription(wavBuffer, COMMAND_PROMPT)
}
