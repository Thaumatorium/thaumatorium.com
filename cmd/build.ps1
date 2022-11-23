hugo --buildDrafts
$htmlfiles = Get-ChildItem .\public\ -Filter *.html -Recurse
foreach ($file in $htmlfiles) {
    (Get-Content $file.PSPath) |
    Foreach-Object { $_ -replace "^\s+$", "" } |
    Where-Object { $_.trim() -ne "" } |
    Set-Content $file.PSPath
}
