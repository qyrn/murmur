param(
    [string]$CudaArchitectures = "120",
    [switch]$BundleCudaRuntime
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$engineDir = Join-Path $root "whisper-engine"
$repoDir = Join-Path $engineDir "whisper.cpp"
$binDir = Join-Path $repoDir "build\bin"

if (-not (Test-Path $repoDir)) {
    New-Item -ItemType Directory -Force -Path $engineDir | Out-Null
    git clone --depth 1 https://github.com/ggml-org/whisper.cpp.git $repoDir
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path $vswhere)) {
    throw "Visual Studio 2022 introuvable (workload 'Desktop development with C++' requis)."
}
$visualStudio = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $visualStudio) {
    throw "Visual Studio 2022 trouvé sans les outils C++ (workload 'Desktop development with C++' requis)."
}
$vcvarsall = Join-Path $visualStudio "VC\Auxiliary\Build\vcvarsall.bat"
$ninjaDir = Join-Path $visualStudio "Common7\IDE\CommonExtensions\Microsoft\CMake\Ninja"

$cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
$cmake = if ($cmakeCommand) { $cmakeCommand.Source } else { "C:\Program Files\CMake\bin\cmake.exe" }
if (-not (Test-Path $cmake)) {
    throw "CMake introuvable. Installe-le avec: winget install Kitware.CMake"
}

$batch = Join-Path $repoDir "build_whisper.bat"
@"
@echo off
cd /d "%~dp0"
call "$vcvarsall" x64
if errorlevel 1 exit /b 1
set "PATH=$ninjaDir;%PATH%"
"$cmake" -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DGGML_CUDA=ON "-DCMAKE_CUDA_ARCHITECTURES=$CudaArchitectures" -DWHISPER_BUILD_SERVER=ON
if errorlevel 1 exit /b 1
"$cmake" --build build --config Release -j
"@ | Set-Content -Path $batch -Encoding ascii

& cmd.exe /c "$batch"
if ($LASTEXITCODE -ne 0) {
    throw "La compilation de whisper.cpp a echoue (code $LASTEXITCODE)."
}

if ($BundleCudaRuntime) {
    if (-not $env:CUDA_PATH) {
        throw "CUDA_PATH n'est pas defini, impossible de copier les DLL de CUDA."
    }
    $runtimeDlls = Get-ChildItem (Join-Path $env:CUDA_PATH "bin") -Include "cudart64_*.dll", "cublas64_*.dll", "cublasLt64_*.dll" -Recurse
    if ($runtimeDlls.Count -lt 3) {
        throw "DLL de CUDA manquantes dans $env:CUDA_PATH\bin."
    }
    $runtimeDlls | Copy-Item -Destination $binDir
    Write-Host "DLL de CUDA copiees : $($runtimeDlls.Name -join ', ')"
}

Write-Host "whisper-server compile : $binDir\whisper-server.exe"
