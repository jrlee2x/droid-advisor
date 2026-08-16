$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root ".venv\Scripts\python.exe"
$isccCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Inno Setup 6\ISCC.exe"),
    (Join-Path $env:ProgramFiles "Inno Setup 6\ISCC.exe")
)

if (-not (Test-Path $python)) {
    throw "Run setup.ps1 first."
}

Push-Location $root
try {
    & $python -m pip install --disable-pip-version-check --require-hashes -r build-requirements.lock
    Push-Location (Split-Path $root -Parent)
    try {
        & $python -m droid_advisor.build_alert_sounds
        if ($LASTEXITCODE -ne 0) { throw "Alert sound generation failed." }
        & $python -m droid_advisor.build_rebirth_tiles --replace-all
        if ($LASTEXITCODE -ne 0) { throw "Rebirth card generation failed." }
    } finally {
        Pop-Location
    }
    Remove-Item -Recurse -Force build, dist, dist-installer -ErrorAction SilentlyContinue
    & $python -m PyInstaller --noconfirm --clean DroidAdvisor.spec
    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed." }

    $iscc = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $iscc) {
        throw "Inno Setup 6 is required to build the installer. Install it with: winget install --id JRSoftware.InnoSetup -e"
    }
    & $iscc installer.iss
    if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed." }

    $installer = Get-ChildItem dist-installer\DroidAdvisor-Setup-*.exe | Select-Object -First 1
    $hash = Get-FileHash $installer.FullName -Algorithm SHA256
    "$($hash.Hash)  $($installer.Name)" | Set-Content -Encoding ascii "$($installer.FullName).sha256"
    Write-Host "Built: $($installer.FullName)"
    Write-Host "SHA256: $($hash.Hash)"
} finally {
    Pop-Location
}
