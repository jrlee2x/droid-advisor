$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $root ".venv"

if (-not (Test-Path $venv)) {
    python -m venv $venv
}

& "$venv\Scripts\python.exe" -m pip install --require-hashes -r "$root\requirements.lock"
Write-Host "Setup complete. Start with: $root\run.cmd"
