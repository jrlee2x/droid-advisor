"""Interactive base-map inventory window for manual and OCR reconciliation."""

from __future__ import annotations

import math
import tkinter as tk
from collections.abc import Callable
from tkinter import messagebox, ttk

from PIL import Image, ImageDraw, ImageFilter, ImageTk

from .aa_map import render_inventory_map
from .aa_ui import ViewportTransform, blend_color, render_orb_badge, render_soft_button_surface
from .base_map import DESIGN_HEIGHT, DESIGN_WIDTH, SLOT_BY_ID, SLOTS, MapSlot
from .droid_catalog import droid_metadata, income_per_second, known_droid_names
from .inventory import InventoryLedger, InventoryUnit, UNASSIGNED
from .qualities import INVENTORY_RARITIES


PALETTE = {
    "window": "#040b1c",
    "panel": "#071a38",
    "panel_alt": "#0c2a53",
    "dock": "#071426",
    "card": "#111d35",
    "card_hover": "#182746",
    "card_selected": "#172b4b",
    "card_shadow": "#020815",
    "chip": "#1a2945",
    "border": "#277fd0",
    "cyan": "#32b7ff",
    "green": "#72f2a0",
    "text": "#f4f8fb",
    "muted": "#91acd0",
    "danger": "#e21d43",
    "floor": "#091327",
    "corridor": "#102847",
}

FINISH_COLORS = {
    "BASE": "#7f91a8",
    "GOLD": "#f5c445",
    "DIAMOND": "#34d8ed",
    "RAINBOW": "#f06be5",
    "BESKAR": "#b9c3d0",
    "GALACTIC": "#8f72ff",
    "STELLAR": "#ffb43b",
}

ROLE_COLORS = {
    "WORKER": "#53f57b",
    "ASTRO": "#a85cff",
    "BATTLE": "#ff4c64",
}

RARITY_COLORS = {
    "COMMON": "#b7bec7",
    "RARE": "#38a9ff",
    "EPIC": "#9a63ff",
    "LEGENDARY": "#ffad24",
    "MYTHIC": "#ff2870",
    "ICONIC": "#ffd36a",
}

FINISHES = ("BASE", "GOLD", "DIAMOND", "RAINBOW", "BESKAR", "GALACTIC", "STELLAR")
DISPLAY_FINISH = {"BASE": "Default"}


def inventory_card_colors(unit: InventoryUnit) -> tuple[str, str, str]:
    """Return finish, role, and rarity accents for one dock card."""
    return (
        FINISH_COLORS.get(unit.finish, PALETTE["cyan"]),
        ROLE_COLORS.get(unit.role, PALETTE["cyan"]),
        RARITY_COLORS.get(unit.rarity, "#62738f"),
    )


def compact_income(value: float | None) -> str:
    if value is None:
        return "INCOME UNKNOWN"
    amount = float(value)
    for threshold, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if abs(amount) >= threshold:
            scaled = amount / threshold
            precision = 0 if abs(scaled) >= 100 else 1
            return f"{scaled:.{precision}f}{suffix}/s"
    return f"{amount:,.0f}/s"


class RoundedActionButton(tk.Canvas):
    """Keyboard-accessible Pillow-rendered action button for the inventory toolbar."""

    def __init__(
        self,
        parent: tk.Misc,
        *,
        text: str,
        command: Callable[[], None],
        color: str,
        foreground: str,
        width: int,
    ) -> None:
        super().__init__(
            parent,
            width=width,
            height=42,
            bg=PALETTE["window"],
            bd=0,
            highlightthickness=0,
            takefocus=True,
            cursor="hand2",
        )
        self.button_text = text
        self.command = command
        self.color = color
        self.foreground = foreground
        self.button_width = width
        self.enabled = True
        self.state_name = "normal"
        self.focused = False
        self._photo: ImageTk.PhotoImage | None = None
        self.bind("<Enter>", lambda _event: self._set_state("hover"))
        self.bind("<Leave>", lambda _event: self._set_state("normal"))
        self.bind("<ButtonPress-1>", self._press)
        self.bind("<ButtonRelease-1>", self._release)
        self.bind("<FocusIn>", lambda _event: self._set_focus(True))
        self.bind("<FocusOut>", lambda _event: self._set_focus(False))
        self.bind("<KeyPress-space>", lambda _event: self._set_state("pressed"))
        self.bind("<KeyRelease-space>", self._keyboard_activate)
        self.bind("<Return>", self._keyboard_activate)
        self._render()

    def _render(self) -> None:
        state = self.state_name if self.enabled else "disabled"
        surface = render_soft_button_surface(
            self.button_width,
            42,
            self.color,
            state,
            focused=self.focused and self.enabled,
        )
        self._photo = ImageTk.PhotoImage(surface)
        self.delete("all")
        self.create_image(0, 0, image=self._photo, anchor="nw")
        foreground = self.foreground if self.enabled else blend_color(self.foreground, PALETTE["muted"], 0.55)
        y = 20 + (1 if state == "pressed" else -1 if state == "hover" else 0)
        self.create_text(
            self.button_width / 2,
            y,
            text=self.button_text,
            fill=foreground,
            font=("Segoe UI Semibold", 9),
        )

    def _set_state(self, state: str) -> None:
        if self.enabled and state != self.state_name:
            self.state_name = state
            self._render()

    def _set_focus(self, focused: bool) -> None:
        self.focused = focused
        self._render()

    def _press(self, _event=None) -> None:
        if self.enabled:
            self.focus_set()
            self._set_state("pressed")

    def _release(self, event) -> None:
        if not self.enabled:
            return
        inside = 0 <= event.x < self.button_width and 0 <= event.y < 42
        self._set_state("hover" if inside else "normal")
        if inside:
            self.command()

    def _keyboard_activate(self, _event=None) -> str:
        if self.enabled:
            self.command()
            self._set_state("normal")
        return "break"

    def set_enabled(self, enabled: bool) -> None:
        enabled = bool(enabled)
        if enabled != self.enabled:
            self.enabled = enabled
            self.configure(cursor="hand2" if enabled else "arrow")
            self.state_name = "normal"
            self._render()


class InventoryMapWindow:
    def __init__(
        self,
        root: tk.Misc,
        ledger: InventoryLedger,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        self.root = root
        self.ledger = ledger
        self.on_change = on_change
        self.selected_unit_id = ""
        self.drag_unit_id = ""
        self.drag_ghost: tk.Toplevel | None = None
        self._canvas_slot_positions: dict[str, tuple[float, float]] = {}
        self._dock_card_bounds: list[tuple[float, float, str]] = []
        self._dock_units: list[InventoryUnit] = []
        self._dock_hover_id = ""
        self._dock_images: list[ImageTk.PhotoImage] = []
        self._map_unit_images: list[ImageTk.PhotoImage] = []
        self._map_background_photo: ImageTk.PhotoImage | None = None
        self._map_background_key: tuple[int, int] | None = None
        self._map_transform = ViewportTransform(1, 1, DESIGN_WIDTH, DESIGN_HEIGHT)
        self._map_resize_after: str | None = None
        self.action_buttons: dict[str, RoundedActionButton] = {}

        self.window = tk.Toplevel(root)
        self.window.withdraw()
        self.window.title("Droid Advisor Base Inventory")
        self.window.geometry("1400x860")
        self.window.minsize(1080, 700)
        self.window.configure(bg=PALETTE["window"])
        self.window.protocol("WM_DELETE_WINDOW", self.hide)
        self._build()

    def _build(self) -> None:
        header = tk.Frame(self.window, bg=PALETTE["window"], padx=18, pady=12)
        header.pack(fill="x")
        heading = tk.Frame(header, bg=PALETTE["window"])
        heading.pack(side="left", fill="x", expand=True)
        tk.Label(
            heading,
            text="BASE INVENTORY",
            bg=PALETTE["window"],
            fg=PALETTE["text"],
            font=("Segoe UI Semibold", 20),
        ).pack(anchor="w")
        tk.Label(
            heading,
            text="Drag droids from the dock onto their physical base positions.",
            bg=PALETTE["window"],
            fg=PALETTE["muted"],
            font=("Segoe UI", 9),
        ).pack(anchor="w")

        for key, text, command, color, foreground, width in (
            ("add", "Add Droid", self.add_dialog, PALETTE["cyan"], "#061018", 104),
            ("edit", "Edit", self.edit_selected, "#174d85", PALETTE["text"], 72),
            ("unassign", "Unassign", self.unassign_selected, "#174d85", PALETTE["text"], 104),
            ("remove", "Remove", self.remove_selected, PALETTE["danger"], PALETTE["text"], 92),
            ("undo", "Undo", self.undo, PALETTE["green"], "#061018", 76),
        ):
            button = RoundedActionButton(
                header,
                text=text,
                command=command,
                color=color,
                foreground=foreground,
                width=width,
            )
            button.pack(side="left", padx=(7, 0))
            self.action_buttons[key] = button

        body = tk.Frame(self.window, bg=PALETTE["window"], padx=14, pady=0)
        body.pack(fill="both", expand=True)

        dock = tk.Frame(
            body,
            width=310,
            bg=PALETTE["dock"],
            highlightbackground="#173b68",
            highlightthickness=1,
        )
        dock.pack(side="left", fill="y", padx=(0, 10))
        dock.pack_propagate(False)

        dock_heading = tk.Frame(dock, bg=PALETTE["dock"], padx=14, pady=0)
        dock_heading.pack(fill="x", pady=(13, 0))
        tk.Label(
            dock_heading,
            text="UNASSIGNED",
            bg=PALETTE["dock"],
            fg=PALETTE["text"],
            font=("Segoe UI Semibold", 12),
        ).pack(side="left")
        self.dock_count_var = tk.StringVar(value="0")
        tk.Label(
            dock_heading,
            textvariable=self.dock_count_var,
            bg=PALETTE["cyan"],
            fg="#03101c",
            font=("Segoe UI Semibold", 9),
            padx=9,
            pady=2,
        ).pack(side="right")
        tk.Label(
            dock,
            text="Drag a card onto its base position",
            bg=PALETTE["dock"],
            fg=PALETTE["muted"],
            justify="left",
            font=("Segoe UI", 8),
            padx=14,
            pady=7,
        ).pack(fill="x")

        rail_frame = tk.Frame(dock, bg=PALETTE["dock"])
        rail_frame.pack(fill="both", expand=True, padx=(6, 5), pady=(1, 7))
        self.dock_canvas = tk.Canvas(
            rail_frame,
            bg=PALETTE["dock"],
            bd=0,
            highlightthickness=0,
            takefocus=True,
        )
        scrollbar = ttk.Scrollbar(rail_frame, orient="vertical", command=self.dock_canvas.yview)
        self.dock_canvas.configure(yscrollcommand=scrollbar.set)
        self.dock_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.dock_canvas.bind("<Configure>", self._dock_configured)
        self.dock_canvas.bind("<ButtonPress-1>", self._start_dock_drag)
        self.dock_canvas.bind("<Motion>", self._dock_motion)
        self.dock_canvas.bind("<Leave>", self._dock_leave)
        self.dock_canvas.bind("<MouseWheel>", self._dock_mousewheel)
        self.dock_canvas.bind("<Up>", lambda _event: self._dock_navigate(-1))
        self.dock_canvas.bind("<Down>", lambda _event: self._dock_navigate(1))
        self.dock_canvas.bind("<Return>", lambda _event: self.edit_selected())

        map_frame = tk.Frame(
            body,
            bg=PALETTE["panel"],
            highlightbackground=PALETTE["border"],
            highlightthickness=1,
        )
        map_frame.pack(side="left", fill="both", expand=True)
        self.canvas = tk.Canvas(
            map_frame,
            bg=PALETTE["floor"],
            bd=0,
            highlightthickness=0,
        )
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Configure>", self._schedule_map_refresh)
        self.canvas.tag_bind("droid-unit", "<ButtonPress-1>", self._start_canvas_drag)

        footer = tk.Frame(self.window, bg=PALETTE["panel_alt"], padx=14, pady=9)
        footer.pack(fill="x", padx=14, pady=(0, 12))
        self.summary_var = tk.StringVar(value="0 droids")
        self.detail_var = tk.StringVar(value="Select a droid to view details.")
        tk.Label(
            footer,
            textvariable=self.summary_var,
            bg=PALETTE["panel_alt"],
            fg=PALETTE["green"],
            font=("Segoe UI Semibold", 10),
        ).pack(side="left")
        tk.Label(
            footer,
            textvariable=self.detail_var,
            bg=PALETTE["panel_alt"],
            fg=PALETTE["text"],
            font=("Segoe UI", 9),
            anchor="e",
        ).pack(side="right", fill="x", expand=True)

        self.window.bind("<B1-Motion>", self._drag_motion)
        self.window.bind("<ButtonRelease-1>", self._drag_release)
        self.window.bind("<Escape>", lambda _event: self._cancel_drag())
        self.window.bind("<Delete>", lambda _event: self.remove_selected())
        self.window.bind("<Control-z>", lambda _event: self.undo())

    def show(self) -> None:
        self.refresh()
        self.window.attributes("-topmost", True)
        self.window.deiconify()
        self.window.lift()
        self.window.focus_force()
        self.window.after(350, lambda: self.window.attributes("-topmost", False))

    def hide(self) -> None:
        self._cancel_drag()
        self.window.withdraw()

    def refresh(self) -> None:
        if not self.window.winfo_exists():
            return
        units = self.ledger.list_units()
        self._refresh_dock(units)
        self._draw_map(units)
        assigned = sum(1 for unit in units if unit.slot in SLOT_BY_ID)
        pending = len(units) - assigned
        income = sum(unit.income_per_second or 0 for unit in units)
        income_text = f"{income:,.0f}/s" if income else "income pending"
        self.summary_var.set(f"{len(units)} droids  |  {assigned} placed  |  {pending} unassigned  |  {income_text}")
        self._show_selected_detail()
        selected_exists = bool(self.selected_unit_id and self.ledger.unit(self.selected_unit_id))
        for key in ("edit", "unassign", "remove"):
            self.action_buttons[key].set_enabled(selected_exists)
        self.action_buttons["undo"].set_enabled(any(not event.undone_at for event in self.ledger.events))

    def _schedule_map_refresh(self, _event=None) -> None:
        if self._map_resize_after:
            self.window.after_cancel(self._map_resize_after)
        self._map_resize_after = self.window.after(80, self._finish_map_resize)

    def _finish_map_resize(self) -> None:
        self._map_resize_after = None
        self._draw_map(self.ledger.list_units())

    def _refresh_dock(self, units: list[InventoryUnit]) -> None:
        top_fraction = self.dock_canvas.yview()[0] if self.dock_canvas.find_all() else 0.0
        self._dock_units = [unit for unit in units if unit.slot not in SLOT_BY_ID]
        self.dock_count_var.set(str(len(self._dock_units)))
        self.dock_canvas.delete("all")
        self._dock_images = []
        self._dock_card_bounds = []

        width = max(270, self.dock_canvas.winfo_width())
        if not self._dock_units:
            self._draw_empty_dock(width)
            self.dock_canvas.configure(scrollregion=(0, 0, width, 220))
            self.dock_canvas.yview_moveto(0)
            return

        y = 8
        for unit in self._dock_units:
            self._draw_dock_card(unit, 7, y, width - 15, y + 88)
            self._dock_card_bounds.append((y, y + 88, unit.id))
            y += 98
        self.dock_canvas.configure(scrollregion=(0, 0, width, y))
        if top_fraction:
            self.dock_canvas.yview_moveto(top_fraction)

    @staticmethod
    def _round_rect(
        canvas: tk.Canvas,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        radius: float,
        **options,
    ):
        radius = min(radius, (x2 - x1) / 2, (y2 - y1) / 2)
        points = (
            x1 + radius, y1, x2 - radius, y1, x2, y1, x2, y1 + radius,
            x2, y2 - radius, x2, y2, x2 - radius, y2, x1 + radius, y2,
            x1, y2, x1, y2 - radius, x1, y1 + radius, x1, y1,
        )
        return canvas.create_polygon(points, smooth=True, splinesteps=24, **options)

    def _draw_pill(
        self,
        x: float,
        y: float,
        text: str,
        fill: str,
        foreground: str = "#ffffff",
        *,
        tag: str,
    ) -> float:
        width = max(46, 16 + len(text) * 6.2)
        self._round_rect(
            self.dock_canvas,
            x,
            y,
            x + width,
            y + 20,
            8,
            fill=fill,
            outline="",
            tags=("dock-card", tag),
        )
        self.dock_canvas.create_text(
            x + width / 2,
            y + 10,
            text=text,
            fill=foreground,
            font=("Segoe UI Semibold", 7),
            tags=("dock-card", tag),
        )
        return width

    def _draw_dock_card(
        self,
        unit: InventoryUnit,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
    ) -> None:
        selected = unit.id == self.selected_unit_id
        hovered = unit.id == self._dock_hover_id
        finish_color, role_color, rarity_color = inventory_card_colors(unit)
        tag = f"dock-unit:{unit.id}"
        if selected:
            surface = PALETTE["card_selected"]
        elif hovered:
            surface = PALETTE["card_hover"]
        else:
            surface = PALETTE["card"]

        self._round_rect(
            self.dock_canvas,
            x1 + 2,
            y1 + 4,
            x2 + 2,
            y2 + 4,
            12,
            fill=PALETTE["card_shadow"],
            outline="",
            tags=("dock-card", tag),
        )
        if selected:
            self._round_rect(
                self.dock_canvas,
                x1 - 1,
                y1 - 1,
                x2 + 1,
                y2 + 1,
                13,
                fill=surface,
                outline=PALETTE["cyan"],
                width=3,
                tags=("dock-card", tag),
            )
        else:
            self._round_rect(
                self.dock_canvas,
                x1,
                y1,
                x2,
                y2,
                12,
                fill=surface,
                outline=finish_color,
                width=2 if hovered else 1,
                tags=("dock-card", tag),
            )
        self.dock_canvas.create_line(
            x1 + 13,
            y1 + 2,
            x2 - 13,
            y1 + 2,
            fill=finish_color,
            width=3,
            capstyle="round",
            tags=("dock-card", tag),
        )

        medallion_x, medallion_y = x1 + 31, y1 + 31
        medallion = ImageTk.PhotoImage(
            render_orb_badge(42, role_color, "hover" if hovered else "normal", selected=selected)
        )
        self._dock_images.append(medallion)
        self.dock_canvas.create_image(
            medallion_x,
            medallion_y,
            image=medallion,
            tags=("dock-card", tag),
        )
        role_mark = {"WORKER": "W", "ASTRO": "A", "BATTLE": "B"}.get(unit.role, "?")
        self.dock_canvas.create_text(
            medallion_x,
            medallion_y,
            text=role_mark,
            fill=PALETTE["text"],
            font=("Segoe UI Semibold", 13),
            tags=("dock-card", tag),
        )

        self.dock_canvas.create_text(
            x1 + 55,
            y1 + 19,
            text=unit.droid,
            fill=PALETTE["text"],
            font=("Segoe UI Semibold", 10),
            anchor="w",
            width=max(80, x2 - x1 - 116),
            tags=("dock-card", tag),
        )
        finish = DISPLAY_FINISH.get(unit.finish, unit.finish.title()).upper()
        finish_width = self._draw_pill(
            x1 + 55,
            y1 + 35,
            finish,
            PALETTE["chip"],
            finish_color,
            tag=tag,
        )
        if unit.rarity:
            rarity_foreground = (
                "#061018" if unit.rarity in {"COMMON", "LEGENDARY", "ICONIC"} else "#ffffff"
            )
            self._draw_pill(
                x1 + 61 + finish_width,
                y1 + 35,
                unit.rarity,
                rarity_color,
                rarity_foreground,
                tag=tag,
            )

        role_label = f"{unit.role.title() or 'Unknown'} droid"
        self.dock_canvas.create_text(
            x1 + 13,
            y2 - 13,
            text=role_label.upper(),
            fill=role_color,
            font=("Segoe UI Semibold", 7),
            anchor="w",
            tags=("dock-card", tag),
        )
        self.dock_canvas.create_text(
            x2 - 13,
            y2 - 13,
            text=compact_income(unit.income_per_second),
            fill=PALETTE["green"],
            font=("Segoe UI Semibold", 8),
            anchor="e",
            tags=("dock-card", tag),
        )

    def _draw_empty_dock(self, width: float) -> None:
        self._round_rect(
            self.dock_canvas,
            10,
            13,
            width - 10,
            178,
            14,
            fill="#09182d",
            outline="#365477",
            width=2,
            dash=(5, 4),
        )
        self.dock_canvas.create_oval(
            width / 2 - 23,
            40,
            width / 2 + 23,
            86,
            fill=PALETTE["chip"],
            outline=PALETTE["cyan"],
            width=2,
        )
        self.dock_canvas.create_text(
            width / 2,
            63,
            text="+",
            fill=PALETTE["cyan"],
            font=("Segoe UI Semibold", 20),
        )
        self.dock_canvas.create_text(
            width / 2,
            111,
            text="YOUR DOCK IS CLEAR",
            fill=PALETTE["text"],
            font=("Segoe UI Semibold", 10),
        )
        self.dock_canvas.create_text(
            width / 2,
            137,
            text="New droids appear here before placement",
            fill=PALETTE["muted"],
            font=("Segoe UI", 8),
            width=220,
        )

    def _dock_configured(self, _event=None) -> None:
        self._refresh_dock(self.ledger.list_units())

    def _dock_unit_at(self, event_y: float) -> str:
        y = self.dock_canvas.canvasy(event_y)
        return next(
            (unit_id for top, bottom, unit_id in self._dock_card_bounds if top <= y <= bottom),
            "",
        )

    def _dock_motion(self, event) -> None:
        hovered = self._dock_unit_at(event.y)
        if hovered != self._dock_hover_id:
            self._dock_hover_id = hovered
            self._refresh_dock(self.ledger.list_units())

    def _dock_leave(self, _event=None) -> None:
        if self._dock_hover_id:
            self._dock_hover_id = ""
            self._refresh_dock(self.ledger.list_units())

    def _dock_mousewheel(self, event) -> str:
        self.dock_canvas.yview_scroll(int(-event.delta / 120), "units")
        return "break"

    def _dock_navigate(self, direction: int) -> str:
        if not self._dock_units:
            return "break"
        ids = [unit.id for unit in self._dock_units]
        try:
            index = ids.index(self.selected_unit_id) + direction
        except ValueError:
            index = 0 if direction > 0 else len(ids) - 1
        index = max(0, min(len(ids) - 1, index))
        self.selected_unit_id = ids[index]
        self._show_selected_detail()
        self._refresh_dock(self.ledger.list_units())
        total = max(1, len(ids) * 98)
        self.dock_canvas.yview_moveto(max(0.0, (index * 98 - 8) / total))
        return "break"

    def _draw_map(self, units: list[InventoryUnit]) -> None:
        self.canvas.delete("all")
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        if width < 100 or height < 100:
            self._map_transform = ViewportTransform(width, height, DESIGN_WIDTH, DESIGN_HEIGHT, padding=0)
            self._canvas_slot_positions = {}
            return
        background, transform, positions = render_inventory_map(width, height)
        self._map_transform = transform
        scale = transform.scale
        self._canvas_slot_positions = positions
        self._map_unit_images = []
        background_key = (width, height)
        if background_key != self._map_background_key or self._map_background_photo is None:
            self._map_background_photo = ImageTk.PhotoImage(background)
            self._map_background_key = background_key
        self.canvas.create_image(0, 0, image=self._map_background_photo, anchor="nw")

        occupied = {unit.slot: unit for unit in units if unit.slot in SLOT_BY_ID}
        for slot in SLOTS:
            x, y = positions[slot.id]
            unit = occupied.get(slot.id)
            if unit is not None:
                self._draw_unit(unit, slot, x, y, scale)

    def _draw_unit(self, unit: InventoryUnit, slot: MapSlot, x: float, y: float, scale: float) -> None:
        width = max(42, round(62 * scale))
        height = max(28, round(38 * scale))
        selected = unit.id == self.selected_unit_id
        tags = ("droid-unit", f"unit:{unit.id}", f"slot:{slot.id}")
        border = "#ffffff" if selected else FINISH_COLORS.get(unit.finish, PALETTE["cyan"])
        role_mismatch = bool(slot.preferred_role and unit.role and slot.preferred_role != unit.role)
        fill = "#3a1825" if role_mismatch else PALETTE["panel_alt"]
        unit_surface = ImageTk.PhotoImage(
            self._render_unit_surface(width, height, fill, border, selected)
        )
        self._map_unit_images.append(unit_surface)
        self.canvas.create_image(x, y, image=unit_surface, tags=tags)
        label = unit.droid if len(unit.droid) <= 9 else unit.droid[:8] + "…"
        self.canvas.create_text(
            x,
            y - 4 * scale,
            text=label,
            fill=PALETTE["text"],
            font=("Segoe UI Semibold", max(6, int(7 * scale))),
            tags=tags,
        )
        finish = DISPLAY_FINISH.get(unit.finish, unit.finish.title())
        self.canvas.create_text(
            x,
            y + 8 * scale,
            text=finish,
            fill=FINISH_COLORS.get(unit.finish, PALETTE["muted"]),
            font=("Segoe UI", max(6, int(6 * scale))),
            tags=tags,
        )

    @staticmethod
    def _render_unit_surface(
        width: int,
        height: int,
        fill: str,
        border: str,
        selected: bool,
    ) -> Image.Image:
        aa = 4
        source_width, source_height = width * aa, height * aa
        image = Image.new("RGBA", (source_width, source_height), (0, 0, 0, 0))
        bounds = (3 * aa, 2 * aa, source_width - 3 * aa, source_height - 5 * aa)
        radius = min(12 * aa, (bounds[3] - bounds[1]) // 2)

        shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            (bounds[0], bounds[1] + 3 * aa, bounds[2], bounds[3] + 3 * aa),
            radius=radius,
            fill=(0, 4, 15, 210),
        )
        image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(2 * aa)))
        draw = ImageDraw.Draw(image, "RGBA")
        draw.rounded_rectangle(
            bounds,
            radius=radius,
            fill=fill,
            outline=border,
            width=(3 if selected else 2) * aa,
        )
        inset = 3 * aa
        draw.arc(
            (bounds[0] + inset, bounds[1] + inset, bounds[2] - inset, bounds[3] - inset),
            190,
            350,
            fill=(255, 255, 255, 80),
            width=aa,
        )
        if selected:
            draw.rounded_rectangle(
                (aa, aa, source_width - aa, source_height - aa),
                radius=radius + aa,
                outline="#73d9ff",
                width=2 * aa,
            )
        return image.resize((width, height), Image.Resampling.LANCZOS)

    def _start_dock_drag(self, event) -> None:
        unit_id = self._dock_unit_at(event.y)
        if unit_id:
            self.dock_canvas.focus_set()
            self.selected_unit_id = unit_id
            self._show_selected_detail()
            self._refresh_dock(self.ledger.list_units())
            self._begin_drag(unit_id, event.x_root, event.y_root)

    def _start_canvas_drag(self, event) -> None:
        tags = self.canvas.gettags("current")
        unit_tag = next((tag for tag in tags if tag.startswith("unit:")), "")
        if not unit_tag:
            return
        unit_id = unit_tag.split(":", 1)[1]
        self.selected_unit_id = unit_id
        self._begin_drag(unit_id, event.x_root, event.y_root)
        self.refresh()

    def _begin_drag(self, unit_id: str, x_root: int, y_root: int) -> None:
        self._cancel_drag()
        unit = self.ledger.unit(unit_id)
        if unit is None:
            return
        self.drag_unit_id = unit_id
        self.drag_ghost = tk.Toplevel(self.window)
        self.drag_ghost.overrideredirect(True)
        self.drag_ghost.attributes("-topmost", True)
        tk.Label(
            self.drag_ghost,
            text=f"{unit.droid}  {DISPLAY_FINISH.get(unit.finish, unit.finish.title())}",
            bg=PALETTE["panel_alt"],
            fg=PALETTE["text"],
            highlightbackground=FINISH_COLORS.get(unit.finish, PALETTE["cyan"]),
            highlightthickness=2,
            padx=8,
            pady=5,
            font=("Segoe UI Semibold", 8),
        ).pack()
        self.drag_ghost.geometry(f"+{x_root + 12}+{y_root + 12}")

    def _drag_motion(self, event) -> None:
        if self.drag_ghost:
            self.drag_ghost.geometry(f"+{event.x_root + 12}+{event.y_root + 12}")

    def _drag_release(self, event) -> None:
        if not self.drag_unit_id:
            return
        unit_id = self.drag_unit_id
        canvas_x = event.x_root - self.canvas.winfo_rootx()
        canvas_y = event.y_root - self.canvas.winfo_rooty()
        changed = False
        if 0 <= canvas_x <= self.canvas.winfo_width() and 0 <= canvas_y <= self.canvas.winfo_height():
            target = self._nearest_slot(canvas_x, canvas_y)
            if target:
                self.ledger.move_unit(unit_id, target.area, target.id, source="manual-map")
                changed = True
        else:
            dock_x = event.x_root - self.dock_canvas.winfo_rootx()
            dock_y = event.y_root - self.dock_canvas.winfo_rooty()
            if 0 <= dock_x <= self.dock_canvas.winfo_width() and 0 <= dock_y <= self.dock_canvas.winfo_height():
                self.ledger.move_unit(unit_id, UNASSIGNED, source="manual-map")
                changed = True
        self._cancel_drag()
        if changed:
            self._changed()
        self.refresh()

    def _nearest_slot(self, x: float, y: float) -> MapSlot | None:
        if not self._canvas_slot_positions:
            return None
        slot_id, distance = min(
            (
                (slot_id, math.hypot(x - position[0], y - position[1]))
                for slot_id, position in self._canvas_slot_positions.items()
            ),
            key=lambda item: item[1],
        )
        threshold = max(34, self._map_transform.scale * 48)
        return SLOT_BY_ID[slot_id] if distance <= threshold else None

    def _cancel_drag(self) -> None:
        self.drag_unit_id = ""
        if self.drag_ghost:
            try:
                self.drag_ghost.destroy()
            except tk.TclError:
                pass
        self.drag_ghost = None

    def add_dialog(self) -> None:
        self._unit_dialog()

    def edit_selected(self) -> None:
        unit = self.ledger.unit(self.selected_unit_id) if self.selected_unit_id else None
        if unit is None:
            messagebox.showinfo("Base Inventory", "Select a droid first.", parent=self.window)
            return
        self._unit_dialog(unit)

    def _unit_dialog(self, unit: InventoryUnit | None = None) -> None:
        dialog = tk.Toplevel(self.window)
        dialog.title("Edit Droid" if unit else "Add Droid")
        dialog.configure(bg=PALETTE["window"])
        dialog.resizable(False, False)
        dialog.transient(self.window)
        dialog.grab_set()

        name_var = tk.StringVar(value=unit.droid if unit else "")
        finish_var = tk.StringVar(value=unit.finish if unit else "BASE")
        rarity_var = tk.StringVar(value=unit.rarity if unit else "")
        role_var = tk.StringVar(value=unit.role if unit else "")
        quantity_var = tk.IntVar(value=1)

        form = tk.Frame(dialog, bg=PALETTE["panel"], padx=18, pady=16)
        form.pack(fill="both", expand=True, padx=12, pady=12)
        fields = (
            ("Droid", name_var, known_droid_names(), False),
            ("Finish", finish_var, FINISHES, True),
            ("Rarity", rarity_var, ("",) + INVENTORY_RARITIES, True),
            ("Type", role_var, ("", "WORKER", "ASTRO", "BATTLE"), True),
        )
        boxes = []
        for row, (label, variable, values, readonly) in enumerate(fields):
            tk.Label(
                form,
                text=label,
                bg=PALETTE["panel"],
                fg=PALETTE["muted"],
                font=("Segoe UI", 9),
            ).grid(row=row, column=0, sticky="w", padx=(0, 10), pady=6)
            box = ttk.Combobox(
                form,
                textvariable=variable,
                values=values,
                state="readonly" if readonly else "normal",
                width=28,
            )
            box.grid(row=row, column=1, sticky="ew", pady=6)
            boxes.append(box)
        iconic_hint = tk.StringVar()
        tk.Label(
            form,
            textvariable=iconic_hint,
            bg=PALETTE["panel"],
            fg=RARITY_COLORS["ICONIC"],
            font=("Segoe UI Semibold", 9),
            anchor="w",
            justify="left",
            wraplength=260,
        ).grid(row=4, column=0, columnspan=2, sticky="ew", pady=(3, 5))

        if not unit:
            tk.Label(
                form,
                text="Quantity",
                bg=PALETTE["panel"],
                fg=PALETTE["muted"],
                font=("Segoe UI", 9),
            ).grid(row=5, column=0, sticky="w", padx=(0, 10), pady=6)
            ttk.Spinbox(form, from_=1, to=99, textvariable=quantity_var, width=8).grid(
                row=5, column=1, sticky="w", pady=6
            )

        def name_changed(_event=None) -> None:
            metadata = droid_metadata(name_var.get())
            if metadata:
                role_var.set(metadata.role)
                rarity_var.set(metadata.rarity)
                if metadata.kind == "ICONIC":
                    finish_var.set("BASE")
                    iconic_hint.set(f"ICONIC DROID  •  {metadata.perk}")
                else:
                    iconic_hint.set("")
            else:
                iconic_hint.set("")

        boxes[0].bind("<<ComboboxSelected>>", name_changed)
        boxes[0].bind("<FocusOut>", name_changed)
        name_changed()

        def save() -> None:
            name = name_var.get().strip()
            if not name:
                messagebox.showerror("Base Inventory", "Choose or enter a droid name.", parent=dialog)
                return
            finish = finish_var.get()
            rarity = rarity_var.get()
            role = role_var.get()
            income = income_per_second(name, finish)
            metadata = droid_metadata(name)
            perk = metadata.perk if metadata and metadata.kind == "ICONIC" else (unit.perk if unit else "")
            try:
                if unit:
                    self.ledger.update_unit(
                        unit.id,
                        droid=name,
                        finish=finish,
                        rarity=rarity,
                        role=role,
                        income_per_second=income,
                        perk=perk,
                        source="manual-map",
                    )
                    self.selected_unit_id = unit.id
                else:
                    for _ in range(max(1, int(quantity_var.get()))):
                        added = self.ledger.add_unit(
                            name,
                            finish,
                            rarity=rarity,
                            role=role,
                            income_per_second=income,
                            perk=perk,
                            source="manual-map",
                        )
                        self.selected_unit_id = added.id
            except (TypeError, ValueError) as exc:
                messagebox.showerror("Base Inventory", str(exc), parent=dialog)
                return
            dialog.destroy()
            self._changed()
            self.refresh()

        buttons = tk.Frame(dialog, bg=PALETTE["window"], padx=12, pady=0)
        buttons.pack(fill="x")
        tk.Button(
            buttons,
            text="CANCEL",
            command=dialog.destroy,
            bg=PALETTE["panel_alt"],
            fg=PALETTE["text"],
            relief="flat",
            padx=14,
            pady=7,
        ).pack(side="right")
        tk.Button(
            buttons,
            text="SAVE",
            command=save,
            bg=PALETTE["cyan"],
            fg="#061018",
            relief="flat",
            padx=16,
            pady=7,
        ).pack(side="right", padx=(0, 8))
        dialog.update_idletasks()
        dialog.geometry(
            f"+{self.window.winfo_rootx() + 120}+{self.window.winfo_rooty() + 100}"
        )
        boxes[0].focus_set()

    def unassign_selected(self) -> None:
        if not self.selected_unit_id or self.ledger.unit(self.selected_unit_id) is None:
            messagebox.showinfo("Base Inventory", "Select a droid first.", parent=self.window)
            return
        self.ledger.move_unit(self.selected_unit_id, UNASSIGNED, source="manual-map")
        self._changed()
        self.refresh()

    def remove_selected(self) -> None:
        unit = self.ledger.unit(self.selected_unit_id) if self.selected_unit_id else None
        if unit is None:
            messagebox.showinfo("Base Inventory", "Select a droid first.", parent=self.window)
            return
        if not messagebox.askyesno(
            "Remove Droid",
            f"Remove {unit.droid} {DISPLAY_FINISH.get(unit.finish, unit.finish.title())} from the tracker?",
            parent=self.window,
        ):
            return
        self.ledger.remove_unit(unit.id, source="manual-map", reason="manual reconciliation")
        self.selected_unit_id = ""
        self._changed()
        self.refresh()

    def undo(self) -> None:
        event = self.ledger.undo_last()
        if event is None:
            self.detail_var.set("Nothing to undo.")
            return
        self.selected_unit_id = ""
        self._changed()
        self.refresh()
        self.detail_var.set(f"Undid {event.action}.")

    def _show_selected_detail(self) -> None:
        unit = self.ledger.unit(self.selected_unit_id) if self.selected_unit_id else None
        if unit is None:
            self.detail_var.set("Select a droid to view details.")
            return
        finish = DISPLAY_FINISH.get(unit.finish, unit.finish.title())
        location = SLOT_BY_ID[unit.slot].label if unit.slot in SLOT_BY_ID else "Unassigned"
        income = f"{unit.income_per_second:,.0f}/s" if unit.income_per_second is not None else "income unknown"
        self.detail_var.set(
            f"{unit.droid}  |  {finish} {unit.rarity.title()}  |  "
            f"{unit.role.title() or 'Unknown type'}  |  {income}  |  {location}"
        )

    def _changed(self) -> None:
        if self.on_change:
            self.on_change()
