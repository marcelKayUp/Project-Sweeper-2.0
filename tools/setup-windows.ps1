# Richtet Node, Corepack, pnpm und die Projektabhängigkeiten für NEON CONTRACT ein.
# Kein winget und keine stillen Installer. Node.js muss schon vorhanden sein.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

function Stop-Setup([string]$Message) {
  Write-Host $Message
  exit 1
}

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
  Stop-Setup "Node.js fehlt. Bitte Node.js 24.14.0 von https://nodejs.org/ installieren und dieses Skript danach erneut starten."
}

$nodeVersion = ""
try {
  $nodeVersion = (& node -v 2>&1 | Out-String).Trim()
} catch {
  $nodeVersion = ""
}
if (-not $nodeVersion -or $nodeVersion -notmatch "^v\d+") {
  Stop-Setup "Node.js fehlt oder startet nicht. Bitte Node.js 24.14.0 von https://nodejs.org/ installieren und dieses Skript danach erneut starten."
}

Write-Host "Node.js $nodeVersion ist vorhanden."
if ($nodeVersion -ne "v24.14.0") {
  Write-Host "Hinweis: dieses Projekt ist mit Node.js 24.14.0 beschrieben. Gefunden wurde $nodeVersion. Die Einrichtung läuft weiter."
}

$corepackCommand = Get-Command corepack -ErrorAction SilentlyContinue
if (-not $corepackCommand) {
  Stop-Setup "Corepack fehlt in dieser Node.js-Installation. Bitte Node.js 24.14.0 von https://nodejs.org/ installieren."
}

Write-Host "Aktiviere Corepack und pnpm."
& corepack enable
if ($LASTEXITCODE -ne 0) {
  Write-Host "Corepack konnte nicht global aktiviert werden. Die Installation verwendet trotzdem den Aufruf corepack pnpm."
}

Write-Host "Installiere die Projektabhängigkeiten."
& corepack pnpm install
if ($LASTEXITCODE -ne 0) {
  Stop-Setup "pnpm install ist fehlgeschlagen. Server, Client und Generatoren sind nicht vollständig eingerichtet."
}

$python = $null
foreach ($candidate in @("python", "py")) {
  $command = Get-Command $candidate -ErrorAction SilentlyContinue
  if (-not $command) { continue }
  & $candidate -c "import sys; raise SystemExit(0 if sys.version_info[0] >= 3 else 1)"
  if ($LASTEXITCODE -eq 0) {
    $python = $candidate
    break
  }
}

$requirementFiles = @()
$generatorDir = Join-Path $root "packages\generator"
if (Test-Path $generatorDir) {
  $requirementFiles = @(Get-ChildItem -Path $generatorDir -Filter "requirements*.txt" -Recurse -File -ErrorAction SilentlyContinue)
}

if (-not $python) {
  Write-Host "Python wurde nicht gefunden. Server, Client und die TypeScript-Generatoren werden trotzdem eingerichtet."
} elseif ($requirementFiles.Count -eq 0) {
  Write-Host "Python ist vorhanden. Gebäude- und Missionsgenerator haben keine Requirements-Datei, deshalb wird nichts per pip installiert."
} else {
  foreach ($file in $requirementFiles) {
    Write-Host "Installiere Python-Abhängigkeiten aus $($file.FullName)"
    & $python -m pip install -r $file.FullName
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Die Python-Abhängigkeiten aus $($file.Name) konnten nicht installiert werden. Server und Client bleiben eingerichtet."
    }
  }
}

Write-Host ""
Write-Host "Fertig."
Write-Host "Spielserver:"
Write-Host "  corepack pnpm --filter @neon/server start"
Write-Host "Client:"
Write-Host "  corepack pnpm --filter @neon/client dev"
Write-Host "Einstiegsseite: http://127.0.0.1:5173/"
