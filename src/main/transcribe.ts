import { serverBaseUrl } from './whisperServer'
import { applyDictionaryCorrections, applyVoiceShortcuts, buildInitialPrompt } from './dictionary'
import { removeFillerWords } from './fillerWords'
import { removeHallucinations, removeTrailingThanks } from './hallucinationFilter'
import { extractDictation } from './voiceCommands'
import type { DictionaryEntry, VoiceShortcut } from '../shared/types'

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

async function requestTranscription(wavBuffer: ArrayBuffer, prompt: string | null): Promise<string> {
  const form = new FormData()
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'dictation.wav')
  form.append('temperature', '0.0')
  form.append('temperature_inc', '0.2')
  if (prompt) {
    form.append('prompt', prompt)
    form.append('carry_initial_prompt', 'true')
  }
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

export interface DictationVocabulary {
  dictionary: DictionaryEntry[]
  shortcuts: VoiceShortcut[]
  recentDictations: string[]
}

function polishDictation(spokenText: string, vocabulary: DictationVocabulary): string {
  const spokenWords = removeFillerWords(removeTrailingThanks(removeHallucinations(spokenText)))
  const withCorrections = applyDictionaryCorrections(spokenWords, vocabulary.dictionary)
  const withShortcuts = applyVoiceShortcuts(withCorrections, vocabulary.shortcuts)
  return normalizeFrenchTypography(withShortcuts)
}

function promptFor(vocabulary: DictationVocabulary): string {
  return buildInitialPrompt(vocabulary.dictionary, vocabulary.recentDictations)
}

export async function transcribeAudio(wavBuffer: ArrayBuffer, vocabulary: DictationVocabulary): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, promptFor(vocabulary))
  return polishDictation(spokenText, vocabulary)
}

export async function transcribeHandsFreeAudio(wavBuffer: ArrayBuffer, vocabulary: DictationVocabulary): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, promptFor(vocabulary))
  return polishDictation(extractDictation(spokenText), vocabulary)
}

export function transcribeVoiceCommand(wavBuffer: ArrayBuffer): Promise<string> {
  return requestTranscription(wavBuffer, null)
}
