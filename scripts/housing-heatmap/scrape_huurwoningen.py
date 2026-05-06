#!/usr/bin/env -S uv run --script
"""
Scrape public Huurwoningen.nl listing pages when they are reachable without a bot challenge.

Keep this for small personal updates only; Huurwoningen.nl terms restrict systematic
or substantial reuse of advert data.
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
    parser = parse_common_args(__doc__, default_output=source_listings_path("huurwoningen"))
    parser.add_argument("--start-url", action="append", default=["/"])
    args = parser.parse_args()

    scraper = PublicListingScraper("huurwoningen", "https://www.huurwoningen.nl", args.delay, not args.ignore_robots)
    links = discover_links(scraper, args.start_url, [r"/huurwoning/[a-z0-9\-]+", r"/in/[a-z0-9\-]+/[a-z0-9\-]+"], args.limit)

    listings = []
    for url in links:
        listing = parse_listing_page("huurwoningen", url, scraper.get(url), geocode=not args.no_geocode)
        if listing:
            listings.append(listing)

    write_scraped_output(args.output, "huurwoningen", listings, args.append)
    print(f"huurwoningen: wrote {len(listings)} listings from {len(links)} candidate URLs")


if __name__ == "__main__":
    main()
