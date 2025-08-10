#!/usr/bin/env bash

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
prettier --ignore-path .prettierignore --write "public/**/*"
