from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.parse
import urllib.robotparser
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

import requests
from bs4 import BeautifulSoup
from housing_heatmap_lib import (
    LISTINGS_PATH,
    USER_AGENT,
    number,
    request_json,
    write_json_atomic,
)


@dataclass(frozen=True)
class ScrapedListing:
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
    url: str
    scraped_at: str
    enrichment: dict[str, Any]


class PublicListingScraper:
    def __init__(
        self, source: str, base_url: str, delay: float, respect_robots: bool
    ) -> None:
        self.source = source
        self.base_url = base_url.rstrip("/")
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update(
            {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
        )
        self.robots = urllib.robotparser.RobotFileParser()
        self.robots.set_url(urllib.parse.urljoin(self.base_url, "/robots.txt"))
        self.respect_robots = respect_robots
        if respect_robots:
            self.read_robots()

    def read_robots(self) -> None:
        robots_url = urllib.parse.urljoin(self.base_url, "/robots.txt")
        try:
            response = self.session.get(robots_url, timeout=20)
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RuntimeError(
                f"Could not fetch {robots_url} for robots.txt check: {exc}"
            ) from exc
        self.robots.parse(response.text.splitlines())

    def get(self, url: str) -> str:
        absolute = urllib.parse.urljoin(self.base_url, url)
        if self.respect_robots and not self.robots.can_fetch(USER_AGENT, absolute):
            raise PermissionError(f"robots.txt disallows {absolute}")
        time.sleep(self.delay)
        response = self.session.get(absolute, timeout=45)
        response.raise_for_status()
        if "Just a moment" in response.text and "Cloudflare" in response.text:
            raise RuntimeError(f"{absolute} returned a bot challenge")
        return response.text


def parse_common_args(
    description: str, default_output: Path = LISTINGS_PATH
) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--output", type=Path, default=default_output)
    parser.add_argument("--limit", type=int, default=250)
    parser.add_argument(
        "--delay", type=float, default=2.0, help="Seconds between HTTP requests."
    )
    parser.add_argument(
        "--ignore-robots",
        action="store_true",
        help="For manual debugging only; do not use for routine updates.",
    )
    parser.add_argument(
        "--no-geocode",
        action="store_true",
        help="Do not use PDOK Locatieserver for missing coordinates.",
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append/merge into existing output instead of replacing.",
    )
    return parser


def discover_links(
    scraper: PublicListingScraper,
    start_urls: Iterable[str],
    link_patterns: list[str],
    limit: int,
) -> list[str]:
    seen: set[str] = set()
    links: list[str] = []
    patterns = [re.compile(pattern) for pattern in link_patterns]
    queue = list(start_urls)

    for url in queue:
        if len(links) >= limit:
            break
        soup = BeautifulSoup(scraper.get(url), "html.parser")
        for anchor in soup.select("a[href]"):
            href = urllib.parse.urljoin(scraper.base_url, anchor["href"])
            clean = href.split("#", 1)[0]
            if clean in seen:
                continue
            if any(pattern.search(clean) for pattern in patterns):
                seen.add(clean)
                links.append(clean)
                if len(links) >= limit:
                    break
    return links


def parse_listing_page(
    source: str, url: str, html: str, *, geocode: bool
) -> ScrapedListing | None:
    soup = BeautifulSoup(html, "html.parser")
    candidates = json_ld_objects(soup)
    text = soup.get_text(" ", strip=True)
    data = merge_listing_data(candidates)
    title = str(
        data.get("name")
        or data.get("title")
        or meta(soup, "og:title")
        or soup.title.string
        if soup.title
        else "Woning"
    )
    address = data.get("address") if isinstance(data.get("address"), dict) else {}

    price = first_number(data, ["price", "prijs", "askingPrice"]) or price_from_text(
        text
    )
    area = first_number(
        data, ["floorSize", "area", "area_m2", "livingArea"]
    ) or area_from_text(text)
    lat = first_number(data, ["latitude", "lat"])
    lon = first_number(data, ["longitude", "lng", "lon"])
    if (lat is None or lon is None) and isinstance(data.get("geo"), dict):
        lat = number(data["geo"].get("latitude"))
        lon = number(data["geo"].get("longitude"))

    street_address = str(address.get("streetAddress") or data.get("address") or title)
    postal_code = str(address.get("postalCode") or postcode_from_text(text) or "")
    city = str(address.get("addressLocality") or city_from_text(text) or "")
    house_number = house_number_from_address(street_address)

    if (lat is None or lon is None) and geocode:
        geo = geocode_pdok(
            " ".join(part for part in (street_address, postal_code, city) if part)
        )
        if geo:
            lat, lon = geo

    if price is None or area is None or lat is None or lon is None or area <= 0:
        return None

    listing_id = stable_id(source, url)
    return ScrapedListing(
        id=listing_id,
        source=source,
        city=city or "Onbekend",
        title=clean_title(title),
        latitude=lat,
        longitude=lon,
        area_m2=round(area),
        price=round(price),
        price_per_m2=price / area,
        rooms=rooms_from_text(text) or "?",
        home_type=home_type_from_text(text),
        energy_label=energy_label_from_text(text) or "?",
        postal_code=postal_code,
        house_number=house_number,
        bag_id="",
        pand_id="",
        verblijfsobject_id="",
        url=url,
        scraped_at=datetime.now(UTC).isoformat(),
        enrichment={"scraped": {"url": url}},
    )


def json_ld_objects(soup: BeautifulSoup) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    for script in soup.select('script[type="application/ld+json"]'):
        raw = script.string or script.get_text()
        if not raw.strip():
            continue
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            continue
        objects.extend(flatten_json_ld(payload))
    return objects


def flatten_json_ld(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        return [item for entry in value for item in flatten_json_ld(entry)]
    if isinstance(value, dict) and isinstance(value.get("@graph"), list):
        return [item for entry in value["@graph"] for item in flatten_json_ld(entry)]
    return [value] if isinstance(value, dict) else []


def merge_listing_data(objects: list[dict[str, Any]]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for obj in objects:
        obj_type = obj.get("@type")
        type_text = " ".join(obj_type) if isinstance(obj_type, list) else str(obj_type)
        if any(
            token.lower() in type_text.lower()
            for token in (
                "Product",
                "Offer",
                "Residence",
                "Apartment",
                "House",
                "Place",
            )
        ):
            merged.update(obj)
            offers = obj.get("offers")
            if isinstance(offers, dict):
                merged.update(
                    {key: value for key, value in offers.items() if key not in merged}
                )
    return merged


def first_number(data: dict[str, Any], keys: list[str]) -> float | None:
    for key in keys:
        value = data.get(key)
        if isinstance(value, dict):
            value = value.get("value")
        parsed = number(value)
        if parsed is not None:
            return parsed
    return None


def meta(soup: BeautifulSoup, property_name: str) -> str:
    tag = soup.find("meta", property=property_name) or soup.find(
        "meta", attrs={"name": property_name}
    )
    return str(tag.get("content") or "") if tag else ""


def price_from_text(text: str) -> float | None:
    match = re.search(r"€\s*([0-9][0-9.\s]{3,})(?:,-)?", text)
    return number(match.group(1)) if match else None


def area_from_text(text: str) -> float | None:
    match = re.search(r"([0-9]{2,4})\s*m[²2]", text, re.I)
    return number(match.group(1)) if match else None


def rooms_from_text(text: str) -> int | None:
    match = re.search(r"([0-9]{1,2})\s*(?:kamers|rooms)", text, re.I)
    return int(match.group(1)) if match else None


def postcode_from_text(text: str) -> str | None:
    match = re.search(r"\b([1-9][0-9]{3}\s?[A-Z]{2})\b", text, re.I)
    return match.group(1).upper().replace(" ", "") if match else None


def city_from_text(text: str) -> str | None:
    match = re.search(r"\b(?:in|te)\s+([A-ZÀ-ÿ][A-Za-zÀ-ÿ'\- ]{2,30})\b", text)
    return match.group(1).strip() if match else None


def house_number_from_address(address: str) -> str:
    match = re.search(r"\b([0-9]{1,5}[A-Za-z]?)\b", address)
    return match.group(1) if match else ""


def energy_label_from_text(text: str) -> str | None:
    match = re.search(r"Energielabel\s*([A-G][+]{0,4})", text, re.I)
    return match.group(1).upper() if match else None


def home_type_from_text(text: str) -> str:
    lowered = text.lower()
    for value in (
        "appartement",
        "studio",
        "kamer",
        "tussenwoning",
        "hoekwoning",
        "vrijstaande woning",
        "maisonnette",
    ):
        if value in lowered:
            return value
    return "woning"


def geocode_pdok(query: str) -> tuple[float, float] | None:
    if not query.strip():
        return None
    payload = request_json(
        "https://api.pdok.nl/bzk/locatieserver/search/v3_1/free",
        params={"q": query, "rows": 1, "fl": "centroide_ll"},
        timeout=20,
    )
    docs = payload.get("response", {}).get("docs", [])
    if not docs:
        return None
    point = docs[0].get("centroide_ll", "")
    match = re.search(r"POINT\(([-0-9.]+)\s+([-0-9.]+)\)", point)
    return (float(match.group(2)), float(match.group(1))) if match else None


def clean_title(title: str) -> str:
    return " ".join(title.replace("\n", " ").split())


def stable_id(source: str, url: str) -> str:
    return f"{source}-{hashlib.sha1(url.encode('utf-8')).hexdigest()[:16]}"


def write_scraped_output(
    path: Path, source: str, listings: list[ScrapedListing], append: bool
) -> None:
    existing: dict[str, Any] = {}
    if append and path.exists():
        existing = json.loads(path.read_text(encoding="utf-8"))
    current = existing.get("listings", []) if isinstance(existing, dict) else []
    by_id = {row.get("id"): row for row in current if row.get("id")}
    for listing in listings:
        by_id[listing.id] = asdict(listing)
    payload = {
        "updated_at": datetime.now(UTC).isoformat(),
        "source": source
        if not append
        else ",".join(
            sorted({source, *[str(row.get("source", "")) for row in by_id.values()]})
        ),
        "listings": list(by_id.values()),
    }
    write_json_atomic(path, payload)


def write_checkpoint(
    path: Path, source: str, listings: list[ScrapedListing], append: bool
) -> None:
    """Write current listings to disk atomically; used for mid-scrape checkpoints."""
    write_scraped_output(path, source, listings, append)
