"""Windows monitor geometry helpers for keeping borderless overlays visible."""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from dataclasses import dataclass


MONITORINFOF_PRIMARY = 1


@dataclass(frozen=True)
class WorkArea:
    left: int
    top: int
    right: int
    bottom: int
    primary: bool = False

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top


class _MONITORINFO(ctypes.Structure):
    _fields_ = (
        ("cbSize", wintypes.DWORD),
        ("rcMonitor", wintypes.RECT),
        ("rcWork", wintypes.RECT),
        ("dwFlags", wintypes.DWORD),
    )


def monitor_work_areas() -> tuple[WorkArea, ...]:
    """Return every active monitor work area, including negative coordinates."""
    try:
        user32 = ctypes.windll.user32
        callback_type = ctypes.WINFUNCTYPE(
            wintypes.BOOL,
            wintypes.HMONITOR,
            wintypes.HDC,
            ctypes.POINTER(wintypes.RECT),
            wintypes.LPARAM,
        )
        areas: list[WorkArea] = []

        def callback(handle, _hdc, _rect, _data):
            info = _MONITORINFO()
            info.cbSize = ctypes.sizeof(info)
            if user32.GetMonitorInfoW(handle, ctypes.byref(info)):
                work = info.rcWork
                areas.append(
                    WorkArea(
                        work.left,
                        work.top,
                        work.right,
                        work.bottom,
                        bool(info.dwFlags & MONITORINFOF_PRIMARY),
                    )
                )
            return True

        callback_ref = callback_type(callback)
        if user32.EnumDisplayMonitors(None, None, callback_ref, 0) and areas:
            return tuple(sorted(areas, key=lambda area: (not area.primary, area.left, area.top)))
    except (AttributeError, OSError, TypeError):
        pass

    try:
        user32 = ctypes.windll.user32
        return (WorkArea(0, 0, user32.GetSystemMetrics(0), user32.GetSystemMetrics(1), True),)
    except (AttributeError, OSError):
        return (WorkArea(0, 0, 1920, 1080, True),)


def primary_work_area(areas: tuple[WorkArea, ...]) -> WorkArea:
    return next((area for area in areas if area.primary), areas[0])


def monitor_topology_signature(areas: tuple[WorkArea, ...]) -> tuple[tuple[int, int, int, int, bool], ...]:
    return tuple((area.left, area.top, area.right, area.bottom, area.primary) for area in areas)


def geometry_position(x: int, y: int) -> str:
    """Format a Tk position correctly for positive and negative monitor coordinates."""
    return f"{int(x):+d}{int(y):+d}"


def clamp_window_position(
    x: int,
    y: int,
    width: int,
    height: int,
    areas: tuple[WorkArea, ...],
    *,
    margin: int = 8,
) -> tuple[int, int]:
    """Keep a window fully visible, moving orphaned windows to the primary display."""
    if not areas:
        return x, y

    width = max(1, int(width))
    height = max(1, int(height))
    center_x = x + width // 2
    center_y = y + height // 2
    target = next(
        (
            area
            for area in areas
            if area.left <= center_x < area.right and area.top <= center_y < area.bottom
        ),
        None,
    )
    if target is None:
        target = primary_work_area(areas)

    min_x = target.left + margin
    min_y = target.top + margin
    max_x = max(min_x, target.right - width - margin)
    max_y = max(min_y, target.bottom - height - margin)
    return max(min_x, min(int(x), max_x)), max(min_y, min(int(y), max_y))


def top_right_position(
    width: int,
    height: int,
    area: WorkArea,
    *,
    horizontal_margin: int = 25,
    vertical_margin: int = 55,
) -> tuple[int, int]:
    x = max(area.left + 8, area.right - int(width) - horizontal_margin)
    y = max(area.top + 8, min(area.top + vertical_margin, area.bottom - int(height) - 8))
    return x, y
