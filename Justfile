set shell := ["bash", "-eu", "-o", "pipefail", "-c"]
set positional-arguments

port := "1314"
base_url := "http://thaum.localhost:" + port + "/"
publish_dir := "/home/david/dev/Thaumatorium/thaumatorium.github.io/branches/master"

default:
    @just --list --unsorted

alias a := allow
allow:
    @direnv allow

shell:
    @devenv shell

alias s := serve
serve *args:
    @npm run build:hypertext-token-killer
    @bash ./cmd/generate-page-changelogs.sh
    @hugo server --buildDrafts --port {{port}} --baseURL {{base_url}} --noHTTPCache --disableFastRender "$@"

alias b := build
build *args:
    @npm run build:hypertext-token-killer
    @bash ./cmd/generate-page-changelogs.sh
    @hugo --buildDrafts "$@"
    @just fmt
    @just fmt-public

hypertext-token-killer-assets:
    @npm run build:hypertext-token-killer

hypertext-token-killer-test:
    @npm test

publish:
    @just hypertext-token-killer-test
    @just build
    @just publish-copy

publish-copy:
    #!/usr/bin/env bash
    set -euo pipefail
    target_dir={{quote(publish_dir)}}
    test -d "$target_dir" || (echo "Publish target does not exist: $target_dir" >&2; exit 1)
    rsync -a --exclude '.git' public/ "$target_dir"/

changelog:
    @bash ./cmd/generate-page-changelogs.sh

housing-heatmap-data endpoint *args:
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} "$@"

housing-heatmap-data-bearer endpoint *args:
    @test -n "$${HOUSING_API_KEY:-}" || (echo "Set HOUSING_API_KEY first" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env HOUSING_API_KEY --api-key-header Authorization "$@"

housing-heatmap-data-x-api-key endpoint env_var="HOUSING_API_KEY" *args:
    @env_name={{quote(env_var)}}; test -n "${!env_name:-}" || (echo "Set {{env_var}} first" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env {{quote(env_var)}} --api-key-header X-Api-Key "$@"

housing-heatmap-data-huispedia endpoint *args:
    @test -n "$${HUISPEDIA_API_KEY:-}" || (echo "Set HUISPEDIA_API_KEY first" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env HUISPEDIA_API_KEY --api-key-header X-Api-Key --providers huispedia "$@"

housing-heatmap-data-woninglab endpoint *args:
    @test -n "$${WONINGLAB_API_KEY:-}" || (echo "Set WONINGLAB_API_KEY first" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env WONINGLAB_API_KEY --api-key-header Authorization "$@"

housing-heatmap-scrape-huislijn *args:
    @./scripts/housing-heatmap/scrape_huislijn.py "$@"

housing-heatmap-scrape-huispedia *args:
    @./scripts/housing-heatmap/scrape_huispedia.py "$@"

housing-heatmap-scrape-huurwoningen *args:
    @./scripts/housing-heatmap/scrape_huurwoningen.py "$@"

housing-heatmap-scrape-thuispoort *args:
    @./scripts/housing-heatmap/scrape_thuispoort.py "$@"

housing-heatmap-scrape-room *args:
    @./scripts/housing-heatmap/scrape_room.py "$@"

housing-heatmap-scrape-all *args:
    #!/usr/bin/env bash
    set -euo pipefail
    ./scripts/housing-heatmap/scrape_huispedia.py "$@" &
    pid_huispedia=$!
    ./scripts/housing-heatmap/scrape_huislijn.py "$@" &
    pid_huislijn=$!
    ./scripts/housing-heatmap/scrape_huurwoningen.py "$@" &
    pid_huurwoningen=$!
    ./scripts/housing-heatmap/scrape_thuispoort.py "$@" &
    pid_thuispoort=$!
    ./scripts/housing-heatmap/scrape_room.py "$@" &
    pid_room=$!
    wait "$pid_huispedia"
    wait "$pid_huislijn"
    wait "$pid_huurwoningen"
    wait "$pid_thuispoort"
    wait "$pid_room"

housing-heatmap-data-funda-authorized endpoint *args:
    @test -n "$${FUNDA_API_KEY:-}" || (echo "Set FUNDA_API_KEY first; HTML scraping Funda is intentionally unsupported" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env FUNDA_API_KEY --api-key-header Authorization --providers funda_authorized "$@"

housing-heatmap-data-pararius-authorized endpoint *args:
    @test -n "$${PARARIUS_API_KEY:-}" || (echo "Set PARARIUS_API_KEY first; HTML scraping Pararius is intentionally unsupported" >&2; exit 1)
    @./scripts/housing-heatmap/update_listings.py --endpoint {{quote(endpoint)}} --api-key-env PARARIUS_API_KEY --api-key-header Authorization --providers pararius_authorized "$@"

housing-heatmap-enrich-ogc name base_url collection *args:
    @./scripts/housing-heatmap/enrich_ogc_features.py --name {{quote(name)}} --base-url {{quote(base_url)}} --collection {{quote(collection)}} "$@"

housing-heatmap-enrich-bag collection="verblijfsobjecten" *args:
    @./scripts/housing-heatmap/enrich_ogc_features.py --name bag --base-url https://api.pdok.nl/kadaster/bag/ogc/v2 --collection {{quote(collection)}} --keep identificatie,pandidentificatie,gebruiksdoel,oppervlakte,bouwjaar,status "$@"

housing-heatmap-enrich-kadastralekaart collection="perceel" *args:
    @./scripts/housing-heatmap/enrich_ogc_features.py --name kadastralekaart --base-url https://api.pdok.nl/kadaster/kadastralekaart/ogc/v1 --collection {{quote(collection)}} "$@"

housing-heatmap-enrich-cbs-buurt year="2024" collection="buurten" *args:
    @./scripts/housing-heatmap/enrich_ogc_features.py --name cbs_buurt --base-url https://api.pdok.nl/cbs/wijkenbuurten/{{year}}/ogc/v1 --collection {{quote(collection)}} "$@"

housing-heatmap-enrich-bgt collection *args:
    @./scripts/housing-heatmap/enrich_ogc_features.py --name bgt --base-url https://api.pdok.nl/lv/bgt/ogc/v1 --collection {{quote(collection)}} "$@"

housing-heatmap-enrich-ep-online url *args:
    @test -n "$${EP_ONLINE_API_KEY:-}" || (echo "Set EP_ONLINE_API_KEY first" >&2; exit 1)
    @./scripts/housing-heatmap/enrich_ep_online.py --url {{quote(url)}} --api-key-env EP_ONLINE_API_KEY "$@"

housing-heatmap-enrich-cbs-statline odata_url *args:
    @./scripts/housing-heatmap/enrich_cbs_statline.py --odata-url {{quote(odata_url)}} "$@"

fmt-public:
    #!/usr/bin/env bash
    set -euo pipefail
    find public -type f -name '*.html' -print0 | while IFS= read -r -d '' file; do
      sed -i '/^[[:space:]]*$/d' "$file"
    done
    find public -type f -name '*.xml' -print0 | while IFS= read -r -d '' file; do
      sed -i '1{/^[[:space:]]*$/d;}' "$file"
      xmllint --format "$file" --output "$file"
    done
    oxfmt public

fmt:
    @oxfmt .

prek-install:
    @prek install

prek-run *args:
    @prek run "$@"

new-article path:
    #!/usr/bin/env bash
    set -euo pipefail
    path={{quote(path)}}
    path="${path#./}"
    path="${path#content/}"
    if [[ "$path" != *.* ]]; then path="${path%/}/index.md"; fi
    hugo new content --kind article "$path"

new-project path:
    #!/usr/bin/env bash
    set -euo pipefail
    path={{quote(path)}}
    path="${path#./}"
    path="${path#content/}"
    if [[ "$path" == */ ]]; then path="${path%/}"; fi
    if [[ "$path" != projects/* ]]; then path="projects/$path"; fi
    if [[ "$path" != *.* ]]; then path="${path%/}/index.md"; fi
    hugo new content --kind default "$path"
