#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
content_root="$repo_root/content/articles"
data_file="$repo_root/data/page_changelogs.json"
tmp_file="$(mktemp)"

printf '{}\n' > "$tmp_file"

while IFS= read -r -d '' file; do
    repo_relative="${file#"$repo_root"/}"
    content_relative="${file#"$repo_root/content/"}"

    log_output="$(git -C "$repo_root" log --follow -n 5 --date=short --format='%ad%x1f%h%x1f%s' -- "$repo_relative")"
    if [[ -z "$log_output" ]]; then
        continue
    fi

    entries="$(printf '%s\n' "$log_output" | jq -R -s '
        split("\n")
        | map(select(length > 0))
        | map(split("\u001f") | {
            date: .[0],
            hash: .[1],
            subject: .[2]
        })
    ')"

    jq --arg key "$content_relative" --argjson entries "$entries" \
        '. + {($key): $entries}' "$tmp_file" > "$tmp_file.next"
    mv "$tmp_file.next" "$tmp_file"
done < <(
    find "$content_root" -type f \( -name 'index.md' -o -name '_index.md' -o -name 'index.html' -o -name '_index.html' \) -print0 | sort -z
)

mkdir -p "$(dirname "$data_file")"
mv "$tmp_file" "$data_file"
