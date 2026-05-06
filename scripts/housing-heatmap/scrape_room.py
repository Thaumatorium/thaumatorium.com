#!/usr/bin/env -S uv run --script
"""
Scrape public ROOM.nl pages into housing-heatmap listings JSON.

ROOM is app-heavy, so this script works best with public detail URLs from the
sitemap or a provided --start-url that renders listing links server-side.
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "beautifulsoup4",
#     "requests",
# ]
# ///

from __future__ import annotations

import re

from housing_heatmap_lib import source_listings_path
from public_scraper_lib import PublicListingScraper, discover_links, parse_common_args, parse_listing_page, write_scraped_output


def main() -> None:
    parser = parse_common_args(__doc__, default_output=source_listings_path("room"))
    parser.add_argument("--start-url", action="append", default=["/en"])
    args = parser.parse_args()

    scraper = PublicListingScraper("room", "https://www.room.nl", args.delay, not args.ignore_robots)
    links = discover_links(scraper, args.start_url, [r"/(?:en/)?offer/[a-z0-9\-/]+", r"/(?:en/)?room/[a-z0-9\-/]+"], args.limit)

    listings = []
    for url in links:
        listing = parse_listing_page("room", url, scraper.get(url), geocode=not args.no_geocode)
        if listing:
            listings.append(listing)

    write_scraped_output(args.output, "room", listings, args.append)
    print(f"room: wrote {len(listings)} listings from {len(links)} candidate URLs")


if __name__ == "__main__":
    main()
