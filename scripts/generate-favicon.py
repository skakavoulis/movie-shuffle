#!/usr/bin/env python3
"""Generate public/favicon.ico for JustPickAMovie.

Two poster cards mid-shuffle: a dark red card behind, and the picked card in
front in the brand accent (#e50914) with a white play triangle. Geometry
mirrors public/icon.svg and the LogoMark component (64-unit grid).
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ACCENT = (229, 9, 20, 255)  # #e50914
ACCENT_DARK = (157, 6, 16, 255)  # #9d0610
PLAY = (241, 241, 241, 255)  # #f1f1f1
TRANSPARENT = (0, 0, 0, 0)

HIRES = 256
SIZES = (16, 32, 48)


def to_card_space(
    x: float, y: float, center: tuple[float, float], degrees: float
) -> tuple[float, float]:
    """Undo a card's rotation so it can be tested as an axis-aligned rect."""
    theta = math.radians(degrees)
    dx, dy = x - center[0], y - center[1]
    return (
        dx * math.cos(theta) + dy * math.sin(theta),
        -dx * math.sin(theta) + dy * math.cos(theta),
    )


def point_in_rounded_rect(
    x: float, y: float, half_w: float, half_h: float, radius: float
) -> bool:
    cx = min(max(x, -half_w + radius), half_w - radius)
    cy = min(max(y, -half_h + radius), half_h - radius)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= radius * radius


def point_in_triangle(
    x: float, y: float, a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]
) -> bool:
    def sign(p1: tuple[float, float], p2: tuple[float, float], p3: tuple[float, float]) -> float:
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])

    p = (x, y)
    d1 = sign(p, a, b)
    d2 = sign(p, b, c)
    d3 = sign(p, c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)


def sample_pixel(x: float, y: float, size: int) -> tuple[int, int, int, int]:
    u = size / 64
    half_w, half_h, radius = 15 * u, 21 * u, 6 * u

    fx, fy = to_card_space(x, y, (38.5 * u, 31 * u), 8)
    play = ((-5.5 * u, -9 * u), (-5.5 * u, 9 * u), (9.5 * u, 0.0))
    if point_in_triangle(fx, fy, *play):
        return PLAY
    if point_in_rounded_rect(fx, fy, half_w, half_h, radius):
        return ACCENT

    bx, by = to_card_space(x, y, (27.5 * u, 32 * u), -14)
    if point_in_rounded_rect(bx, by, half_w, half_h, radius):
        return ACCENT_DARK
    return TRANSPARENT


def render(size: int, supersample: int = 4) -> list[tuple[int, int, int, int]]:
    src = size * supersample
    acc = [[0, 0, 0, 0] for _ in range(size * size)]
    n = supersample * supersample
    for sy in range(src):
        for sx in range(src):
            px = sample_pixel(sx + 0.5, sy + 0.5, src)
            dx, dy = sx // supersample, sy // supersample
            i = dy * size + dx
            for c in range(4):
                acc[i][c] += px[c]
    return [tuple(v // n for v in pixel) for pixel in acc]  # type: ignore[misc]


def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def encode_png(width: int, height: int, pixels: list[tuple[int, int, int, int]]) -> bytes:
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        for x in range(width):
            raw.extend(pixels[y * width + x])
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + png_chunk(b"IEND", b"")
    )


def encode_ico(images: list[tuple[int, int, bytes]]) -> bytes:
    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries = bytearray()
    payload = bytearray()
    for width, height, png in images:
        entries.extend(
            struct.pack(
                "<BBBBHHII",
                width if width < 256 else 0,
                height if height < 256 else 0,
                0,
                0,
                1,
                32,
                len(png),
                offset,
            )
        )
        offset += len(png)
        payload.extend(png)
    return bytes(header + entries + payload)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    images: list[tuple[int, int, bytes]] = []
    for size in SIZES:
        pixels = render(size)
        images.append((size, size, encode_png(size, size, pixels)))

    ico_path = root / "public" / "favicon.ico"
    ico_path.write_bytes(encode_ico(images))
    print(f"Wrote {ico_path} ({ico_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
