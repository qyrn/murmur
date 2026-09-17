<div align="center">

<img src="resources/icon.png" width="96" height="96" alt="Logo murmur" />

# murmur

**Dictée vocale privée, 100% locale, pensée pour le français mêlé d'anglais.**

[![License: MIT](https://img.shields.io/badge/licence-MIT-e0a248.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/plateforme-Windows-e0a248.svg)](#installer-lapplication-windows)
[![Powered by whisper.cpp](https://img.shields.io/badge/moteur-whisper.cpp%20%2B%20CUDA-e0a248.svg)](https://github.com/ggml-org/whisper.cpp)

</div>

Aucun audio ne quitte la machine : la transcription tourne entièrement sur le GPU local via [whisper.cpp](https://github.com/ggml-org/whisper.cpp) compilé avec CUDA. Un raccourci clavier, tu parles, le texte se colle tout seul là où tu travailles — y compris quand tu glisses un mot anglais au milieu d'une phrase en français.

## Fonctionnalités

- **100% local** : rien n'est envoyé sur internet, la transcription tourne sur ton GPU
- **Français + anglais** : reconnaît les mots et expressions anglais insérés naturellement, sans les traduire
- **Dictionnaire personnel** : ajoute tes termes techniques, noms propres, jargon — corrigés automatiquement
- **Collage automatique** : le texte transcrit atterrit directement dans l'application active
- **Pastille flottante** : retour visuel en temps réel (écoute, transcription), position et couleur personnalisables
- **Réglages complets** : raccourci, modèle, micro, apparence, démarrage automatique avec Windows

## Installer l'application (Windows)

Télécharger le dernier installeur depuis les [Releases](../../releases/latest) et lancer `murmur Setup x.x.x.exe`. L'installeur crée un raccourci sur le Bureau et dans le menu Démarrer. Le modèle `large-v3-turbo` est fourni directement ; le modèle `large-v3` (plus précis, plus lourd) se télécharge en option depuis les Réglages ou via `scripts/download-model.ps1`.

> Nécessite un GPU NVIDIA (CUDA) — testé sur RTX 5070 Laptop, architecture Blackwell.

Une fois installée, l'app tourne dans la barre système. `Ctrl+Espace` démarre puis arrête l'enregistrement ; le texte transcrit est collé automatiquement dans l'application active. Une pastille flottante apparaît en bas de l'écran pendant l'enregistrement et la transcription.

## Réglages

Clic droit sur l'icône de la barre système → "Réglages" ouvre une fenêtre à sections (Général, Microphone, Modèle, Dictionnaire, Apparence, À propos) :

- raccourci clavier, collage automatique, lancement au démarrage de Windows
- choix du micro (utile pour éviter un casque Bluetooth qui bascule en profil mains-libres dès qu'une app demande le micro)
- choix du modèle (`large-v3-turbo` rapide ou `large-v3` précis)
- dictionnaire personnel (termes techniques, noms propres, mots anglais à reconnaître tels quels)
- position de la pastille flottante, couleur d'accent, affichage ou non de la forme d'onde

Le dictionnaire influence à la fois la reconnaissance (il est injecté dans le prompt donné à Whisper) et la correction post-transcription (casse, orthographe).

## Développement

### Prérequis

- Windows avec un GPU NVIDIA (testé sur RTX 5070 Laptop / architecture Blackwell)
- Node 24+, pnpm 10+, git, ffmpeg (accessibles dans le PATH)
- CUDA Toolkit 12.8+
- CMake et Visual Studio 2022 Build Tools (workload "Desktop development with C++")

### Installation

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

### Lancer en mode développement

```bash
pnpm dev
```

### Compiler l'installeur

```bash
pnpm build:win
```

Produit `dist/murmur Setup <version>.exe`. Seul `large-v3-turbo` est embarqué dans l'installeur (limite pratique de taille de NSIS) ; `large-v3` reste un téléchargement optionnel.

## Dépannage

- **Le micro ne fonctionne pas** : vérifier dans Windows, Paramètres → Confidentialité et sécurité → Microphone, que l'accès micro est autorisé pour les applications de bureau.
- **Le casque Bluetooth se déconnecte pendant la dictée** : c'est Windows qui bascule le casque du profil audio (A2DP) vers le profil mains-libres (HFP) dès qu'une app demande le micro ; certains casques gèrent mal cette bascule. Choisir un autre micro dans Réglages → Microphone si besoin.
- **`whisper-server introuvable`** : relancer `./scripts/setup-whisper.ps1`.
- **`Modèle introuvable`** : relancer `./scripts/download-model.ps1`.
- **Rien ne se colle dans l'app active** : certaines applications élevées (lancées en administrateur) refusent les entrées clavier simulées par un process non élevé ; éviter de dicter dans ce cas, ou lancer l'app en administrateur.

## Licence

[MIT](LICENSE)
