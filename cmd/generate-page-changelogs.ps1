$repoRoot = Split-Path $PSScriptRoot -Parent
$contentRoot = Join-Path $repoRoot "content\articles"
$dataDir = Join-Path $repoRoot "data"
$dataFile = Join-Path $dataDir "page_changelogs.json"

$articleFiles = Get-ChildItem $contentRoot -Recurse -File | Where-Object {
    $_.Name -in @("index.md", "_index.md", "index.html", "_index.html")
} | Sort-Object FullName

$changelogs = [ordered]@{}

foreach ($file in $articleFiles) {
    $repoRelative = $file.FullName.Substring($repoRoot.Length + 1).Replace('\', '/')
    $contentRelative = $file.FullName.Substring((Join-Path $repoRoot "content").Length + 1).Replace('\', '/')

    $lines = git -C $repoRoot log --follow -n 5 --date=short --format="%ad%x1f%h%x1f%s" -- $repoRelative
    if (-not $lines) {
        continue
    }

    $entries = @()
    foreach ($line in $lines) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $parts = $line -split [char]0x1f, 3
        $entries += [ordered]@{
            date = $parts[0]
            hash = $parts[1]
            subject = $parts[2]
        }
    }

    if ($entries.Count -gt 0) {
        $changelogs[$contentRelative] = $entries
    }
}

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
$changelogs | ConvertTo-Json -Depth 6 | Set-Content $dataFile
