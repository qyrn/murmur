$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$engineDir = Join-Path $root "whisper-engine"
$repoDir = Join-Path $engineDir "whisper.cpp"

if (-not (Test-Path $repoDir)) {
    New-Item -ItemType Directory -Force -Path $engineDir | Out-Null
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git $repoDir
}

$vcvarsall = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat"
$ninjaDir = "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja"
$cmake = "C:\Program Files\CMake\bin\cmake.exe"

if (-not (Test-Path $vcvarsall)) {
    throw "Visual Studio 2022 Build Tools introuvable (workload 'Desktop development with C++' requis)."
}
if (-not (Test-Path $cmake)) {
    throw "CMake introuvable. Installe-le avec: winget install Kitware.CMake"
}

# CUDA 12.8 exige VS2022 comme compilateur hote. L'integration MSBuild de CUDA
# n'est copiee automatiquement dans VS2022 que si CUDA a ete installe apres VS2022 ;
# on utilise donc le generateur Ninja (pas le generateur Visual Studio), qui invoque
# nvcc/cl.exe directement et n'a pas besoin de cette integration.
$batch = Join-Path $repoDir "build_whisper.bat"
@"
@echo off
cd /d "%~dp0"
call "$vcvarsall" x64
if errorlevel 1 exit /b 1
set "PATH=$ninjaDir;%PATH%"
"$cmake" -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=120 -DWHISPER_BUILD_SERVER=ON
if errorlevel 1 exit /b 1
"$cmake" --build build --config Release -j
"@ | Set-Content -Path $batch -Encoding ascii

& cmd.exe /c "$batch"
if ($LASTEXITCODE -ne 0) {
    throw "La compilation de whisper.cpp a echoue (code $LASTEXITCODE)."
}

Write-Host "whisper-server compile : $repoDir\build\bin\whisper-server.exe"
