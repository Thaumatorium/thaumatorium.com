#!/usr/bin/env -S uv run --script
"""
Scrape public Thuispoort offer pages into housing-heatmap listings JSON.
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
    parser = parse_common_args(__doc__, default_output=source_listings_path("thuispoort"))
    parser.add_argument("--start-url", action="append", default=["/aanbod/te-huur"])
    args = parser.parse_args()

    scraper = PublicListingScraper("thuispoort", "https://www.thuispoort.nl", args.delay, not args.ignore_robots)
    links = discover_links(scraper, args.start_url, [r"/aanbod/te-huur/[a-z0-9\-/]+", r"/woning/[a-z0-9\-/]+"], args.limit)

    listings = []
    for url in links:
        listing = parse_listing_page("thuispoort", url, scraper.get(url), geocode=not args.no_geocode)
        if listing:
            listings.append(listing)

    write_scraped_output(args.output, "thuispoort", listings, args.append)
    print(f"thuispoort: wrote {len(listings)} listings from {len(links)} candidate URLs")


if __name__ == "__main__":
    main()
