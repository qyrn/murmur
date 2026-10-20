#!/usr/bin/env bash
set -euo pipefail

model="${1:-large-v3-turbo}"
case "$model" in
  large-v3-turbo|large-v3) ;;
  *) echo "Modèle inconnu : $model (large-v3-turbo ou large-v3)" >&2; exit 1 ;;
esac

root="$(cd "$(dirname "$0")/.." && pwd)"
models_dir="$root/whisper-engine/models"
destination="$models_dir/ggml-$model.bin"
mkdir -p "$models_dir"

if [ -f "$destination" ]; then
  echo "ggml-$model.bin existe déjà."
  exit 0
fi

echo "Téléchargement de ggml-$model.bin..."
curl -fL --progress-bar -o "$destination.part" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$model.bin"
mv "$destination.part" "$destination"
echo "Modèle enregistré : $destination"
