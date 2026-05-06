#!/usr/bin/env -S uv run --script
"""
Enrich listings with nearest/first OGC API Features result around each point.

Examples:
  ./scripts/housing-heatmap/enrich_ogc_features.py --name bag --base-url https://api.pdok.nl/kadaster/bag/ogc/v2 --collection verblijfsobjecten --keep identificatie,pandidentificatie,gebruiksdoel,oppervlakte,bouwjaar
  ./scripts/housing-heatmap/enrich_ogc_features.py --name kadastralekaart --base-url https://api.pdok.nl/kadaster/kadastralekaart/ogc/v1 --collection perceel --keep kadastraleGemeenteSectie,perceelnummer
  ./scripts/housing-heatmap/enrich_ogc_features.py --name cbs_buurt --base-url https://api.pdok.nl/cbs/wijkenbuurten/2024/ogc/v1 --collection buurten
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

from housing_heatmap_lib import LISTINGS_PATH, compact_properties, ensure_enrichment, load_payload, point_bbox, request_json, write_payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--name", required=True, help="Enrichment key, e.g. bag, kadastralekaart, cbs_buurt, bgt.")
    parser.add_argument("--base-url", required=True, help="OGC API base URL, without trailing /collections.")
    parser.add_argument("--collection", required=True, help="OGC collection id.")
    parser.add_argument("--input", type=Path, default=LISTINGS_PATH)
    parser.add_argument("--output", type=Path, default=LISTINGS_PATH)
    parser.add_argument("--radius-m", type=float, default=35)
    parser.add_argument("--limit", type=int, default=1)
    parser.add_argument("--keep", default="", help="Comma-separated property names to retain. Empty keeps scalar properties.")
    parser.add_argument("--max-listings", type=int, default=0, help="Debug cap; 0 means all listings.")
    return parser.parse_args()


def items_url(base_url: str, collection: str) -> str:
    return f"{base_url.rstrip('/')}/collections/{collection}/items"


def enrich_listing(listing: dict[str, Any], args: argparse.Namespace, keep: list[str]) -> bool:
    lat = float(listing["latitude"])
    lon = float(listing["longitude"])
    payload = request_json(
        items_url(args.base_url, args.collection),
        params={
            "bbox": point_bbox(lon, lat, args.radius_m),
            "limit": args.limit,
            "f": "json",
        },
    )
    features = payload.get("features") or []
    if not features:
        return False

    feature = features[0]
    properties = feature.get("properties") or {}
    enrichment = ensure_enrichment(listing)
    enrichment[args.name] = {
        "feature_id": feature.get("id"),
        "collection": args.collection,
        "properties": compact_properties(properties, keep),
    }
    return True


def main() -> None:
    args = parse_args()
    keep = [item.strip() for item in args.keep.split(",") if item.strip()]
    payload = load_payload(args.input)
    listings = payload["listings"][: args.max_listings or None]

    matched = 0
    for listing in listings:
        try:
            if enrich_listing(listing, args, keep):
                matched += 1
        except Exception as exc:
            ensure_enrichment(listing).setdefault("_errors", {})[args.name] = str(exc)

    payload.setdefault("enrichment_sources", {})[args.name] = {
        "type": "ogc_features",
        "base_url": args.base_url,
        "collection": args.collection,
        "radius_m": args.radius_m,
        "matched": matched,
    }
    write_payload(payload, args.output)
    print(f"{args.name}: matched {matched}/{len(listings)} listings")


if __name__ == "__main__":
    main()
