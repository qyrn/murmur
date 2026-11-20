import { getLanguage, type Language } from './language'

const RUNTIME_TEXT = {
  'demo.idle': {
    fr: "Ici la démo colle des phrases d'exemple en français, la vraie transcription se fait dans l'app.",
    en: 'The demo pastes sample French sentences, the real transcription happens in the app.'
  },
  'demo.listening': {
    fr: "murmur t'écoute… Réappuie pour coller le texte.",
    en: 'murmur is listening… Press again to paste the text.'
  },
  'demo.pasted': {
    fr: "C'est collé dans {app} ! Tu peux recommencer, ou cliquer dans une autre fenêtre.",
    en: 'Pasted into {app}! You can go again, or click into another window.'
  },
  'demo.micOn': {
    fr: 'Ton navigateur lit juste le volume pour faire bouger la pastille, rien est enregistré ni envoyé.',
    en: 'Your browser only reads the volume to move the pill, nothing is recorded or sent.'
  },
  'demo.micBlocked': {
    fr: "Ton navigateur a pas donné accès au micro, du coup la pastille fait semblant.",
    en: "Your browser didn't allow the mic, so the pill is pretending."
  },
  'demo.micStart': { fr: 'Faire bouger la pastille avec ma voix', en: 'Make the pill move with my voice' },
  'demo.micStop': { fr: 'Couper mon micro', en: 'Turn my mic off' },
  'app.chat': { fr: 'Discord', en: 'Discord' },
  'app.terminal': { fr: 'le terminal', en: 'the terminal' },
  'app.mail': { fr: 'le mail', en: 'the email' },
  'copy.done': { fr: 'Copié !', en: 'Copied!' },
  'copy.blocked': { fr: 'Copie bloquée', en: 'Copy blocked' },
  'playground.removeShortcut': { fr: 'Retirer le raccourci {name}', en: 'Remove the {name} shortcut' },
  'playground.removeTerm': { fr: 'Retirer {name} du dictionnaire', en: 'Remove {name} from the dictionary' },
  'language.switchTo': { fr: 'English', en: 'Français' }
} satisfies Record<string, Record<Language, string>>

export type RuntimeTextKey = keyof typeof RUNTIME_TEXT

export function runtimeText(key: RuntimeTextKey, values: Record<string, string> = {}): string {
  return RUNTIME_TEXT[key][getLanguage()].replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder)
}
