import { serverBaseUrl } from './whisperServer'
import { applyDictionaryCorrections, applyVoiceShortcuts, buildInitialPrompt } from './dictionary'
import { removeHallucinations, removeShortClipHallucination } from './hallucinationFilter'
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

const WAV_HEADER_BYTES = 44
const WAV_BYTE_RATE_OFFSET = 28

function wavDurationSeconds(wavBuffer: ArrayBuffer): number {
  const byteRate = new DataView(wavBuffer).getUint32(WAV_BYTE_RATE_OFFSET, true)
  return byteRate > 0 ? Math.max(0, wavBuffer.byteLength - WAV_HEADER_BYTES) / byteRate : 0
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

function polishDictation(
  spokenText: string,
  audioSeconds: number,
  dictionary: DictionaryEntry[],
  shortcuts: VoiceShortcut[]
): string {
  const spokenWords = removeShortClipHallucination(removeHallucinations(spokenText), audioSeconds)
  const withCorrections = applyDictionaryCorrections(spokenWords, dictionary)
  const withShortcuts = applyVoiceShortcuts(withCorrections, shortcuts)
  return normalizeFrenchTypography(withShortcuts)
}

export async function transcribeAudio(
  wavBuffer: ArrayBuffer,
  dictionary: DictionaryEntry[],
  shortcuts: VoiceShortcut[]
): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, buildInitialPrompt(dictionary))
  return polishDictation(spokenText, wavDurationSeconds(wavBuffer), dictionary, shortcuts)
}

export async function transcribeHandsFreeAudio(
  wavBuffer: ArrayBuffer,
  dictionary: DictionaryEntry[],
  shortcuts: VoiceShortcut[]
): Promise<string> {
  const spokenText = await requestTranscription(wavBuffer, buildInitialPrompt(dictionary))
  return polishDictation(extractDictation(spokenText), wavDurationSeconds(wavBuffer), dictionary, shortcuts)
}

export function transcribeVoiceCommand(wavBuffer: ArrayBuffer): Promise<string> {
  return requestTranscription(wavBuffer, null)
}
