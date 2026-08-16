"""Generate the original short WAV cues bundled with Droid Advisor."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "assets" / "sounds"
SAMPLE_RATE = 44_100
VOLUME = 0.24


def envelope(position: float, duration: float) -> float:
    attack = min(1.0, position / 0.012)
    release = min(1.0, max(0.0, duration - position) / 0.08)
    return attack * release


def tone(frequency: float, duration: float, *, overtone: float = 0.18) -> list[float]:
    samples = []
    for index in range(round(SAMPLE_RATE * duration)):
        position = index / SAMPLE_RATE
        carrier = math.sin(2 * math.pi * frequency * position)
        harmonic = math.sin(2 * math.pi * frequency * 2.01 * position) * overtone
        samples.append((carrier + harmonic) * envelope(position, duration))
    return samples


def silence(duration: float) -> list[float]:
    return [0.0] * round(SAMPLE_RATE * duration)


def write_wav(name: str, samples: list[float]) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    path = OUTPUT / name
    peak = max(1.0, max(abs(sample) for sample in samples))
    frames = b"".join(
        struct.pack("<h", round(max(-1.0, min(1.0, sample / peak)) * VOLUME * 32767))
        for sample in samples
    )
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(frames)


def main() -> None:
    write_wav(
        "droid-chime.wav",
        tone(880, 0.12) + silence(0.025) + tone(1174.66, 0.13) + silence(0.025) + tone(1567.98, 0.22),
    )
    write_wav(
        "scanner-ping.wav",
        tone(1480, 0.09, overtone=0.08) + silence(0.07) + tone(980, 0.28, overtone=0.08),
    )
    pulse = tone(740, 0.11, overtone=0.24) + silence(0.045) + tone(1040, 0.11, overtone=0.24)
    write_wav("urgent-pulse.wav", pulse + silence(0.06) + pulse)
    print(f"Wrote {len(tuple(OUTPUT.glob('*.wav')))} alert sounds to {OUTPUT}")


if __name__ == "__main__":
    main()
