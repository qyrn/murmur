# Dictée

Dictée vocale privée, entièrement locale, optimisée pour le français avec des mots anglais insérés naturellement. Aucun audio ne quitte la machine : la transcription tourne sur le GPU local via [whisper.cpp](https://github.com/ggml-org/whisper.cpp) compilé avec CUDA.

## Prérequis

- Windows avec un GPU NVIDIA (testé sur RTX 5070 Laptop / architecture Blackwell)
- Node 24+, pnpm 10+, git, ffmpeg (accessibles dans le PATH)
- CUDA Toolkit 12.8+
- CMake et Visual Studio 2022 Build Tools (workload "Desktop development with C++")

## Installation

```bash
pnpm install
```

### Compiler le moteur de transcription

```powershell
./scripts/setup-whisper.ps1
```

Ce script clone whisper.cpp dans `whisper-engine/whisper.cpp` et le compile avec l'accélération CUDA (`whisper-server.exe`).

### Télécharger les modèles

```powershell
./scripts/download-model.ps1 -Model large-v3-turbo
./scripts/download-model.ps1 -Model large-v3
```

## Lancer l'app

```bash
pnpm dev
```

L'application tourne dans la barre système. Le raccourci par défaut (`Ctrl+Espace`) démarre puis arrête l'enregistrement ; le texte transcrit est collé automatiquement dans l'application active. Une pastille flottante façon Superwhisper apparaît en bas de l'écran pendant l'enregistrement et la transcription.

## Réglages

Clic droit sur l'icône de la barre système → "Réglages" pour :

- changer le raccourci clavier
- choisir le modèle (`large-v3-turbo` rapide ou `large-v3` précis)
- activer/désactiver le collage automatique
- gérer le dictionnaire personnel (termes techniques, noms propres, mots anglais à reconnaître tels quels)

Le dictionnaire influence à la fois la reconnaissance (il est injecté dans le prompt donné à Whisper) et la correction post-transcription (casse, orthographe).

## Dépannage

- **Le micro ne fonctionne pas** : vérifier dans Windows, Paramètres → Confidentialité et sécurité → Microphone, que l'accès micro est autorisé pour les applications de bureau.
- **`whisper-server introuvable`** : relancer `./scripts/setup-whisper.ps1`.
- **`Modèle introuvable`** : relancer `./scripts/download-model.ps1`.
- **Rien ne se colle dans l'app active** : certaines applications élevées (lancées en administrateur) refusent les entrées clavier simulées par un process non élevé ; éviter de dicter dans ce cas, ou lancer l'app en administrateur.
