"""Generate SlashKeys placeholder icons (dark rounded square + blue backslash).

Pure-stdlib PNG writer — no PIL required. Run: python gen_icons.py
"""
import struct
import zlib

BG = (26, 31, 41)        # #1a1f29
STROKE = (122, 170, 255) # #7aaaff


def make_icon(size):
    radius = size * 0.22
    # backslash line segment from upper-left to lower-right
    x1, y1 = size * 0.32, size * 0.22
    x2, y2 = size * 0.68, size * 0.78
    half_w = max(size * 0.065, 1.0)

    def seg_dist(px, py):
        dx, dy = x2 - x1, y2 - y1
        t = max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
        cx, cy = x1 + t * dx, y1 + t * dy
        return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5

    def corner_dist(px, py):
        # distance outside the rounded-rect body (0 = inside)
        qx = abs(px - size / 2) - (size / 2 - radius)
        qy = abs(py - size / 2) - (size / 2 - radius)
        return (max(qx, 0) ** 2 + max(qy, 0) ** 2) ** 0.5 - radius

    rows = []
    for y in range(size):
        row = bytearray([0])  # filter byte
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            d_rect = corner_dist(px, py)
            alpha = max(0.0, min(1.0, 0.5 - d_rect))  # 1px antialiased edge
            d_line = seg_dist(px, py) - half_w
            line_mix = max(0.0, min(1.0, 0.5 - d_line))
            r = BG[0] + (STROKE[0] - BG[0]) * line_mix
            g = BG[1] + (STROKE[1] - BG[1]) * line_mix
            b = BG[2] + (STROKE[2] - BG[2]) * line_mix
            row += bytes([int(r), int(g), int(b), int(alpha * 255)])
        rows.append(bytes(row))

    raw = b''.join(rows)

    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


for s in (16, 32, 48, 128):
    with open(f'icon{s}.png', 'wb') as f:
        f.write(make_icon(s))
    print(f'icon{s}.png written')
