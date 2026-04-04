set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

allow:
    direnv allow

shell:
    devenv shell

serve *args:
    bash ./cmd/generate-page-changelogs.sh
    hugo server --buildDrafts --port 1313 --baseURL http://thaum.localhost:1313/ --noHTTPCache --disableFastRender {{args}}

build *args:
    bash ./cmd/generate-page-changelogs.sh
    hugo --buildDrafts {{args}}
    just fmt-public

changelog:
    bash ./cmd/generate-page-changelogs.sh

fmt-public:
    find public -type f -name '*.html' -print0 | while IFS= read -r -d '' file; do sed -i '/^[[:space:]]*$/d' "$file"; done
    oxfmt public

fmt:
    oxfmt .

prek-install:
    prek install

prek-run *args:
    prek run {{args}}

new-article path:
    hugo new {{path}}
