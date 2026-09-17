param(
    [ValidateSet("large-v3-turbo", "large-v3")]
    [string]$Model = "large-v3-turbo"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$modelsDir = Join-Path $root "whisper-engine\models"
New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null

$fileName = "ggml-$Model.bin"
$destination = Join-Path $modelsDir $fileName
$url = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/$fileName"

if (Test-Path $destination) {
    Write-Host "$fileName existe deja."
    return
}

Write-Host "Telechargement de $fileName..."
Invoke-WebRequest -Uri $url -OutFile $destination
Write-Host "Modele enregistre : $destination"
