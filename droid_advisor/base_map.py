"""Schematic slot geometry matching the Droid Tycoon v1.28.0 base."""

from __future__ import annotations

import math
from dataclasses import dataclass


DESIGN_WIDTH = 1120
DESIGN_HEIGHT = 720


@dataclass(frozen=True)
class MapArea:
    id: str
    label: str
    subtitle: str
    bounds: tuple[int, int, int, int]
    accent: str


@dataclass(frozen=True)
class MapSlot:
    id: str
    area: str
    label: str
    x: int
    y: int
    preferred_role: str = ""
    floor: int = 0


AREAS = (
    MapArea("fusion", "FUSION LAB", "3 platform spots", (28, 28, 290, 205), "#20e6ea"),
    MapArea("shipyard", "SHIPYARD", "9 astromech work spots", (320, 28, 760, 245), "#9f78ff"),
    MapArea("companions", "COMPANIONS", "2 active slots", (790, 28, 1092, 185), "#f5c445"),
    MapArea("worker_ring", "WORKER FLOOR", "8 circular stations", (28, 260, 475, 690), "#56e49a"),
    MapArea("chip_station", "UPGRADE CHIP STATION", "12th worker position", (480, 260, 695, 365), "#f5c445"),
    MapArea("lounge", "LOUNGE", "13 storage positions", (480, 385, 760, 690), "#32b7ff"),
    MapArea("worker_walkway", "WORKER ROW", "W9-W11", (770, 205, 875, 690), "#56e49a"),
    MapArea("battle", "BATTLE SHIPPING", "5 first floor + 6 second floor", (885, 205, 1092, 690), "#ff5578"),
)


def _ring_slots() -> list[MapSlot]:
    slots = []
    center_x, center_y, radius = 250, 490, 148
    for index in range(8):
        angle = math.radians(-90 + index * 45)
        slots.append(
            MapSlot(
                id=f"worker_ring_{index + 1}",
                area="worker_ring",
                label=f"W{index + 1}",
                x=round(center_x + math.cos(angle) * radius),
                y=round(center_y + math.sin(angle) * radius),
                preferred_role="WORKER",
            )
        )
    return slots


SLOTS = tuple(
    [
        MapSlot("fusion_1", "fusion", "F1", 92, 128),
        MapSlot("fusion_2", "fusion", "F2", 159, 128),
        MapSlot("fusion_3", "fusion", "F3", 226, 128),
        MapSlot("shipyard_1", "shipyard", "A1", 385, 92, "ASTRO"),
        MapSlot("shipyard_2", "shipyard", "A2", 485, 78, "ASTRO"),
        MapSlot("shipyard_3", "shipyard", "A3", 585, 78, "ASTRO"),
        MapSlot("shipyard_4", "shipyard", "A4", 685, 92, "ASTRO"),
        MapSlot("shipyard_5", "shipyard", "A5", 710, 157, "ASTRO"),
        MapSlot("shipyard_6", "shipyard", "A6", 650, 205, "ASTRO"),
        MapSlot("shipyard_7", "shipyard", "A7", 545, 205, "ASTRO"),
        MapSlot("shipyard_8", "shipyard", "A8", 440, 205, "ASTRO"),
        MapSlot("shipyard_9", "shipyard", "A9", 360, 157, "ASTRO"),
        MapSlot("companion_1", "companions", "C1", 900, 120),
        MapSlot("companion_2", "companions", "C2", 1000, 120),
        *_ring_slots(),
        MapSlot("chip_station_1", "chip_station", "CHIP", 588, 325, "WORKER"),
        MapSlot("lounge_1", "lounge", "L1", 520, 450),
        MapSlot("lounge_2", "lounge", "L2", 580, 440),
        MapSlot("lounge_3", "lounge", "L3", 640, 440),
        MapSlot("lounge_4", "lounge", "L4", 700, 450),
        MapSlot("lounge_5", "lounge", "L5", 520, 515),
        MapSlot("lounge_6", "lounge", "L6", 580, 505),
        MapSlot("lounge_7", "lounge", "L7", 640, 505),
        MapSlot("lounge_8", "lounge", "L8", 700, 515),
        MapSlot("lounge_9", "lounge", "L9", 520, 580),
        MapSlot("lounge_10", "lounge", "L10", 580, 570),
        MapSlot("lounge_11", "lounge", "L11", 640, 570),
        MapSlot("lounge_12", "lounge", "L12", 700, 580),
        MapSlot("lounge_13", "lounge", "L13", 610, 640),
        MapSlot("worker_walkway_1", "worker_walkway", "W9", 822, 330, "WORKER"),
        MapSlot("worker_walkway_2", "worker_walkway", "W10", 822, 465, "WORKER"),
        MapSlot("worker_walkway_3", "worker_walkway", "W11", 822, 600, "WORKER"),
        MapSlot("battle_floor_1_1", "battle", "B1", 910, 495, "BATTLE", 1),
        MapSlot("battle_floor_1_2", "battle", "B2", 945, 495, "BATTLE", 1),
        MapSlot("battle_floor_1_3", "battle", "B3", 980, 495, "BATTLE", 1),
        MapSlot("battle_floor_1_4", "battle", "B4", 1015, 495, "BATTLE", 1),
        MapSlot("battle_floor_1_5", "battle", "B5", 1050, 495, "BATTLE", 1),
        MapSlot("battle_floor_2_1", "battle", "U1", 980, 285, "BATTLE", 2),
        MapSlot("battle_floor_2_2", "battle", "U2", 980, 350, "BATTLE", 2),
        MapSlot("battle_floor_2_3", "battle", "U3", 980, 415, "BATTLE", 2),
        MapSlot("battle_floor_2_4", "battle", "U4", 980, 555, "BATTLE", 2),
        MapSlot("battle_floor_2_5", "battle", "U5", 980, 615, "BATTLE", 2),
        MapSlot("battle_floor_2_6", "battle", "U6", 980, 670, "BATTLE", 2),
    ]
)

SLOT_BY_ID = {slot.id: slot for slot in SLOTS}


def slots_for_area(area: str) -> tuple[MapSlot, ...]:
    return tuple(slot for slot in SLOTS if slot.area == area)


def slot_counts() -> dict[str, int]:
    return {area.id: len(slots_for_area(area.id)) for area in AREAS}
