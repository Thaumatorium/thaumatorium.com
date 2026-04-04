$ErrorActionPreference = "Stop"

& .\cmd\generate-page-changelogs.ps1

hugo --buildDrafts
$htmlfiles = Get-ChildItem .\public\ -Filter *.html -Recurse
foreach ($file in $htmlfiles) {
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "^\s+$", "" } |
    Where-Object { $_.trim() -ne "" } |
    Set-Content $file.PSPath
}
if (Get-Command prettier -ErrorAction SilentlyContinue) {
    prettier --ignore-path .prettierignore --write "public/**/*"
} else {
    Write-Host "Skipping Prettier: command not found"
}
