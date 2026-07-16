param(
    [Parameter(Mandatory = $true)]
    [string]$InstallerPath
)

$ErrorActionPreference = "Stop"
$signtool = Get-Command signtool.exe -ErrorAction Stop
& $signtool.Source sign /fd SHA256 /td SHA256 /tr "http://timestamp.digicert.com" /a $InstallerPath
if ($LASTEXITCODE -ne 0) { throw "Authenticode signing failed." }
Get-AuthenticodeSignature $InstallerPath | Format-List Status, StatusMessage, SignerCertificate

