$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root ".venv"

if (-not (Test-Path $venv)) {
    python -m venv $venv
}

& "$venv\Scripts\python.exe" -m pip install --upgrade pip
& "$venv\Scripts\python.exe" -m pip install -r "$root\requirements.txt"
Write-Host "Setup complete. Start with: $root\run.cmd"

