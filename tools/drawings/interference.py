# Giao thoa song tu hai (hoac nhieu) nguon diem: song tron lan ra, gap nhau tao van sang (cong huong) va van toi (triet tieu).
import math
import numpy
from PIL import Image, ImageDraw

W = 720
H = 1280

DESCRIPTION = ("Point sources send circular waves that spread and overlap. Bright bands = waves add up, "
               "dark bands = waves cancel. Each source can start at its own time, so the viewer sees the waves meet.")
DEFAULT_PARAMS = {
    "sources": [[0.35, 0.40], [0.65, 0.40]],   # vi tri cac nguon (ty le chieu rong, chieu cao)
    "starts": [0.0, 0.0],                       # nguon bat dau phat song tai t (0..1)
    "wavelength": 0.07,                         # buoc song, ty le chieu rong
    "speed": 0.18,                              # toc do lan, ty le chieu rong moi giay
    "area": [0.0, 0.04, 1.0, 0.78],             # vung ve: trai, tren, phai, duoi (ty le)
    "color": "#4fc3f7",                         # mau van sang
    "dark": "#0b1830",                          # mau nen vung song
    "show_sources": True,
}


def hex_rgb(text):
    text = text.lstrip("#")
    return [int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)]


def draw(frame, t, sec, duration, params):
    left = int(params["area"][0] * W)
    top = int(params["area"][1] * H)
    right = int(params["area"][2] * W)
    bottom = int(params["area"][3] * H)
    # Tinh o do phan giai mot nua cho nhanh, roi phong to
    step = 2
    xs = numpy.arange(left, right, step, dtype=numpy.float32)
    ys = numpy.arange(top, bottom, step, dtype=numpy.float32)
    gx, gy = numpy.meshgrid(xs, ys)

    k = 2 * math.pi / (params["wavelength"] * W)          # so song
    speed_px = params["speed"] * W                          # diem anh moi giay
    omega = k * speed_px
    total = numpy.zeros(gx.shape, dtype=numpy.float32)
    reached = numpy.zeros(gx.shape, dtype=numpy.float32)   # 1 o noi song da toi, 0 o noi chua co song
    count = 0
    sources = params["sources"]
    starts = params["starts"]
    for i in range(len(sources)):
        start_t = 0.0
        if i < len(starts):
            start_t = starts[i]
        if t < start_t:
            continue
        count = count + 1
        elapsed = (t - start_t) * duration
        sx = sources[i][0] * W
        sy = sources[i][1] * H
        r = numpy.sqrt((gx - sx) ** 2 + (gy - sy) ** 2)
        front = speed_px * elapsed                          # mat song da lan toi dau
        wave = numpy.cos(k * r - omega * elapsed)
        inside = (r < front).astype(numpy.float32)
        wave = wave * inside                                # chua toi thi bang 0
        reached = numpy.maximum(reached, inside)
        wave = wave / (1.0 + r / (0.5 * W))                 # xa nguon thi yeu dan
        total = total + wave

    if count > 0:
        level = numpy.clip(0.5 + 0.5 * total / max(1, count) * 1.6, 0, 1)
    else:
        level = numpy.full(gx.shape, 0.5, dtype=numpy.float32)
    bright = numpy.array(hex_rgb(params["color"]), dtype=numpy.float32)
    dark = numpy.array(hex_rgb(params["dark"]), dtype=numpy.float32)
    level = level * reached                                 # chua co song thi giu mau nen toi
    rgb = dark + (bright - dark) * level[:, :, None]
    patch = Image.fromarray(rgb.astype(numpy.uint8), "RGB").resize((right - left, bottom - top), Image.BILINEAR)
    frame.paste(patch.convert("RGBA"), (left, top))

    if params["show_sources"]:
        pen = ImageDraw.Draw(frame)
        for i in range(len(sources)):
            start_t = 0.0
            if i < len(starts):
                start_t = starts[i]
            if t < start_t:
                continue
            cx = sources[i][0] * W
            cy = sources[i][1] * H
            pulse = 12 + 4 * math.sin(sec * 8)
            pen.ellipse([cx - pulse, cy - pulse, cx + pulse, cy + pulse], fill=(255, 255, 255, 255))
    return None
