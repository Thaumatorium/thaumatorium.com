set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

default:
    just --list

allow:
    direnv allow

shell:
    devenv shell

serve *args:
    hugo server --buildDrafts --port 1313 --noHTTPCache --disableFastRender {{args}}

fmt-public:
    prettier --ignore-path .prettierignore --write "public/**/*"

new-article path:
    hugo new {{path}}
