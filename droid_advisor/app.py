"""Always-on Windows tray application for passive sell/keep advice."""

from __future__ import annotations

import json
import os
import ctypes
from ctypes import wintypes
from pathlib import Path
import queue
import sys
import threading
import time
import tkinter as tk
from tkinter import ttk

from PIL import Image, ImageDraw
import pystray
from pynput import keyboard

from . import __version__
from .cycles import CYCLES
from .engine import advise, detect_cycle
from .vision import (
    OfflineOcr,
    blueprint_details,
    blueprint_is_visible,
    capture_game,
    panel_is_open,
    rebirth_rank,
    rebirth_view_is_open,
    high_value_spawn,
    selected_droid,
    visible_droids,
)


APP_DIR = Path(os.environ.get("APPDATA", Path.home())) / "DroidAdvisor"
CONFIG_PATH = APP_DIR / "config.json"
DEFAULTS = {
    "cycle": 1,
    "completed_rebirth": 0,
    "paused": False,
    "interval_seconds": 1.25,
    "requirements_overlay_visible": True,
    "requirements_overlay_x": -1,
    "requirements_overlay_y": 55,
    "spawn_alerts_enabled": True,
}


def resource_path(*parts: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base.joinpath(*parts)


def load_config() -> dict:
    try:
        return {**DEFAULTS, **json.loads(CONFIG_PATH.read_text(encoding="utf-8"))}
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return dict(DEFAULTS)


def save_config(config: dict) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(config, indent=2), encoding="utf-8")


class DroidAdvisorApp:
    def __init__(self) -> None:
        self.config = load_config()
        self.events: queue.Queue[tuple[str, object]] = queue.Queue()
        self.stop_event = threading.Event()
        self.root = tk.Tk()
        self.root.title("Droid Advisor")
        self.root.geometry("460x285")
        self.root.protocol("WM_DELETE_WINDOW", self.hide_settings)
        self._build_settings()
        self._build_overlay()
        self._build_requirements_overlay()
        self._build_spawn_alert()
        self.tray = pystray.Icon("droid-advisor", self._tray_image(), "Droid Advisor", self._tray_menu())
        self.listener = keyboard.GlobalHotKeys({
            "<ctrl>+<shift>+d": self.toggle_pause,
            "<ctrl>+<shift>+r": lambda: self.events.put(("requirements_toggle", None)),
        })
        self.worker = threading.Thread(target=self._monitor, name="droid-monitor", daemon=True)
        self.last_signature = None
        self.pending_signature = None
        self.pending_count = 0
        self.last_blueprint_signature = None
        self.pending_blueprint_signature = None
        self.pending_blueprint_count = 0
        self.last_spawn_signature = None

    def _build_settings(self) -> None:
        frame = ttk.Frame(self.root, padding=18)
        frame.pack(fill="both", expand=True)
        ttk.Label(frame, text=f"Droid Advisor v{__version__}", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        ttk.Label(frame, text="Passive rebirth-cycle sell guidance").pack(anchor="w", pady=(0, 15))

        controls = ttk.Frame(frame)
        controls.pack(fill="x")
        ttk.Label(controls, text="Rebirth cycle:").grid(row=0, column=0, sticky="w", pady=4)
        self.cycle_var = tk.IntVar(value=int(self.config["cycle"]))
        cycle_box = ttk.Combobox(controls, state="readonly", width=9, values=(1, 2, 3, 4), textvariable=self.cycle_var)
        cycle_box.grid(row=0, column=1, sticky="w", padx=10)
        cycle_box.bind("<<ComboboxSelected>>", lambda _: self._settings_changed())

        ttk.Label(controls, text="Rebirths completed:").grid(row=1, column=0, sticky="w", pady=4)
        self.rb_var = tk.IntVar(value=int(self.config["completed_rebirth"]))
        rb_spin = ttk.Spinbox(controls, from_=0, to=27, width=7, textvariable=self.rb_var, command=self._settings_changed)
        rb_spin.grid(row=1, column=1, sticky="w", padx=10)

        self.spawn_alert_var = tk.BooleanVar(value=bool(self.config["spawn_alerts_enabled"]))
        ttk.Checkbutton(
            controls, text="High-value conveyor alerts", variable=self.spawn_alert_var,
            command=self._settings_changed,
        ).grid(row=2, column=0, columnspan=2, sticky="w", pady=(7, 0))

        initial_state = "Paused" if self.config["paused"] else "Monitoring"
        self.status_var = tk.StringVar(
            value=f"{initial_state} | RBC{self.config['cycle']}, working on RB{int(self.config['completed_rebirth']) + 1}"
        )
        ttk.Label(frame, textvariable=self.status_var, font=("Segoe UI", 11, "bold")).pack(anchor="w", pady=(16, 2))
        ttk.Label(frame, text="Ctrl+Shift+D pauses/resumes monitoring. Ctrl+Shift+R toggles targets.\nCycle and level update automatically from View Rebirth when uniquely matched.").pack(anchor="w")

    def _build_overlay(self) -> None:
        self.overlay = tk.Toplevel(self.root)
        self.overlay.withdraw()
        self.overlay.overrideredirect(True)
        self.overlay.attributes("-topmost", True)
        self.overlay.attributes("-alpha", 0.93)
        self.overlay_label = tk.Label(
            self.overlay, text="", fg="white", bg="#20252b", padx=22, pady=13,
            font=("Segoe UI", 15, "bold"), relief="solid", borderwidth=2,
        )
        self.overlay_label.pack()
        self.overlay_after = None

    def _build_requirements_overlay(self) -> None:
        self.requirements_overlay = tk.Toplevel(self.root)
        self.requirements_overlay.overrideredirect(True)
        self.requirements_overlay.attributes("-topmost", True)
        self.requirements_overlay.attributes("-alpha", 0.94)
        self.requirements_frame = tk.Frame(self.requirements_overlay, bg="#111820", bd=2, relief="solid")
        self.requirements_frame.pack(fill="both", expand=True)
        self.requirements_photos = []
        self.drag_origin = None
        for widget in (self.requirements_overlay, self.requirements_frame):
            widget.bind("<ButtonPress-1>", self._requirements_drag_start)
            widget.bind("<B1-Motion>", self._requirements_drag_move)
            widget.bind("<ButtonRelease-1>", self._requirements_drag_end)
        self.render_requirements_overlay()
        self.requirements_overlay.update_idletasks()
        x = int(self.config["requirements_overlay_x"])
        if x < 0:
            x = self.requirements_overlay.winfo_screenwidth() - self.requirements_overlay.winfo_reqwidth() - 25
        y = int(self.config["requirements_overlay_y"])
        self.requirements_overlay.geometry(f"+{x}+{y}")
        if not self.config["requirements_overlay_visible"]:
            self.requirements_overlay.withdraw()

    def _build_spawn_alert(self) -> None:
        self.spawn_alert = tk.Toplevel(self.root)
        self.spawn_alert.withdraw()
        self.spawn_alert.overrideredirect(True)
        self.spawn_alert.attributes("-topmost", True)
        self.spawn_alert.attributes("-alpha", 0.96)
        self.spawn_alert_label = tk.Label(
            self.spawn_alert, text="", fg="white", bg="#b00020", padx=45, pady=32,
            font=("Segoe UI", 34, "bold"), relief="solid", borderwidth=7,
        )
        self.spawn_alert_label.pack()
        self.spawn_alert_jobs = []

    def show_spawn_alert(self, quality: str, rarity: str) -> None:
        for job in self.spawn_alert_jobs:
            try:
                self.spawn_alert.after_cancel(job)
            except tk.TclError:
                pass
        self.spawn_alert_jobs.clear()
        self.spawn_alert_label.configure(text=f"{quality} {rarity}\nAT THE SANDCRAWLER")
        self.spawn_alert.update_idletasks()
        width, height = self.spawn_alert.winfo_reqwidth(), self.spawn_alert.winfo_reqheight()
        x = (self.spawn_alert.winfo_screenwidth() - width) // 2
        y = int(self.spawn_alert.winfo_screenheight() * 0.16)
        self.spawn_alert.geometry(f"+{x}+{y}")
        self.spawn_alert.deiconify()
        colors = ("#b00020", "#ff7a00", "#6f00ff", "#d00000")
        for index in range(12):
            self.spawn_alert_jobs.append(
                self.spawn_alert.after(index * 250, lambda c=colors[index % len(colors)]: self.spawn_alert_label.configure(bg=c))
            )
        self.spawn_alert_jobs.append(self.spawn_alert.after(5000, self.spawn_alert.withdraw))

    def _requirements_drag_start(self, event) -> None:
        self.drag_origin = (event.x_root, event.y_root, self.requirements_overlay.winfo_x(), self.requirements_overlay.winfo_y())

    def _requirements_drag_move(self, event) -> None:
        if not self.drag_origin:
            return
        start_x, start_y, window_x, window_y = self.drag_origin
        self.requirements_overlay.geometry(f"+{window_x + event.x_root - start_x}+{window_y + event.y_root - start_y}")

    def _requirements_drag_end(self, _event) -> None:
        self.drag_origin = None
        self.config["requirements_overlay_x"] = self.requirements_overlay.winfo_x()
        self.config["requirements_overlay_y"] = self.requirements_overlay.winfo_y()
        save_config(self.config)

    def _display_rebirths(self) -> list[tuple[int, int, str]]:
        cycle = int(self.config["cycle"])
        completed = int(self.config["completed_rebirth"])
        current = completed + 1
        if current <= 26:
            return [(cycle, current, "NOW"), (cycle, current + 1, "NEXT")]
        if current == 27:
            return [(cycle, 27, "NOW"), ((cycle % 4) + 1, 1, "NEXT CYCLE")]
        next_cycle = (cycle % 4) + 1
        return [(next_cycle, 1, "NOW"), (next_cycle, 2, "NEXT")]

    def render_requirements_overlay(self) -> None:
        for child in self.requirements_frame.winfo_children():
            child.destroy()
        self.requirements_photos.clear()
        cycle = int(self.config["cycle"])
        completed = int(self.config["completed_rebirth"])
        tk.Label(
            self.requirements_frame,
            text=f"REBIRTH TARGETS  •  RBC{cycle}  •  {completed} COMPLETE",
            bg="#111820", fg="#72f2a0", font=("Segoe UI", 9, "bold"), padx=8, pady=5,
        ).grid(row=0, column=0, columnspan=4, sticky="ew")
        for row_index, (row_cycle, rb, row_label) in enumerate(self._display_rebirths(), start=1):
            tk.Label(
                self.requirements_frame, text=f"{row_label}\nRBC{row_cycle}\nRB{rb}",
                bg="#19232d", fg="white", width=9, font=("Segoe UI", 8, "bold"),
            ).grid(row=row_index, column=0, sticky="nsew", padx=(4, 3), pady=3)
            for slot, name in enumerate(CYCLES[row_cycle][rb - 1], start=1):
                card = tk.Frame(self.requirements_frame, bg="#0b0f14")
                card.grid(row=row_index, column=slot, padx=2, pady=3, sticky="nsew")
                path = resource_path("assets", "thumbnails", f"rbc{row_cycle}", f"rb{rb:02d}", f"{slot}.png")
                try:
                    photo = tk.PhotoImage(file=str(path))
                    self.requirements_photos.append(photo)
                    tk.Label(card, image=photo, bg="#0b0f14").pack()
                except tk.TclError:
                    tk.Label(card, text="?", width=10, height=5, bg="#26313b", fg="white").pack()
                tk.Label(
                    card, text=name, bg="#0b0f14", fg="white", font=("Segoe UI", 7, "bold"),
                    width=14, wraplength=92,
                ).pack(fill="x")

    def toggle_requirements_overlay(self) -> None:
        visible = not bool(self.config["requirements_overlay_visible"])
        self.config["requirements_overlay_visible"] = visible
        save_config(self.config)
        if visible:
            self.render_requirements_overlay()
            self.requirements_overlay.deiconify()
            self.requirements_overlay.lift()
        else:
            self.requirements_overlay.withdraw()

    def _tray_image(self) -> Image.Image:
        image = Image.new("RGB", (64, 64), "#15202b")
        draw = ImageDraw.Draw(image)
        draw.ellipse((7, 7, 57, 57), fill="#26e887")
        draw.text((19, 15), "D", fill="#101820")
        return image

    def _tray_menu(self):
        return pystray.Menu(
            pystray.MenuItem("Pause / Resume", lambda: self.toggle_pause()),
            pystray.MenuItem("Show / Hide rebirth targets", lambda: self.events.put(("requirements_toggle", None))),
            pystray.MenuItem("Settings", lambda: self.events.put(("settings", None))),
            pystray.MenuItem("Exit", lambda: self.events.put(("exit", None))),
        )

    def _settings_changed(self) -> None:
        try:
            self.config["cycle"] = int(self.cycle_var.get())
            self.config["completed_rebirth"] = max(0, min(27, int(self.rb_var.get())))
            self.config["spawn_alerts_enabled"] = bool(self.spawn_alert_var.get())
            save_config(self.config)
            state = "Paused" if self.config["paused"] else "Monitoring"
            self.status_var.set(
                f"{state} | RBC{self.config['cycle']}, working on RB{self.config['completed_rebirth'] + 1}"
            )
            self.render_requirements_overlay()
        except (ValueError, tk.TclError):
            return

    def toggle_pause(self) -> None:
        self.config["paused"] = not bool(self.config["paused"])
        save_config(self.config)
        self.events.put(("status", "Paused" if self.config["paused"] else "Monitoring"))
        self.events.put(("overlay", ("PAUSED" if self.config["paused"] else "MONITORING", "#59636e", 1400)))

    def show_settings(self) -> None:
        self.root.deiconify()
        self.root.lift()

    def hide_settings(self) -> None:
        self.root.withdraw()

    def show_overlay(self, message: str, color: str, duration_ms: int = 3500, y_ratio: float = 0.365) -> None:
        self.overlay_label.configure(text=message, bg=color)
        self.overlay.update_idletasks()
        width = self.overlay.winfo_reqwidth()
        height = self.overlay.winfo_reqheight()
        x = (self.overlay.winfo_screenwidth() - width) // 2
        # Place advice in the card gap below the droid name and above WORK.
        y = int(self.overlay.winfo_screenheight() * y_ratio)
        self.overlay.geometry(f"+{x}+{y}")
        self.overlay.deiconify()
        if self.overlay_after:
            self.overlay.after_cancel(self.overlay_after)
        self.overlay_after = self.overlay.after(duration_ms, self.overlay.withdraw)

    def _monitor(self) -> None:
        try:
            ocr = OfflineOcr()
        except Exception as exc:
            self.events.put(("overlay", (f"OCR FAILED: {exc}", "#b4232f", 8000)))
            self.events.put(("status", "OCR unavailable"))
            return

        while not self.stop_event.is_set():
            started = time.monotonic()
            if not self.config["paused"]:
                try:
                    image = capture_game()
                    if image is not None:
                        tokens = ocr.read(image)
                        found = visible_droids(tokens)
                        spawn = high_value_spawn(tokens, image.width, image.height) if self.config["spawn_alerts_enabled"] else None
                        if spawn and spawn != self.last_spawn_signature:
                            self.last_spawn_signature = spawn
                            self.events.put(("spawn_alert", spawn))
                        elif not spawn:
                            self.last_spawn_signature = None
                        view_open = rebirth_view_is_open(tokens)
                        cycle_match = detect_cycle(found) if view_open else None
                        target_rank = rebirth_rank(tokens) if view_open else None
                        if view_open and (cycle_match or target_rank):
                            cycle = cycle_match[0] if cycle_match else int(self.config["cycle"])
                            required_rb = target_rank or cycle_match[1]
                            completed = max(0, required_rb - 1)
                            if cycle != self.config["cycle"] or completed != self.config["completed_rebirth"]:
                                self.config.update(cycle=cycle, completed_rebirth=completed)
                                save_config(self.config)
                                self.events.put(("cycle", (cycle, completed)))
                                self.events.put(("overlay", (f"AUTO-DETECTED RBC{cycle}: WORKING ON RB{required_rb}", "#235ea8", 4200)))

                        blueprint_open = blueprint_is_visible(tokens, image.width, image.height)
                        if blueprint_open:
                            droid, confidence = selected_droid(tokens, image.width, image.height)
                            if droid:
                                left, top = int(image.width * 0.20), int(image.height * 0.10)
                                right, bottom = int(image.width * 0.68), int(image.height * 0.62)
                                detail_tokens = ocr.read(image.crop((left, top, right, bottom)))
                                finish, rarity = blueprint_details(detail_tokens)
                                decision = advise(int(self.config["cycle"]), int(self.config["completed_rebirth"]), droid)
                                signature = (droid, finish, rarity, self.config["cycle"], self.config["completed_rebirth"])
                                if signature == self.pending_blueprint_signature:
                                    self.pending_blueprint_count += 1
                                else:
                                    self.pending_blueprint_signature = signature
                                    self.pending_blueprint_count = 1
                                if self.pending_blueprint_count >= 2 and signature != self.last_blueprint_signature:
                                    self.last_blueprint_signature = signature
                                    labels = " ".join(value for value in (finish, rarity) if value)
                                    descriptor = f" ({labels})" if labels else ""
                                    color = "#137a43" if decision.safe_to_sell else "#a8232e"
                                    self.events.put(("overlay", (f"BLUEPRINT {droid}{descriptor}: {decision.message}", color, 5000, 0.50)))
                        else:
                            self.last_blueprint_signature = None
                            self.pending_blueprint_signature = None
                            self.pending_blueprint_count = 0

                        if not blueprint_open and panel_is_open(tokens, image.width, image.height):
                            droid, confidence = selected_droid(tokens, image.width, image.height)
                            if droid:
                                current_rb = int(self.config["completed_rebirth"])
                                decision = advise(int(self.config["cycle"]), current_rb, droid)
                                signature = (droid, current_rb, self.config["cycle"], decision.safe_to_sell)
                                if signature == self.pending_signature:
                                    self.pending_count += 1
                                else:
                                    self.pending_signature = signature
                                    self.pending_count = 1
                                if self.pending_count >= 2 and signature != self.last_signature:
                                    self.last_signature = signature
                                    color = "#137a43" if decision.safe_to_sell else "#a8232e"
                                    self.events.put(("overlay", (f"{droid}: {decision.message}", color, 4500)))
                        elif not blueprint_open:
                            self.last_signature = None
                            self.pending_signature = None
                            self.pending_count = 0
                except Exception as exc:
                    self.events.put(("status", f"Monitor warning: {type(exc).__name__}"))
            elapsed = time.monotonic() - started
            self.stop_event.wait(max(0.15, float(self.config["interval_seconds"]) - elapsed))

    def _drain_events(self) -> None:
        try:
            while True:
                kind, payload = self.events.get_nowait()
                if kind == "overlay":
                    self.show_overlay(*payload)
                elif kind == "status":
                    self.status_var.set(str(payload))
                elif kind == "cycle":
                    cycle, completed = payload
                    self.cycle_var.set(cycle)
                    self.rb_var.set(completed)
                    self.status_var.set(f"Monitoring | RBC{cycle}, working on RB{completed + 1}")
                    self.render_requirements_overlay()
                elif kind == "requirements_toggle":
                    self.toggle_requirements_overlay()
                elif kind == "spawn_alert":
                    self.show_spawn_alert(*payload)
                elif kind == "settings":
                    self.show_settings()
                elif kind == "exit":
                    self.shutdown()
                    return
        except queue.Empty:
            pass
        self.root.after(100, self._drain_events)

    def shutdown(self) -> None:
        self.stop_event.set()
        self.listener.stop()
        self.tray.stop()
        self.root.destroy()

    def run(self) -> None:
        self.tray.run_detached()
        self.listener.start()
        self.worker.start()
        self.root.after(100, self._drain_events)
        self.root.mainloop()


def main() -> None:
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateMutexW.restype = wintypes.HANDLE
    mutex = kernel32.CreateMutexW(None, False, "Local\\DroidAdvisorSingleInstance")
    if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
        root = tk.Tk()
        root.withdraw()
        from tkinter import messagebox
        messagebox.showinfo("Droid Advisor", "Droid Advisor is already running in the system tray.")
        root.destroy()
        kernel32.CloseHandle(mutex)
        return
    try:
        DroidAdvisorApp().run()
    finally:
        kernel32.CloseHandle(mutex)


if __name__ == "__main__":
    main()
