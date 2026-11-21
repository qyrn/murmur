#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repo_dir="$root/whisper-engine/whisper.cpp"
bin_dir="$repo_dir/build/bin"
cuda_dir="${CUDA_PATH:-/opt/cuda}"
cuda_architectures="${CUDA_ARCHITECTURES:-120}"
bundle_cuda_runtime=false

for argument in "$@"; do
  case "$argument" in
    --bundle-cuda-runtime) bundle_cuda_runtime=true ;;
    *) echo "Option inconnue : $argument" >&2; exit 1 ;;
  esac
done

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
  "-DCMAKE_CUDA_ARCHITECTURES=$cuda_architectures" \
  -DCMAKE_CUDA_HOST_COMPILER=/usr/bin/g++ \
  -DWHISPER_BUILD_SERVER=ON
cmake --build "$repo_dir/build" -j"$(nproc)"

if [ "$bundle_cuda_runtime" = true ]; then
  for library in libcudart libcublas libcublasLt; do
    soname="$(ldd "$bin_dir/libggml-cuda.so" | awk -v lib="$library.so." 'index($1, lib) == 1 { print $1 }')"
    [ -n "$soname" ] || { echo "Bibliothèque CUDA introuvable : $library" >&2; exit 1; }
    cp -L "$cuda_dir/lib64/$soname" "$bin_dir/$soname"
    echo "Copiée : $soname"
  done
fi

echo "whisper-server compilé : $bin_dir/whisper-server"
