from __future__ import annotations

import json
import math
import os
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[2]
LISTINGS_PATH = ROOT / "static" / "projects" / "housing-heatmap" / "listings.json"
SOURCE_LISTINGS_DIR = ROOT / "static" / "projects" / "housing-heatmap" / "sources"
USER_AGENT = "thaumatorium-housing-heatmap/1.0"


def source_listings_path(source: str) -> Path:
    return SOURCE_LISTINGS_DIR / f"{source}.json"


def load_payload(path: Path = LISTINGS_PATH) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"{path} does not exist; run a listings fetch first")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return {"source": "legacy_array", "listings": payload}
    if not isinstance(payload.get("listings"), list):
        raise ValueError(f"{path} must contain a 'listings' array")
    return payload


def write_payload(payload: dict[str, Any], path: Path = LISTINGS_PATH) -> None:
    payload["updated_at"] = datetime.now(UTC).isoformat()
    write_json_atomic(path, payload)


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    serialized = json.dumps(payload, ensure_ascii=False, indent=2)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
            tmp_file.write(serialized)
            tmp_file.flush()
            os.fsync(tmp_file.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass
        raise


def request_json(
    url: str,
    *,
    params: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 45,
) -> Any:
    merged_headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
    if headers:
        merged_headers.update(headers)
    response = requests.get(url, params=params, headers=merged_headers, timeout=timeout)
    response.raise_for_status()
    return response.json()


def ensure_enrichment(listing: dict[str, Any]) -> dict[str, Any]:
    enrichment = listing.setdefault("enrichment", {})
    if not isinstance(enrichment, dict):
        enrichment = {}
        listing["enrichment"] = enrichment
    return enrichment


def point_bbox(longitude: float, latitude: float, radius_m: float) -> str:
    lat_delta = radius_m / 111_320
    lon_delta = radius_m / (111_320 * max(0.2, math.cos(math.radians(latitude))))
    return ",".join(
        str(value)
        for value in (
            longitude - lon_delta,
            latitude - lat_delta,
            longitude + lon_delta,
            latitude + lat_delta,
        )
    )


def number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(
            str(value).replace("€", "").replace(".", "").replace(",", ".").strip()
        )
    except ValueError:
        return None


def nested(row: dict[str, Any], *keys: str) -> Any:
    value: Any = row
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def compact_properties(
    properties: dict[str, Any], keep: list[str] | None
) -> dict[str, Any]:
    if keep:
        return {key: properties[key] for key in keep if key in properties}
    return {
        key: value
        for key, value in properties.items()
        if value is not None and isinstance(value, str | int | float | bool)
    }
