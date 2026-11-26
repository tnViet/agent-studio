# Khung mau cho mot hinh tu ve. Chep file nay thanh <ten>.py roi sua ham draw.
# Cong cu render_scenes.py goi draw() cho TUNG khung hinh (30 khung moi giay).
#
# Quy tac:
# - Khung hinh 720x1280, che do RGBA. Ve thang len frame (ImageDraw) hoac tra ve mot anh moi cung kich thuoc.
# - t: vi tri trong canh, tu 0 (dau canh) den 1 (cuoi canh). sec: so giay tu dau canh. duration: do dai canh (giay).
# - Chuyen dong phai tinh tu t hoac sec, khong dung bien toan cuc de dem khung (khung co the ve khong theo thu tu).
# - Noi dung chinh nam tu y = 0.04*H den y = 0.78*H. Phan duoi 22% de cho phu de.
# - Chi dung Pillow, numpy, math. Khong doc file ngoai, khong tai gi tu mang.
# - Moi khung phai ve nhanh (duoi 0,1 giay). Tinh ca mang diem bang numpy, khong lap tung diem anh.
# - params: thong so tu storyboard, ghi de len DEFAULT_PARAMS. Viet sao cho doi thong so la dung lai duoc cho video khac.

import math
from PIL import ImageDraw

W = 720
H = 1280

DESCRIPTION = "Example: a circle that grows from the center. Copy this file to make a new drawing."
DEFAULT_PARAMS = {"color": "#4fc3f7", "x": 0.5, "y": 0.4, "max_radius": 0.3}


def hex_rgb(text):
    text = text.lstrip("#")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16))


def draw(frame, t, sec, duration, params):
    pen = ImageDraw.Draw(frame)
    cx = params["x"] * W
    cy = params["y"] * H
    r = params["max_radius"] * W * t
    pen.ellipse([cx - r, cy - r, cx + r, cy + r], outline=hex_rgb(params["color"]), width=6)
    return None
