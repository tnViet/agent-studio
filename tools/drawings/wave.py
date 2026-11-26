# Hai song chay nguoc chieu tren mot day, gap nhau o giua; duong thu ba la tong (chong chap song).
import math
from PIL import ImageDraw

W = 720
H = 1280

DESCRIPTION = ("Two waves travel toward each other along a line and meet in the middle. A third line shows their sum "
               "(superposition): bigger where they add up, flat where they cancel. kind = pulse (one bump each) or train (continuous waves).")
DEFAULT_PARAMS = {
    "kind": "pulse",          # pulse: moi ben mot xung; train: song lien tuc
    "y": 0.42,                # vi tri day (ty le chieu cao)
    "amplitude": 0.08,        # bien do, ty le chieu rong
    "wavelength": 0.35,       # do rong xung hoac buoc song, ty le chieu rong
    "meet_at": 0.5,           # hai song gap nhau o giua khung tai thoi diem t nay (0..1)
    "opposite": False,        # True: song phai nguoc pha (lom xuong) de thay triet tieu
    "show_parts": True,       # ve ca hai song thanh phan (mo) phia tren va duoi
    "color_a": "#4fc3f7",
    "color_b": "#ff8a65",
    "color_sum": "#ffffff",
}


def hex_rgb(text):
    text = text.lstrip("#")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


def one_wave(x, center, params, sign):
    # Do cao cua mot song tai vi tri x (diem anh)
    width = params["wavelength"] * W
    a = params["amplitude"] * W
    d = x - center
    if params["kind"] == "pulse":
        if abs(d) > width / 2:
            return 0.0
        return sign * a * 0.5 * (1 + math.cos(2 * math.pi * d / width))
    return sign * a * math.sin(2 * math.pi * d / width)


def draw(frame, t, sec, duration, params):
    pen = ImageDraw.Draw(frame)
    base = params["y"] * H
    width = params["wavelength"] * W
    # Song A di tu trai sang, song B di tu phai sang; gap nhau o giua khung luc t = meet_at
    speed = (W / 2 + width / 2) / max(0.1, params["meet_at"] * duration)
    center_a = -width / 2 + speed * sec
    center_b = W + width / 2 - speed * sec
    sign_b = 1
    if params["opposite"]:
        sign_b = -1
    points_a = []
    points_b = []
    points_sum = []
    for x in range(0, W + 1, 4):
        ya = one_wave(x, center_a, params, 1)
        yb = one_wave(x, center_b, params, sign_b)
        if params["kind"] == "train":
            # Song lien tuc: chi co o phan da di qua
            if x > center_a + width / 2:
                ya = 0.0
            if x < center_b - width / 2:
                yb = 0.0
        points_a.append((x, base - 0.22 * H - ya))
        points_b.append((x, base + 0.22 * H - yb))
        points_sum.append((x, base - ya - yb))
    if params["show_parts"]:
        pen.line(points_a, fill=hex_rgb(params["color_a"]), width=5)
        pen.line(points_b, fill=hex_rgb(params["color_b"]), width=5)
        pen.line([(0, base - 0.22 * H), (W, base - 0.22 * H)], fill=(255, 255, 255, 60), width=1)
        pen.line([(0, base + 0.22 * H), (W, base + 0.22 * H)], fill=(255, 255, 255, 60), width=1)
    pen.line(points_sum, fill=hex_rgb(params["color_sum"]), width=8)
    return None
