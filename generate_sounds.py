"""Generate original synthetic Zen-bowl-like WAV files for Still.

Only two sounds are used by the app:
- start_bowl.wav: one gentle strike when meditation begins
- end_bowl.wav: two soft strikes when the timer completes

No interval bell is generated, so the meditation remains silent in between.
Run: python3 generate_sounds.py
"""
from __future__ import annotations

import math
import random
import wave
from pathlib import Path

SAMPLE_RATE = 44_100
OUT = Path(__file__).parent / "assets"
OUT.mkdir(exist_ok=True)


def envelope(t: float, attack: float, decay: float) -> float:
    a = min(1.0, t / attack) if attack > 0 else 1.0
    return a * math.exp(-t / decay)


def strike_sample(t: float, f0: float, strength: float = 1.0) -> float:
    """Additive model with slightly inharmonic partials for a metal-bowl character."""
    partials = [
        (1.00, 1.00, 4.8),
        (1.49, 0.52, 3.4),
        (2.03, 0.31, 2.8),
        (2.67, 0.19, 2.3),
        (3.81, 0.10, 1.7),
    ]
    y = 0.0
    for ratio, amp, decay in partials:
        freq = f0 * ratio
        shimmer = 1.0 + 0.0018 * math.sin(2 * math.pi * 0.7 * t)
        y += amp * math.sin(2 * math.pi * freq * shimmer * t) * envelope(t, 0.008, decay)

    noise = (random.random() * 2 - 1) * math.exp(-t / 0.035) * 0.06
    return strength * (0.52 * y + noise)


def synth_bowl(path: Path, *, f0: float, seconds: float, strikes: tuple[float, ...], gains: tuple[float, ...]) -> None:
    random.seed(2026 + int(f0))
    frames = bytearray()
    peak = 0.0
    samples: list[float] = []

    total = int(seconds * SAMPLE_RATE)
    for i in range(total):
        t = i / SAMPLE_RATE
        value = 0.0
        for start, gain in zip(strikes, gains):
            if t >= start:
                value += strike_sample(t - start, f0, gain)
        value = math.tanh(value * 1.25)
        peak = max(peak, abs(value))
        samples.append(value)

    norm = 0.88 / peak if peak > 0 else 1.0
    for value in samples:
        sample = int(max(-1.0, min(1.0, value * norm)) * 32767)
        frames += sample.to_bytes(2, byteorder="little", signed=True)

    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(frames)


if __name__ == "__main__":
    synth_bowl(OUT / "start_bowl.wav", f0=196.0, seconds=8.0, strikes=(0.0,), gains=(1.0,))
    synth_bowl(OUT / "end_bowl.wav", f0=174.61, seconds=12.0, strikes=(0.0, 2.8), gains=(1.0, 0.72))
    print("Generated start_bowl.wav and end_bowl.wav in assets/")
