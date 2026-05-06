#!/usr/bin/env -S uv run --script
"""
Enrich listings with EP-Online/RVO energy label rows from a CSV or zipped CSV.

Use a URL you obtain from EP-Online PublicData after API-key validation.
The script matches by pand_id, verblijfsobject_id, bag_id, or postcode+huisnummer.
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "requests",
# ]
# ///

from __future__ import annotations

import argparse
import csv
import io
import os
import zipfile
from pathlib import Path
from typing import Any

import requests

from housing_heatmap_lib import LISTINGS_PATH, ensure_enrichment, load_payload, write_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", required=True, help="EP-Online CSV or ZIP download URL.")
    parser.add_argument("--api-key-env", default="EP_ONLINE_API_KEY")
    parser.add_argument("--api-key-header", default="X-Api-Key")
    parser.add_argument("--api-key-query-param", default="", help="Use this query parameter instead of a header when needed.")
    parser.add_argument("--input", type=Path, default=LISTINGS_PATH)
    parser.add_argument("--output", type=Path, default=LISTINGS_PATH)
    return parser.parse_args()


def download_rows(args: argparse.Namespace) -> list[dict[str, str]]:
    headers = {"User-Agent": "thaumatorium-housing-heatmap/1.0"}
    params = {}
    api_key = os.environ.get(args.api_key_env)
    if api_key and args.api_key_query_param:
        params[args.api_key_query_param] = api_key
    elif api_key:
        headers[args.api_key_header] = api_key

    response = requests.get(args.url, headers=headers, params=params, timeout=120)
    response.raise_for_status()
    content = response.content

    if zipfile.is_zipfile(io.BytesIO(content)):
        with zipfile.ZipFile(io.BytesIO(content)) as archive:
            name = next(item for item in archive.namelist() if item.lower().endswith(".csv"))
            content = archive.read(name)

    text = content.decode("utf-8-sig")
    sample = text[:4096]
    dialect = csv.Sniffer().sniff(sample, delimiters=",;|\t")
    return list(csv.DictReader(io.StringIO(text), dialect=dialect))


def keys_for_listing(listing: dict[str, Any]) -> list[str]:
    keys = []
    for field in ("pand_id", "verblijfsobject_id", "bag_id"):
        if listing.get(field):
            keys.append(f"id:{listing[field]}")
    postcode = str(listing.get("postal_code") or "").replace(" ", "").upper()
    huisnummer = str(listing.get("house_number") or "").strip()
    if postcode and huisnummer:
        keys.append(f"address:{postcode}:{huisnummer}")
    return keys


def keys_for_row(row: dict[str, str]) -> list[str]:
    lowered = {key.lower(): value for key, value in row.items()}
    keys = []
    for field in ("pand_id", "pandidentificatie", "verblijfsobject_id", "verblijfsobjectidentificatie", "bag_id"):
        if lowered.get(field):
            keys.append(f"id:{lowered[field]}")
    postcode = (lowered.get("postcode") or lowered.get("post_code") or "").replace(" ", "").upper()
    huisnummer = (lowered.get("huisnummer") or lowered.get("house_number") or "").strip()
    if postcode and huisnummer:
        keys.append(f"address:{postcode}:{huisnummer}")
    return keys


def energy_label(row: dict[str, str]) -> str:
    lowered = {key.lower(): value for key, value in row.items()}
    return lowered.get("energieklasse") or lowered.get("energielabel") or lowered.get("label") or "?"


def main() -> None:
    args = parse_args()
    rows = download_rows(args)
    by_key: dict[str, dict[str, str]] = {}
    for row in rows:
        for key in keys_for_row(row):
            by_key.setdefault(key, row)

    payload = load_payload(args.input)
    matched = 0
    for listing in payload["listings"]:
        row = next((by_key[key] for key in keys_for_listing(listing) if key in by_key), None)
        if not row:
            continue
        label = energy_label(row)
        listing["energy_label"] = label
        ensure_enrichment(listing)["ep_online"] = {
            "energy_label": label,
            "matched_fields": list(row.keys()),
        }
        matched += 1

    payload.setdefault("enrichment_sources", {})["ep_online"] = {
        "type": "ep_online_csv",
        "url": args.url,
        "matched": matched,
    }
    write_payload(payload, args.output)
    print(f"ep_online: matched {matched}/{len(payload['listings'])} listings")


if __name__ == "__main__":
    main()
