#!/usr/bin/env -S uv run --script
"""
Scrape public Huispedia search result pages into housing-heatmap listings JSON.

Huispedia embeds a server-side search payload in window.sd. This script reads
that payload and normalizes the visible result page; it does not call private
browser APIs or authenticated routes.
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "beautifulsoup4",
#     "requests",
# ]
# ///

from __future__ import annotations

import base64
import itertools
import json
import re
from datetime import UTC, datetime

from housing_heatmap_lib import source_listings_path
from public_scraper_lib import (
    PublicListingScraper,
    ScrapedListing,
    parse_common_args,
    stable_id,
    write_checkpoint,
    write_scraped_output,
)


def decode_payload(html: str) -> dict:
    match = re.search(r"window\.sd\s*=\s*'([^']+)'", html)
    if not match:
        return {}
    return json.loads(base64.b64decode(pad_base64(match.group(1))))


def decode_properties(value) -> list[dict]:
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        return []
    candidates = [value, value[1:]]
    for candidate in candidates:
        try:
            decoded = base64.b64decode(pad_base64(candidate))
            parsed = json.loads(decoded)
            return parsed if isinstance(parsed, list) else []
        except Exception:
            continue
    return []


def pad_base64(value: str) -> str:
    return value + "=" * ((4 - len(value) % 4) % 4)


def property_url(row: dict) -> str:
    city = row.get("city_slug") or row.get("city_name") or ""
    street = row.get("street_slug") or row.get("street") or ""
    house = row.get("hnumchar") or row.get("hnum") or ""
    if city and street and house:
        return f"https://huispedia.nl/koopwoningen/{city}/{street}/{house}"
    return "https://huispedia.nl/koopwoningen"


def listing_from_row(row: dict) -> ScrapedListing | None:
    price = row.get("price_search") or row.get("price_sale") or row.get("price_rent")
    area = row.get("woonoppervlakte")
    lat = row.get("lat")
    lon = row.get("lon")
    if not price or not area or not lat or not lon:
        return None
    url = property_url(row)
    title = " ".join(
        str(part) for part in (row.get("street"), row.get("hnumchar")) if part
    )
    source_id = str(row.get("id") or stable_id("huispedia", url))
    return ScrapedListing(
        id=f"huispedia-{source_id}",
        source="huispedia",
        city=str(row.get("city_name") or "Onbekend"),
        title=title or "Woning",
        latitude=float(lat),
        longitude=float(lon),
        area_m2=round(float(area)),
        price=round(float(price)),
        price_per_m2=float(price) / float(area),
        rooms=round(float(row.get("aantal_kamers") or 0)) or "?",
        home_type=str(row.get("object_type") or "woning"),
        energy_label="?",
        postal_code=str(row.get("postcode") or ""),
        house_number=str(row.get("hnumchar") or row.get("hnum") or ""),
        bag_id="",
        pand_id="",
        verblijfsobject_id="",
        url=url,
        scraped_at=datetime.now(UTC).isoformat(),
        enrichment={
            "scraped": {"url": url},
            "huispedia": {
                key: row.get(key)
                for key in (
                    "status",
                    "market_label",
                    "valuation_label",
                    "bouwjaar",
                    "perceeloppervlakte",
                    "office_name",
                    "ml_sale_price_m",
                )
                if row.get(key) is not None
            },
        },
    )


def main() -> None:
    parser = parse_common_args(
        __doc__, default_output=source_listings_path("huispedia")
    )
    parser.set_defaults(limit=0)
    parser.add_argument(
        "--start-url", action="append", default=["/koopwoningen/heel-nederland"]
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=0,
        help="Maximum number of search result pages to read per start URL. Default: all pages until empty.",
    )
    args = parser.parse_args()

    scraper = PublicListingScraper(
        "huispedia", "https://huispedia.nl", args.delay, not args.ignore_robots
    )
    listings = []
    seen_ids = set()
    for start_url in args.start_url:
        pages = itertools.count(1) if args.pages <= 0 else range(1, args.pages + 1)
        for page in pages:
            url = start_url if page == 1 else f"{start_url.rstrip('/')}/{page}_p"
            print(f"huispedia: pagina {page} ({start_url}) …", flush=True)
            payload = decode_payload(scraper.get(url))
            page_count = 0
            for row in decode_properties(payload.get("properties")):
                listing = listing_from_row(row)
                if listing and listing.id not in seen_ids:
                    seen_ids.add(listing.id)
                    listings.append(listing)
                    page_count += 1
                if args.limit > 0 and len(listings) >= args.limit:
                    break
            if page_count == 0:
                print(
                    f"huispedia: pagina {page} leeg, klaar met {start_url}", flush=True
                )
                break
            print(
                f"huispedia: pagina {page} → {page_count} nieuw, {len(listings)} totaal",
                flush=True,
            )
            write_checkpoint(args.output, "huispedia", listings, args.append)
            if args.limit > 0 and len(listings) >= args.limit:
                break

    output_listings = listings[: args.limit] if args.limit > 0 else listings
    write_scraped_output(args.output, "huispedia", output_listings, args.append)
    print(f"huispedia: wrote {len(output_listings)} listings")


if __name__ == "__main__":
    main()
