#!/usr/bin/env bash

set -euo pipefail

hugo server --buildDrafts --port 1313 --noHTTPCache --disableFastRender
