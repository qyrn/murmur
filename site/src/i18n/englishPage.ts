const VERSION = __MURMUR_VERSION__
const INSTALLER = `murmur-Setup-${VERSION}.exe`
const INSTALLER_URL = `https://github.com/qyrn/murmur/releases/download/v${VERSION}/${INSTALLER}`

export const ENGLISH_PAGE: Record<string, string> = {
  'meta.title': 'murmur, voice dictation that runs on your PC',
  'meta.description':
    'Voice dictation for French that keeps your English words. Everything runs on your graphics card, your voice never leaves your PC. Open source, Windows and Linux.',
  skip: 'Skip to the demo',
  'nav.label': 'Main navigation',
  'nav.try': 'Try it',
  'nav.handsfree': 'Hands-free',
  'nav.install': 'Install',
  'hero.title': 'You talk, and it types itself where you are.',
  'hero.line1': 'You talk, and',
  'hero.line2': 'it types itself',
  'hero.line3': 'where you are.',
  'hero.lead':
    "murmur is voice dictation for your PC: press [[kbd:Ctrl]] [[kbd:Space]], talk, and the text lands right where your cursor is. It's made for people who dictate in French, and it keeps your English words exactly as you say them. Everything runs on your own PC, so your voice never leaves it.",
  'hero.download': 'Download murmur for Windows',
  'hero.meta': `Version ${VERSION}, free and open source. You can also [[a:#essai|try it right below]]!`,
  'pill.recording': 'Listening…',
  'pill.transcribing': 'Transcribing…',
  'demo.title': 'Try it, right here',
  'demo.intro':
    'Click into one of the windows, press [[kbd:Ctrl]] [[kbd:Space]] and talk, then press it again to paste. The pill works just like on your PC, except here it pastes sample sentences.',
  'demo.chatLabel': 'Discord window, general channel',
  'demo.chatChannel': '#general',
  'demo.chatFirst': '[[b:Inès]] anyone tried the new build?',
  'demo.chatSecond': "[[b:Tom]] not yet, I'll check tonight",
  'demo.terminalLabel': 'Terminal window',
  'demo.mailLabel': 'Mail window, new message',
  'demo.mailTitle': 'New message',
  'demo.mailTo': 'To',
  'demo.mailSubject': 'Subject',
  'demo.mailSubjectValue': 'The quote',
  'demo.dictate': 'Dictate',
  'key.space': 'Space',
  'playground.title': 'Your franglais, written the way you say it',
  'playground.intro':
    'murmur keeps English words in English: “faut push le commit avant la release” stays exactly as you said it. You can also teach it your own words and set up voice shortcuts: you say one thing, murmur writes another.',
  'playground.spoken': 'What you say',
  'playground.written': 'What murmur writes',
  'playground.note': "Type a sentence to try it, this is murmur's real code running in your browser.",
  'playground.shortcutsTitle': 'Voice shortcuts',
  'playground.shortcutsHelp': 'Handy for a command, or for a word Whisper always gets wrong.',
  'playground.youSay': 'You say',
  'playground.itWrites': 'It writes',
  'playground.remove': 'Remove',
  'playground.add': 'Add',
  'playground.dictionaryTitle': 'Dictionary',
  'playground.dictionaryHelp': 'Names murmur should write with the right capitals.',
  'playground.newTerm': 'New dictionary word',
  'handsfree.title': 'Hands in your pockets',
  'handsfree.intro':
    "With hands-free mode, you don't need the keyboard at all: start dictating with your voice, and murmur pastes the text as soon as you stop talking.",
  'handsfree.wake': 'You say “murmur start”',
  'handsfree.chime': 'A little beep answers',
  'handsfree.speech': 'You talk, as long as you want',
  'handsfree.silence': 'You go quiet for a few seconds, or say “murmur stop”',
  'handsfree.paste': 'The text pastes itself',
  'handsfree.noteChain':
    'You can also say it all in one go: “murmur start, je voulais te dire…”. The mic stays open, but a small voice detector listens locally, and voices from across the room are ignored.',
  'handsfree.noteGames':
    "When you play a game in fullscreen, everything pauses, so a friend talking on Discord won't start a dictation by accident.",
  'privacy.title': 'Your voice stays on your PC',
  'privacy.intro':
    "Transcription runs with Whisper right on your graphics card, and your dictation history stays in a file on your disk. There's no account to create, and the code is open if you want to check.",
  'privacy.diagram': 'The sound goes from the mic to the graphics card and then to text, without ever going online',
  'privacy.pc': 'Your PC',
  'privacy.mic': 'Your mic',
  'privacy.micSub': 'the sound',
  'privacy.gpuSub': 'on your graphics card',
  'privacy.text': 'The text',
  'privacy.textSub': 'pasted where you are',
  'privacy.never': 'never',
  'extras.title': 'The little extras',
  'extras.firstWordTitle': 'Your first word comes through whole',
  'extras.firstWord':
    'The “Garder le micro ouvert” setting (keep the mic open) holds the last split second in memory, without recording anything, for when you start talking right as you press.',
  'extras.spaceTitle': 'A space after every dictation',
  'extras.space': 'You can chain several in the same message without the sentences sticking together.',
  'extras.modelsTitle': 'Two Whisper models',
  'extras.models': 'large-v3-turbo by default to go fast, large-v3 if you want maximum accuracy.',
  'extras.statsTitle': 'A home screen that keeps count',
  'extras.stats': 'Your average speed, your words this week, the apps you dictate in and the time saved over typing.',
  'extras.pillTitle': 'The pill, your way',
  'extras.pill': 'Bottom center, in a corner or at the top, in your color, with the waveform if you want to see it.',
  'extras.updatesTitle': 'Updates on their own',
  'extras.updates': 'On Windows, murmur downloads the new version in the background and offers to restart to install it.',
  'extras.shotAlt': "murmur's home screen, with words per minute, words this week, apps used and time saved",
  'install.title': 'Install murmur',
  'install.lead': "You just need an NVIDIA graphics card, it's what runs the transcription.",
  'install.tabsLabel': 'System',
  'install.windowsTab': 'Windows 10 and 11',
  'install.step1': `Download [[a:${INSTALLER_URL}|${INSTALLER}]].`,
  'install.step2':
    "Run it. Windows will probably show “Windows protected your PC”, it does that with every small app it doesn't know yet: click “More info”, then “Run anyway”.",
  'install.step3': 'The icon shows up in the system tray, press [[kbd:Ctrl]] [[kbd:Space]] and talk!',
  'install.linuxIntro':
    "There's no Linux installer yet, murmur is built from source. First install [[code:wl-clipboard]], [[code:ydotool]], [[code:kdotool]], [[code:ffmpeg]] and the CUDA Toolkit, then:",
  'install.copy': 'Copy',
  'install.linuxAfter':
    'The app ends up in [[code:dist/linux-unpacked]]. Also run [[code:systemctl --user enable --now ydotool]] so murmur can paste text.',
  'faq.title': 'Questions people ask',
  'faq.gpuQuestion': 'Do I really need an NVIDIA graphics card?',
  'faq.gpuAnswer':
    "Yes, Whisper runs on it with CUDA, that's what makes transcription fast without sending anything online. Without an NVIDIA card, transcription unfortunately can't run.",
  'faq.macQuestion': 'Does it work on Mac?',
  'faq.macAnswer': 'Not for now, murmur runs on Windows and on Linux with KDE Plasma 6.',
  'faq.languageQuestion': 'Can I dictate in a language other than French?',
  'faq.languageAnswer':
    'murmur is set up for French. English words in the middle of your sentences come through fine, but a whole sentence in another language will be transcribed badly.',
  'faq.priceQuestion': 'Do I have to pay?',
  'faq.priceAnswer':
    "No, there's nothing to pay. murmur is open source under the MIT license, so you can read the code, change it and build it yourself.",
  'faq.pasteQuestion': 'Does it paste into any app?',
  'faq.pasteAnswer':
    'Almost all of them. On Windows, apps running as administrator refuse pastes from a normal program, in that case run murmur as administrator too.',
  'footer.note':
    'murmur is open source, under the MIT license. Got an idea or found a bug? Open an [[a:https://github.com/qyrn/murmur/issues|issue on GitHub]], it really helps!'
}
