#!/usr/bin/env -S uv run --script
"""
Scrape public Huislijn listing pages into housing-heatmap listings JSON.
"""
# /// script
# requires-python = ">=3.13"
# dependencies = [
#     "beautifulsoup4",
#     "requests",
# ]
# ///

from __future__ import annotations

from housing_heatmap_lib import source_listings_path
from public_scraper_lib import PublicListingScraper, discover_links, parse_common_args, parse_listing_page, write_scraped_output


def main() -> None:
    parser = parse_common_args(__doc__, default_output=source_listings_path("huislijn"))
    parser.add_argument("--start-url", action="append", default=["/koopwoning/nederland", "/huurwoning/nederland"])
    args = parser.parse_args()

    scraper = PublicListingScraper("huislijn", "https://www.huislijn.nl", args.delay, not args.ignore_robots)
    links = discover_links(
        scraper,
        args.start_url,
        [
            r"/koopwoning/[a-z0-9\-]+/[a-z0-9\-]+/[a-z0-9\-]+",
            r"/huurwoning/[a-z0-9\-]+/[a-z0-9\-]+/[a-z0-9\-]+",
        ],
        args.limit,
    )

    listings = []
    for url in links:
        listing = parse_listing_page("huislijn", url, scraper.get(url), geocode=not args.no_geocode)
        if listing:
            listings.append(listing)

    write_scraped_output(args.output, "huislijn", listings, args.append)
    print(f"huislijn: wrote {len(listings)} listings from {len(links)} candidate URLs")


if __name__ == "__main__":
    main()
