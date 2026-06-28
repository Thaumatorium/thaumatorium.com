#!/usr/bin/env bash

set -euo pipefail

git pull --recurse-submodules

# maybe
git submodule sync --recursive
git submodule update --init --recursive
