$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $root "assets\source_rebirth_tiles"
$python = Join-Path $root ".venv\Scripts\python.exe"
$charts = @(
    @{ Name = "rbc1.png"; Url = "https://i.redd.it/be1ekx9t3leh1.png" },
    @{ Name = "rbc2.png"; Url = "https://i.redd.it/memz6w9t3leh1.png" },
    @{ Name = "rbc3.png"; Url = "https://i.redd.it/38zfwx9t3leh1.png" },
    @{ Name = "rbc4.png"; Url = "https://i.redd.it/4o3hnv9t3leh1.png" }
)

if (-not (Test-Path $python)) {
    throw "Run setup.ps1 before downloading and extracting guide assets."
}

New-Item -ItemType Directory -Force -Path $source | Out-Null
foreach ($chart in $charts) {
    Invoke-WebRequest -UseBasicParsing -Headers @{ "User-Agent" = "DroidAdvisor-AssetBuilder" } `
        -Uri $chart.Url -OutFile (Join-Path $source $chart.Name)
}

Push-Location (Split-Path $root -Parent)
try {
    & $python -m droid_advisor.extract_rebirth_tiles
    if ($LASTEXITCODE -ne 0) { throw "Rebirth tile extraction failed." }
} finally {
    Pop-Location
}

Write-Host "Complete Rebirth tiles are ready. See assets\ATTRIBUTION.txt."
