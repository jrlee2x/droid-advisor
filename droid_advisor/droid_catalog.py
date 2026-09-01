"""Unified droid metadata for inventory editing and OCR reconciliation."""

from __future__ import annotations

from dataclasses import dataclass

from .droid_income import ICONIC_DROIDS, INCOME_VARIANTS, STANDARD_DROIDS
from .engine import canonical
from .fusion_recipes import FUSION_INCOME_PER_SECOND, FUSION_RECIPES
from .inventory import normalize_finish


@dataclass(frozen=True)
class DroidMetadata:
    name: str
    role: str
    rarity: str
    kind: str
    perk: str = ""


def _build_catalog() -> dict[str, DroidMetadata]:
    catalog: dict[str, DroidMetadata] = {}
    for item in STANDARD_DROIDS:
        metadata = DroidMetadata(
            name=str(item["name"]),
            role=str(item["role"]),
            rarity=str(item["rarity"]),
            kind=str(item["kind"]),
            perk=str(item.get("perk", "")),
        )
        catalog[canonical(metadata.name)] = metadata
    for item in ICONIC_DROIDS:
        metadata = DroidMetadata(
            name=str(item["name"]),
            role=str(item["role"]),
            rarity=str(item["rarity"]),
            kind=str(item["kind"]),
            perk=str(item.get("perk", "")),
        )
        catalog[canonical(metadata.name)] = metadata
    for recipe in FUSION_RECIPES:
        metadata = DroidMetadata(
            name=str(recipe["output"]),
            role=str(recipe["role"]),
            rarity=str(recipe["rarity"]),
            kind="FUSION",
        )
        catalog[canonical(metadata.name)] = metadata
    return catalog


CATALOG = _build_catalog()


def known_droid_names() -> tuple[str, ...]:
    return tuple(sorted((item.name for item in CATALOG.values()), key=str.casefold))


def droid_metadata(name: str) -> DroidMetadata | None:
    return CATALOG.get(canonical(name))


def resolve_droid_by_rarity(name: str, rarity: str | None) -> str:
    """Use a focused card's rarity to resolve a truncated nested name.

    For example, OCR may retain only MOUSE from SNOW MOUSE. A Mythic badge
    uniquely identifies Snow Mouse, while a Common badge preserves Mouse.
    Ambiguous matches deliberately keep the original OCR result.
    """
    target = canonical(name)
    wanted_rarity = str(rarity or "").upper()
    if not target or not wanted_rarity:
        return name
    matches = [
        item.name
        for item in CATALOG.values()
        if item.rarity == wanted_rarity and target in canonical(item.name)
    ]
    return matches[0] if len(matches) == 1 else name


def income_per_second(name: str, finish: str) -> float | None:
    normalized = normalize_finish(finish)
    variants = ("BASE",) + INCOME_VARIANTS[1:]
    try:
        index = variants.index(normalized)
    except ValueError:
        return None
    target = canonical(name)
    for item in STANDARD_DROIDS:
        if canonical(str(item["name"])) == target:
            value = item["income"][index]
            return float(value) if value is not None else None
    for output, values in FUSION_INCOME_PER_SECOND.items():
        if canonical(output) == target:
            value = values[index]
            return float(value) if value is not None else None
    return None
