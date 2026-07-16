$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$source = Join-Path $root "assets\source_cycles"
$python = Join-Path $root ".venv\Scripts\python.exe"
$images = @(
    @{ Name = "rbc1.png"; Url = "https://i.imgur.com/pvtdbt6.png" },
    @{ Name = "rbc2.png"; Url = "https://i.imgur.com/SC4wa8a.png" },
    @{ Name = "rbc3.png"; Url = "https://i.imgur.com/dkwosK2.png" },
    @{ Name = "rbc4.png"; Url = "https://i.imgur.com/sAflayi.png" }
)

if (-not (Test-Path $python)) {
    throw "Run setup.ps1 before downloading and extracting guide assets."
}

New-Item -ItemType Directory -Force -Path $source | Out-Null
foreach ($image in $images) {
    $destination = Join-Path $source $image.Name
    Invoke-WebRequest -UseBasicParsing -Uri $image.Url -OutFile $destination
}

Push-Location (Split-Path $root -Parent)
try {
    & $python -m droid_advisor.extract_thumbnails
    if ($LASTEXITCODE -ne 0) { throw "Thumbnail extraction failed." }
    1..4 | ForEach-Object {
        & $python -m droid_advisor.extract_quality_requirements --cycle $_
        if ($LASTEXITCODE -ne 0) { throw "Quality extraction failed for RBC$_" }
    }
    & $python -m droid_advisor.extract_quality_requirements --combine
    if ($LASTEXITCODE -ne 0) { throw "Quality table combination failed." }
} finally {
    Pop-Location
}

Write-Host "Guide assets are ready. See assets\ATTRIBUTION.txt for credit and source links."

