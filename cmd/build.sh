#!/usr/bin/env bash

set -euo pipefail

bash ./cmd/generate-page-changelogs.sh

# Build drafts using Hugo
hugo --buildDrafts

# Find all HTML files in the public directory recursively
htmlfiles=$(find ./public -type f -name "*.html")

# Loop through each HTML file
for file in $htmlfiles; do
    # Remove lines that contain only whitespace and trim other lines
    sed -i '/^[[:space:]]*$/d' "$file"
done

# Format files using Prettier, respecting .prettierignore
if command -v prettier >/dev/null 2>&1; then
    prettier --ignore-path .prettierignore --write "public/**/*"
else
    echo "Skipping Prettier: command not found"
fi
