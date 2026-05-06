#!/usr/bin/env -S uv run --script
"""
Update the Housing Heatmap listings JSON.

Examples:
  ./scripts/housing-heatmap/update_listings.py --endpoint https://example.test/listings
  HOUSING_API_KEY=... ./scripts/housing-heatmap/update_listings.py --endpoint https://example.test/listings
  HUISPEDIA_API_KEY=... ./scripts/housing-heatmap/update_listings.py --endpoint https://example.test/listings --api-key-env HUISPEDIA_API_KEY --api-key-header X-Api-Key
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "requests",
# ]
# ///

from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[3]
OUTPUT_PATH = ROOT / "static" / "projects" / "housing-heatmap" / "listings.json"

PROVIDERS = {
    "funda_apify": "Funda",
    "pararius_apify": "Pararius",
    "huispedia": "Huispedia",
    "huislijn": "Huislijn",
    "vastgoed_nl": "Vastgoed Nederland",
}


@dataclass(frozen=True)
class Listing:
    id: str
    source: str
    city: str
    title: str
    latitude: float
    longitude: float
    area_m2: int
    price: int
    price_per_m2: float
    rooms: int | str
    home_type: str
    energy_label: str
    postal_code: str
    house_number: str
    bag_id: str
    pand_id: str
    verblijfsobject_id: str
    enrichment: dict[str, Any]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--endpoint", required=True, help="Live JSON endpoint to fetch.")
    parser.add_argument("--api-key-env", default="HOUSING_API_KEY", help="Environment variable containing an API key.")
    parser.add_argument("--api-key-header", default="Authorization", help="Header name for the API key.")
    parser.add_argument("--city", default="", help="Optional exact city filter, e.g. Utrecht.")
    parser.add_argument("--limit", type=int, default=1000, help="Maximum listings to write.")
    parser.add_argument("--providers", default=",".join(PROVIDERS), help="Comma-separated provider ids.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="Output JSON path.")
    return parser.parse_args()


def fetch_live_listings(args: argparse.Namespace, providers: list[str]) -> list[Listing]:
    headers = {"Accept": "application/json", "User-Agent": "thaumatorium-housing-heatmap/1.0"}
    api_key = os.environ.get(args.api_key_env)
    if api_key:
        headers[args.api_key_header] = f"Bearer {api_key}" if args.api_key_header.lower() == "authorization" else api_key

    response = requests.get(
        args.endpoint,
        params={"providers": ",".join(providers), "city": args.city, "limit": args.limit},
        headers=headers,
        timeout=45,
    )
    response.raise_for_status()
    payload = response.json()
    rows = payload if isinstance(payload, list) else payload.get("listings") or payload.get("data") or payload.get("results") or []
    return [listing for index, row in enumerate(rows) if (listing := normalize_listing(row, index))]


def normalize_listing(row: dict[str, Any], index: int) -> Listing | None:
    lat = number(row.get("latitude") or row.get("lat") or nested(row, "location", "lat") or nested(row, "coordinates", "lat"))
    lon = number(row.get("longitude") or row.get("lon") or row.get("lng") or nested(row, "location", "lon") or nested(row, "location", "lng") or nested(row, "coordinates", "lon") or nested(row, "coordinates", "lng"))
    price = number(row.get("price") or row.get("asking_price") or row.get("askingPrice") or row.get("vraagprijs"))
    area = number(row.get("area_m2") or row.get("area") or row.get("living_area") or row.get("livingArea") or row.get("oppervlakte"))
    if lat is None or lon is None or price is None or area is None or area <= 0:
        return None

    return Listing(
        id=str(row.get("id") or row.get("object_id") or row.get("url") or f"api-{index}"),
        source=str(row.get("source") or row.get("provider") or "live_api"),
        city=str(row.get("city") or row.get("plaats") or nested(row, "address", "city") or "Onbekend"),
        title=str(row.get("title") or nested(row, "address", "streetAddress") or row.get("address") or "Woning"),
        latitude=lat,
        longitude=lon,
        area_m2=round(area),
        price=round(price),
        price_per_m2=number(row.get("price_per_m2") or row.get("pricePerM2") or row.get("ppm")) or price / area,
        rooms=round(number(row.get("rooms") or row.get("kamers")) or 0) or "?",
        home_type=str(row.get("home_type") or row.get("type") or row.get("object_type") or "woning"),
        energy_label=str(row.get("energy_label") or row.get("energyLabel") or row.get("label") or "?"),
        postal_code=str(row.get("postal_code") or row.get("postcode") or nested(row, "address", "postalCode") or ""),
        house_number=str(row.get("house_number") or row.get("huisnummer") or nested(row, "address", "houseNumber") or ""),
        bag_id=str(row.get("bag_id") or row.get("bagId") or ""),
        pand_id=str(row.get("pand_id") or row.get("pandId") or row.get("pandidentificatie") or ""),
        verblijfsobject_id=str(row.get("verblijfsobject_id") or row.get("verblijfsobjectId") or row.get("vbo_id") or ""),
        enrichment=dict(row.get("enrichment") or {}),
    )


def nested(row: dict[str, Any], key: str, child: str) -> Any:
    value = row.get(key)
    return value.get(child) if isinstance(value, dict) else None


def number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).replace("€", "").replace(".", "").replace(",", ".").strip())
    except ValueError:
        return None


def write_output(path: Path, listings: list[Listing], source: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now(UTC).isoformat(),
        "source": source,
        "listings": [asdict(listing) for listing in listings],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    providers = [provider.strip() for provider in args.providers.split(",") if provider.strip()]
    listings = fetch_live_listings(args, providers)
    write_output(args.output, listings[: args.limit], "live_api")
    print(f"Wrote {len(listings[: args.limit])} listings to {args.output}")


if __name__ == "__main__":
    main()
