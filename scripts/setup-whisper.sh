#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repo_dir="$root/whisper-engine/whisper.cpp"
cuda_dir="${CUDA_PATH:-/opt/cuda}"

if [ ! -d "$repo_dir" ]; then
  mkdir -p "$root/whisper-engine"
  git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git "$repo_dir"
fi

for tool in cmake ninja "$cuda_dir/bin/nvcc"; do
  command -v "$tool" >/dev/null || { echo "Outil manquant : $tool" >&2; exit 1; }
done

export PATH="$cuda_dir/bin:$PATH"
cmake -S "$repo_dir" -B "$repo_dir/build" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=120 \
  -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/g++ \
  -DWHISPER_BUILD_SERVER=ON
cmake --build "$repo_dir/build" -j"$(nproc)"

echo "whisper-server compilé : $repo_dir/build/bin/whisper-server"
