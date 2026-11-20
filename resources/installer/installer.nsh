LangString murmurWelcomeTitle 1036 "Installer murmur"
LangString murmurWelcomeTitle 1033 "Install murmur"
LangString murmurWelcomeText 1036 "murmur, c'est la dictée vocale en local : ta voix est transcrite par ta carte graphique et quitte jamais ton PC.$\r$\n$\r$\nAu premier lancement, l'appli télécharge le modèle Whisper (1,6 Go), du coup garde ta connexion le temps que la petite pilule arrive à 100 %."
LangString murmurWelcomeText 1033 "murmur is local voice dictation: your graphics card transcribes your voice and nothing leaves your PC.$\r$\n$\r$\nOn first launch the app downloads the Whisper model (1.6 GB), so stay online until the little pill reaches 100%."
LangString murmurFinishTitle 1036 "murmur est installé"
LangString murmurFinishTitle 1033 "murmur is installed"
LangString murmurFinishText 1036 "Appuie sur Ctrl+Espace pour dicter, et encore une fois pour arrêter : le texte se colle là où t'écris."
LangString murmurFinishText 1033 "Press Ctrl+Space to dictate and again to stop: the text is pasted wherever you're typing."

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "$(murmurWelcomeTitle)"
  !define MUI_WELCOMEPAGE_TEXT "$(murmurWelcomeText)"
  !insertmacro skipPageIfUpdated
  !insertmacro MUI_PAGE_WELCOME
  !define MUI_FINISHPAGE_TITLE "$(murmurFinishTitle)"
  !define MUI_FINISHPAGE_TEXT "$(murmurFinishText)"
!macroend

!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customUnInstall
  ${ifNot} ${isUpdated}
    RMDir /r "$LOCALAPPDATA\murmur\models"
    RMDir "$LOCALAPPDATA\murmur"
  ${endIf}
!macroend
