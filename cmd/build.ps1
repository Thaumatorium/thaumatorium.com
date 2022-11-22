hugo --buildDrafts
$htmlfiles = Get-ChildItem .\public\**\*.html
foreach ($file in $htmlfiles)
{
(Get-Content $file.PSPath) |
Foreach-Object { $_ -replace "^\s+$", "" } |
Where-Object {$_.trim() -ne "" } |
Set-Content $file.PSPath
}
