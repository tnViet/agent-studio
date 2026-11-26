# Path difference in two-source interference: the steady fringe pattern, the maximum (or minimum)
# curves traced in a bright color, and a point P joined to S1 and S2 by two colored segments d1, d2.
import math
import numpy
from PIL import Image, ImageDraw

W = 720
H = 1280

DESCRIPTION = ("Two-source interference already developed, with the maximum curves (d2-d1 = k*wavelength, "
               "highlight='max') or minimum curves (d2-d1 = (k+1/2)*wavelength, highlight='min') traced as thick lines, "
               "and a point P on the curve d2-d1 = p_order*wavelength joined to S1 and S2 by segments in two colors. "
               "No text is drawn: add S1, S2, P, d1, d2 as label elements.")
DEFAULT_PARAMS = {
    "sources": [[0.38, 0.30], [0.62, 0.30]],   # S1 (left), S2 (right), fractions of width / height
    "wavelength": 0.12,                         # fraction of width
    "speed": 0.22,                              # fraction of width per second
    "area": [0.0, 0.04, 1.0, 0.78],             # left, top, right, bottom (fractions)
    "color": "#4fc3f7",                         # bright fringe color
    "dark": "#0b1830",                          # dark fringe / background color
    "highlight": "max",                         # "max" or "min"
    "highlight_color": "#ff5252",
    "p_order": 1,                               # |d2-d1| / wavelength at P (1 for max, 0.5 for min)
    "p_y": 0.6,                                 # height of P (fraction of height)
    "p_side": "right",                          # "right" (closer to S2) or "left" (closer to S1)
    "color_1": "#4fc3f7",                       # segment S1-P
    "color_2": "#ffd54f",                       # segment S2-P
    "show_labels": True,                        # kept for compatibility; labels are storyboard elements
}


def hex_rgb(text):
    text = text.lstrip("#")
    return [int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)]


def smooth(p):
    p = min(1.0, max(0.0, p))
    return p * p * (3 - 2 * p)


def solve_x(diff, ys, s1, s2):
    # For each y find x where d2 - d1 = diff. d2 - d1 decreases from +sep to -sep as x grows.
    lo = numpy.full(ys.shape, -3.0 * W)
    hi = numpy.full(ys.shape, 4.0 * W)
    for _ in range(50):
        mid = (lo + hi) / 2
        d1 = numpy.sqrt((mid - s1[0]) ** 2 + (ys - s1[1]) ** 2)
        d2 = numpy.sqrt((mid - s2[0]) ** 2 + (ys - s2[1]) ** 2)
        f = d2 - d1
        bigger = f > diff
        lo = numpy.where(bigger, mid, lo)
        hi = numpy.where(bigger, hi, mid)
    return (lo + hi) / 2


def draw(frame, t, sec, duration, params):
    left = int(params["area"][0] * W)
    top = int(params["area"][1] * H)
    right = int(params["area"][2] * W)
    bottom = int(params["area"][3] * H)
    s1 = (params["sources"][0][0] * W, params["sources"][0][1] * H)
    s2 = (params["sources"][1][0] * W, params["sources"][1][1] * H)
    lam = params["wavelength"] * W
    sep = math.hypot(s2[0] - s1[0], s2[1] - s1[1])

    # 1) Steady interference field (coarse grid, then resized)
    step = 3
    xs = numpy.arange(left, right, step, dtype=numpy.float32)
    ys = numpy.arange(top, bottom, step, dtype=numpy.float32)
    gx, gy = numpy.meshgrid(xs, ys)
    k = 2 * math.pi / lam
    omega = k * params["speed"] * W
    total = numpy.zeros(gx.shape, dtype=numpy.float32)
    for s in (s1, s2):
        r = numpy.sqrt((gx - s[0]) ** 2 + (gy - s[1]) ** 2)
        total = total + numpy.cos(k * r - omega * sec) / (1.0 + r / (0.5 * W))
    level = numpy.clip(0.5 + 0.5 * total / 2 * 1.6, 0, 1)
    bright = numpy.array(hex_rgb(params["color"]), dtype=numpy.float32)
    dark = numpy.array(hex_rgb(params["dark"]), dtype=numpy.float32)
    rgb = dark + (bright - dark) * level[:, :, None]
    patch = Image.fromarray(rgb.astype(numpy.uint8), "RGB").resize((right - left, bottom - top), Image.BILINEAR)
    frame.paste(patch.convert("RGBA"), (left, top))

    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pen = ImageDraw.Draw(overlay)

    # 2) Highlighted curves, traced outward from the source line (t 0.15 - 0.45)
    offset = 0.0 if params["highlight"] == "max" else 0.5
    diffs = []
    n = 0
    while (n + offset) * lam < sep - 2:
        diffs.append((n + offset) * lam)
        if n + offset > 0:
            diffs.append(-(n + offset) * lam)
        n = n + 1
    grow = smooth((t - 0.15) / 0.30)
    hc = tuple(hex_rgb(params["highlight_color"]))
    if grow > 0:
        sy = (s1[1] + s2[1]) / 2
        reach = grow * max(sy - top, bottom - sy)
        cy = numpy.linspace(top, bottom, 300)
        for diff in diffs:
            cx = solve_x(diff, cy, s1, s2)
            keep = numpy.abs(cy - sy) <= reach
            for part_above in (True, False):
                mask = keep & ((cy <= sy) if part_above else (cy >= sy))
                pts = [(float(a), float(b)) for a, b in zip(cx[mask], cy[mask]) if left - 20 < a < right + 20]
                if len(pts) > 1:
                    pen.line(pts, fill=(5, 10, 25, 200), width=14, joint="curve")
                    pen.line(pts, fill=hc + (255,), width=6, joint="curve")

    # 3) Point P and the two segments (t 0.45 - 0.75), pulse once (t 0.75 - 1)
    p_diff = params["p_order"] * lam
    if params["p_side"] == "right":
        p_diff = -p_diff
    py = params["p_y"] * H
    px = float(solve_x(p_diff, numpy.array([py]), s1, s2)[0])
    show_p = smooth((t - 0.45) / 0.08)
    seg = smooth((t - 0.50) / 0.25)
    width = 6
    if t > 0.75:
        width = 6 + 5 * math.sin(math.pi * min(1.0, (t - 0.75) / 0.15))
    if seg > 0:
        for s, col in ((s1, params["color_1"]), (s2, params["color_2"])):
            ex = s[0] + (px - s[0]) * seg
            ey = s[1] + (py - s[1]) * seg
            pen.line([s, (ex, ey)], fill=(5, 10, 25, 220), width=int(round(width)) + 8)
            pen.line([s, (ex, ey)], fill=tuple(hex_rgb(col)) + (255,), width=int(round(width)))
    if show_p > 0:
        rad = 13 * show_p
        pen.ellipse([px - rad, py - rad, px + rad, py + rad], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=3)

    # Sources on top
    for s in (s1, s2):
        rad = 12 + 3 * math.sin(sec * 8)
        pen.ellipse([s[0] - rad, s[1] - rad, s[0] + rad, s[1] + rad], fill=(255, 255, 255, 255))

    frame.alpha_composite(overlay)
    return None
