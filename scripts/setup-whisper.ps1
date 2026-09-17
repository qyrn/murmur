$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$engineDir = Join-Path $root "whisper-engine"
$repoDir = Join-Path $engineDir "whisper.cpp"

if (-not (Test-Path $repoDir)) {
    New-Item -ItemType Directory -Force -Path $engineDir | Out-Null
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git $repoDir
}

Push-Location $repoDir
try {
    cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=120 -DWHISPER_BUILD_SERVER=ON -DCMAKE_BUILD_TYPE=Release
    cmake --build build --config Release -j
}
finally {
    Pop-Location
}

Write-Host "whisper-server compile : $repoDir\build\bin\Release\whisper-server.exe"
