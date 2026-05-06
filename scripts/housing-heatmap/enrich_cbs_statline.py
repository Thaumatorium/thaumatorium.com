#!/usr/bin/env -S uv run --script
"""
Enrich listings from a CBS StatLine/OData table.

This expects listings to already have a key such as enrichment.cbs_buurt.properties.Buurtcode
from the PDOK CBS wijken/buurten OGC layer.
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "requests",
# ]
# ///

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from housing_heatmap_lib import LISTINGS_PATH, ensure_enrichment, load_payload, request_json, write_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--odata-url", required=True, help="OData endpoint for a table resource, e.g. .../TypedDataSet")
    parser.add_argument("--listing-key", default="enrichment.cbs_buurt.properties.Buurtcode")
    parser.add_argument("--odata-key", default="RegioS")
    parser.add_argument("--keep", default="", help="Comma-separated CBS fields to keep. Empty keeps all scalar fields.")
    parser.add_argument("--input", type=Path, default=LISTINGS_PATH)
    parser.add_argument("--output", type=Path, default=LISTINGS_PATH)
    return parser.parse_args()


def get_path(row: dict[str, Any], path: str) -> Any:
    value: Any = row
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def compact(row: dict[str, Any], keep: list[str]) -> dict[str, Any]:
    if keep:
        return {key: row[key] for key in keep if key in row}
    return {key: value for key, value in row.items() if isinstance(value, str | int | float | bool)}


def fetch_all_rows(url: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    next_url: str | None = url
    while next_url:
        payload = request_json(next_url)
        rows.extend(payload.get("value") or [])
        next_url = payload.get("@odata.nextLink")
    return rows


def main() -> None:
    args = parse_args()
    keep = [item.strip() for item in args.keep.split(",") if item.strip()]
    cbs_rows = fetch_all_rows(args.odata_url)
    by_key = {str(row.get(args.odata_key)): row for row in cbs_rows if row.get(args.odata_key)}

    payload = load_payload(args.input)
    matched = 0
    for listing in payload["listings"]:
        key = get_path(listing, args.listing_key)
        if key is None:
            continue
        row = by_key.get(str(key))
        if not row:
            continue
        ensure_enrichment(listing)["cbs_statline"] = compact(row, keep)
        matched += 1

    payload.setdefault("enrichment_sources", {})["cbs_statline"] = {
        "type": "cbs_statline_odata",
        "odata_url": args.odata_url,
        "listing_key": args.listing_key,
        "odata_key": args.odata_key,
        "matched": matched,
    }
    write_payload(payload, args.output)
    print(f"cbs_statline: matched {matched}/{len(payload['listings'])} listings")


if __name__ == "__main__":
    main()
