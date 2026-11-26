# Cong cu dung canh cho video doc 720x1280.
# Doc clips/<ten>/storyboard.json (dang version 2), dung moi canh thanh mp4 cam tieng trong clips/<ten>/scenes/.
# Hinh lay tu kho tools/assets/icons (emoji 3D Noto, Apache 2.0). Chu dung font Be Vietnam Pro (OFL).
#
# Cach dung:
#   python tools/render_scenes.py clips/VIEA-30               dung tat ca canh, ghi assets.json
#   python tools/render_scenes.py clips/VIEA-30 --scene 2     chi dung canh 2
#   python tools/render_scenes.py clips/VIEA-30 --check       kiem tra storyboard, khong dung
#   python tools/render_scenes.py clips/VIEA-30 --preview     ve anh xem truoc preview.png (3 khung moi canh)
#   python tools/render_scenes.py --find car rocket           tim ten hinh trong kho
#   python tools/render_scenes.py --drawings                  liet ke cac hinh tu ve co san trong tools/drawings
#   python tools/render_scenes.py --drawings wave             chi liet ke hinh tu ve co chu "wave"
#
# Canh tu ve: trong storyboard ghi "mode": "draw", "drawing": "<ten>", "params": {...}.
# Cong cu tim file <thu muc video>/drawings/<ten>.py truoc, roi den tools/drawings/<ten>.py,
# goi ham draw(frame, t, sec, duration, params) cua file do cho tung khung hinh, roi ve them elements len tren.
#
# Do dai moi canh = do dai file giong audio/scene_XX.wav + 0.3 giay.
# Neu chua co file giong thi lay duration_sec trong script.json.
# Vung 22% duoi cung de trong cho phu de (Editor dot phu de vao do).

import json
import math
import os
import subprocess
import sys
import wave
import difflib
import importlib.util

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W = 720
H = 1280
FPS = 30
PAD_SEC = 0.3
SAFE_LEFT = 0.04
SAFE_RIGHT = 0.96
SAFE_TOP = 0.04
SAFE_BOTTOM = 0.78          # duoi muc nay danh cho phu de
ENTER_SEC = 0.45            # thoi gian hieu ung xuat hien

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
ICON_DIR = os.path.join(TOOL_DIR, "assets", "icons")
INDEX_FILE = os.path.join(TOOL_DIR, "assets", "icons_index.json")
DRAW_DIR = os.path.join(TOOL_DIR, "drawings")
FONT_FILE = os.path.join(TOOL_DIR, "assets", "fonts", "BeVietnamPro-ExtraBold.ttf")

BACKGROUNDS = ["night", "day", "sunset", "space", "sea", "road", "paper", "studio"]
ENTERS = ["none", "fade", "pop", "grow", "slide_left", "slide_right", "slide_up", "slide_down", "draw"]
EFFECTS = ["bob", "shake", "pulse", "spin", "wobble", "blink"]
TYPES = ["icon", "text", "label", "arrow", "counter", "table"]


# ---------------- Tien ich ----------------

def load_json(path):
    f = open(path, encoding="utf-8")
    data = json.load(f)
    f.close()
    return data


def hex_color(text, alpha=255):
    text = text.lstrip("#")
    return (int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16), alpha)


def ease(p, kind):
    if p <= 0:
        return 0.0
    if p >= 1:
        return 1.0
    if kind == "linear":
        return p
    if kind == "in":
        return p * p
    if kind == "out":
        return 1 - (1 - p) * (1 - p)
    return p * p * (3 - 2 * p)


def lerp(a, b, p):
    return a + (b - a) * p


def font(size):
    return ImageFont.truetype(FONT_FILE, max(8, int(size)))


def icon_names():
    return load_json(INDEX_FILE)


# Tu khoa thuong dung -> ten hinh trong kho (de --find tim de hon). Them tu khoa moi vao day.
ALIASES = {
    "car": ["automobile", "racing_car", "sport_utility_vehicle", "taxi", "police_car"],
    "xe": ["automobile", "racing_car", "bus", "bicycle", "motorcycle"],
    "steering": ["wheel"], "boom": ["collision", "bomb"], "explosion": ["collision", "bomb"],
    "money": ["money_bag", "dollar_banknote", "coin"], "idea": ["light_bulb"],
    "win": ["trophy", "1st_place_medal", "party_popper"], "lose": ["skull", "crying_face"],
    "danger": ["warning", "skull_and_crossbones"], "think": ["thinking_face"], "agree": ["handshake"],
    "war": ["crossed_swords", "bomb", "military_helmet"], "nuclear": ["radioactive", "rocket"],
    "prison": ["police_officer", "locked", "chains"], "box": ["package", "card_file_box"],
    "time": ["hourglass_done", "stopwatch", "alarm_clock"], "people": ["man", "woman", "person"],
}


# ---------------- Nen ----------------

def gradient(top, bottom):
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        p = y / (H - 1)
        color = (int(lerp(top[0], bottom[0], p)), int(lerp(top[1], bottom[1], p)), int(lerp(top[2], bottom[2], p)), 255)
        draw.line([(0, y), (W, y)], fill=color)
    return img


def make_background(style, seed):
    # seed giu cho sao, may o cung vi tri trong ca canh
    rnd = (seed * 9301 + 49297) % 233280
    def random_number():
        nonlocal rnd
        rnd = (rnd * 9301 + 49297) % 233280
        return rnd / 233280.0

    if style == "day":
        img = gradient((120, 190, 240), (215, 238, 250))
        draw = ImageDraw.Draw(img)
        for i in range(5):
            cx = random_number() * W
            cy = 80 + random_number() * 500
            for k in range(4):
                r = 40 + random_number() * 30
                draw.ellipse([cx + k * 45 - r, cy - r * 0.6, cx + k * 45 + r, cy + r * 0.6], fill=(255, 255, 255, 230))
    elif style == "sunset":
        img = gradient((255, 140, 90), (120, 60, 140))
        draw = ImageDraw.Draw(img)
        draw.ellipse([W * 0.55, 300, W * 0.55 + 220, 520], fill=(255, 210, 120, 255))
    elif style == "space":
        img = gradient((10, 8, 30), (45, 20, 70))
        draw = ImageDraw.Draw(img)
        for i in range(160):
            x = random_number() * W
            y = random_number() * H
            r = 1 + random_number() * 2
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, int(120 + random_number() * 135)))
        draw.ellipse([W - 230, 120, W - 30, 320], fill=(110, 140, 220, 255))
        draw.ellipse([W - 200, 150, W - 120, 210], fill=(140, 170, 240, 255))
    elif style == "sea":
        img = gradient((130, 200, 240), (200, 235, 250))
        draw = ImageDraw.Draw(img)
        sea_top = int(H * 0.5)
        draw.rectangle([0, sea_top, W, H], fill=(40, 110, 180, 255))
        for row in range(10):
            y = sea_top + 20 + row * 45
            for x in range(-40, W + 40, 80):
                draw.arc([x, y, x + 80, y + 30], 200, 340, fill=(160, 210, 240, 255), width=4)
    elif style == "road":
        img = gradient((40, 50, 90), (240, 150, 110))
        draw = ImageDraw.Draw(img)
        horizon = int(H * 0.42)
        bottom = int(H * SAFE_BOTTOM) + 40
        draw.rectangle([0, horizon, W, H], fill=(70, 110, 70, 255))
        draw.polygon([(W * 0.42, horizon), (W * 0.58, horizon), (W * 1.05, bottom), (-W * 0.05, bottom)], fill=(60, 60, 70, 255))
        draw.rectangle([0, bottom, W, H], fill=(50, 50, 60, 255))
        for i in range(8):
            p0 = i / 8.0
            p1 = p0 + 0.06
            y0 = horizon + (bottom - horizon) * p0 * p0
            y1 = horizon + (bottom - horizon) * p1 * p1
            w0 = 2 + p0 * 10
            w1 = 2 + p1 * 10
            draw.polygon([(W / 2 - w0, y0), (W / 2 + w0, y0), (W / 2 + w1, y1), (W / 2 - w1, y1)], fill=(250, 220, 90, 255))
    elif style == "paper":
        img = gradient((246, 238, 218), (232, 220, 192))
        draw = ImageDraw.Draw(img)
        for y in range(160, H, 64):
            draw.line([(40, y), (W - 40, y)], fill=(210, 195, 160, 255), width=2)
    elif style == "studio":
        img = gradient((48, 58, 84), (20, 24, 38))
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        gdraw.ellipse([-100, 200, W + 100, 1000], fill=(90, 110, 160, 120))
        glow = glow.filter(ImageFilter.GaussianBlur(80))
        img.alpha_composite(glow)
    else:
        # night (mac dinh)
        img = gradient((16, 26, 56), (36, 52, 96))
        draw = ImageDraw.Draw(img)
        for i in range(90):
            x = random_number() * W
            y = random_number() * H * 0.7
            r = 1 + random_number() * 1.6
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 230, int(100 + random_number() * 155)))
        draw.ellipse([60, 90, 170, 200], fill=(250, 240, 200, 255))
    return img


# ---------------- Ve tung loai phan tu (anh goc, chua bien doi) ----------------

icon_cache = {}


def icon_image(name, size_px):
    key = (name, size_px)
    if key in icon_cache:
        return icon_cache[key]
    path = os.path.join(ICON_DIR, name + ".webp")
    if os.path.exists(path):
        img = Image.open(path).convert("RGBA")
        img = img.resize((size_px, size_px), Image.LANCZOS)
    else:
        img = Image.new("RGBA", (size_px, size_px), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        draw.ellipse([0, 0, size_px - 1, size_px - 1], fill=(200, 60, 60, 255))
        draw.text((size_px / 2, size_px / 2), "?", font=font(size_px * 0.6), fill=(255, 255, 255, 255), anchor="mm")
    icon_cache[key] = img
    return img


def wrap_lines(draw, text, fnt, max_width):
    words = text.split(" ")
    lines = []
    current = ""
    for word in words:
        trial = word
        if current != "":
            trial = current + " " + word
        if draw.textlength(trial, font=fnt) <= max_width or current == "":
            current = trial
        else:
            lines.append(current)
            current = word
    if current != "":
        lines.append(current)
    return lines


def text_image(text, size_px, color, box, max_width):
    # Thu nho chu cho toi khi vua chieu ngang
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    size = size_px
    while True:
        fnt = font(size)
        lines = wrap_lines(probe, text, fnt, max_width)
        widest = 0
        for line in lines:
            widest = max(widest, probe.textlength(line, font=fnt))
        if (widest <= max_width and len(lines) <= 3) or size <= 18:
            break
        size = size - 2
    line_height = int(size * 1.28)
    pad = int(size * 0.45)
    width = int(widest) + pad * 2
    height = line_height * len(lines) + pad * 2
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if box:
        draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=int(size * 0.5), fill=(15, 20, 35, 200))
    y = pad
    for line in lines:
        draw.text((width / 2, y + line_height / 2), line, font=fnt, fill=color, anchor="mm",
                  stroke_width=max(2, size // 14), stroke_fill=(10, 12, 20, 255))
        y = y + line_height
    return img


def label_image(text, size_px, color, text_color):
    fnt = font(size_px)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    width = int(probe.textlength(text, font=fnt)) + size_px * 2
    height = int(size_px * 1.9)
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=height // 2, fill=color, outline=(255, 255, 255, 230), width=3)
    draw.text((width / 2, height / 2), text, font=fnt, fill=text_color, anchor="mm")
    return img


def table_image(el, width_px):
    rows = el["rows"]
    row_count = len(rows)
    col_count = len(rows[0])
    cell_w = width_px // col_count
    cell_h = int(cell_w * 0.62)
    size = int(cell_h * 0.32)
    fnt = font(size)
    img = Image.new("RGBA", (cell_w * col_count + 1, cell_h * row_count + 1), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    highlight = []
    for cell in el.get("highlight", []):
        highlight.append((cell[0], cell[1]))
    for r in range(row_count):
        for c in range(col_count):
            x0 = c * cell_w
            y0 = r * cell_h
            fill = (250, 246, 236, 255)
            if r == 0 or c == 0:
                fill = (255, 204, 77, 255)
            if (r, c) in highlight:
                fill = (120, 210, 140, 255)
            draw.rectangle([x0, y0, x0 + cell_w, y0 + cell_h], fill=fill, outline=(30, 30, 40, 255), width=3)
            text = str(rows[r][c])
            line_font = fnt
            while draw.textlength(text, font=line_font) > cell_w - 12 and line_font.size > 12:
                line_font = font(line_font.size - 2)
            draw.text((x0 + cell_w / 2, y0 + cell_h / 2), text, font=line_font, fill=(25, 25, 35, 255), anchor="mm")
    return img


# ---------------- Tinh trang thai phan tu tai thoi diem t ----------------

def element_state(el, t, sec, duration):
    # t: ti le 0..1 trong canh. sec: so giay tu dau canh.
    start = el.get("at", 0.0)
    end = el.get("until", 1.0)
    if t < start or t > end:
        return None
    x = el.get("x", 0.5)
    y = el.get("y", 0.4)
    scale = 1.0
    alpha = 1.0
    angle = el.get("angle", 0.0)
    progress = 1.0

    # Di chuyen lan luot theo danh sach moves
    for move in el.get("moves", []):
        t0 = move["at"][0]
        t1 = move["at"][1]
        if t >= t1:
            x = move["to"][0]
            y = move["to"][1]
        elif t > t0:
            p = ease((t - t0) / max(0.001, t1 - t0), move.get("ease", "inout"))
            x = lerp(x, move["to"][0], p)
            y = lerp(y, move["to"][1], p)
            break
        else:
            break

    if "scale_to" in el:
        st = el["scale_to"]
        p = ease((t - st["at"][0]) / max(0.001, st["at"][1] - st["at"][0]), "inout")
        scale = lerp(1.0, st["to"], p)
    if "rotate_to" in el:
        rt = el["rotate_to"]
        p = ease((t - rt["at"][0]) / max(0.001, rt["at"][1] - rt["at"][0]), "inout")
        angle = angle + rt["to"] * p

    # Hieu ung xuat hien
    enter = el.get("enter", "fade")
    p = (t - start) * duration / ENTER_SEC
    if p < 1:
        q = ease(p, "out")
        if enter == "fade":
            alpha = q
        elif enter == "pop":
            scale = scale * (q * 1.15 if p < 0.7 else lerp(1.15, 1.0, (p - 0.7) / 0.3))
        elif enter == "grow":
            scale = scale * q
        elif enter == "slide_left":
            x = lerp(-0.3, x, q)
        elif enter == "slide_right":
            x = lerp(1.3, x, q)
        elif enter == "slide_up":
            y = lerp(1.0, y, q)
        elif enter == "slide_down":
            y = lerp(-0.2, y, q)
        elif enter == "draw":
            progress = q

    # Hieu ung bien mat
    if end < 1.0:
        p = (end - t) * duration / ENTER_SEC
        if p < 1:
            if el.get("exit", "fade") == "pop":
                scale = scale * max(0.0, p)
            else:
                alpha = alpha * max(0.0, p)

    # Hieu ung lap lai
    for effect in el.get("effects", []):
        name = effect
        window = [0.0, 1.0]
        if isinstance(effect, dict):
            name = effect["name"]
            window = effect.get("at", [0.0, 1.0])
        if t < window[0] or t > window[1]:
            continue
        if name == "bob":
            y = y + math.sin(sec * 2 * math.pi * 1.1) * 0.008
        elif name == "shake":
            x = x + math.sin(sec * 61) * 0.01
            y = y + math.cos(sec * 53) * 0.006
        elif name == "pulse":
            scale = scale * (1 + 0.07 * math.sin(sec * 2 * math.pi * 1.6))
        elif name == "spin":
            angle = angle + sec * 200
        elif name == "wobble":
            angle = angle + math.sin(sec * 2 * math.pi * 1.4) * 12
        elif name == "blink":
            if math.sin(sec * 2 * math.pi * 2) < 0:
                alpha = alpha * 0.35

    return {"x": x, "y": y, "scale": scale, "alpha": alpha, "angle": angle, "progress": progress}


# ---------------- Dat anh len khung ----------------

def paste(frame, img, cx, cy, scale, alpha, angle, flip):
    if scale <= 0.01 or alpha <= 0.01:
        return
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if abs(scale - 1.0) > 0.01:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.BILINEAR)
    if abs(angle) > 0.5:
        img = img.rotate(-angle, resample=Image.BICUBIC, expand=True)
    if alpha < 0.99:
        r, g, b, a = img.split()
        a = a.point(lambda v: int(v * alpha))
        img = Image.merge("RGBA", (r, g, b, a))
    left = int(cx - img.width / 2)
    top = int(cy - img.height / 2)
    # Bo qua neu nam han ngoai khung (vi du dang truot vao tu ngoai)
    if left >= W or top >= H or left + img.width <= 0 or top + img.height <= 0:
        return
    frame.alpha_composite(img, (max(0, left), max(0, top)), (max(0, -left), max(0, -top)))


def draw_arrow(frame, el, state):
    color = hex_color(el.get("color", "#ff5a4f"), int(255 * state["alpha"]))
    x0 = el["from"][0] * W
    y0 = el["from"][1] * H
    x1 = el["to"][0] * W
    y1 = el["to"][1] * H
    p = state["progress"]
    x1 = lerp(x0, x1, p)
    y1 = lerp(y0, y1, p)
    width = int(el.get("width", 0.02) * W)
    length = math.hypot(x1 - x0, y1 - y0)
    if length < 4:
        return
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    ux = (x1 - x0) / length
    uy = (y1 - y0) / length
    head = width * 2.6
    bx = x1 - ux * head
    by = y1 - uy * head
    draw.line([(x0, y0), (bx, by)], fill=color, width=width)
    draw.ellipse([x0 - width / 2, y0 - width / 2, x0 + width / 2, y0 + width / 2], fill=color)
    px = -uy
    py = ux
    draw.polygon([(x1, y1), (bx + px * head * 0.75, by + py * head * 0.75), (bx - px * head * 0.75, by - py * head * 0.75)], fill=color)
    frame.alpha_composite(layer)


# ---------------- Chuan bi va kiem tra storyboard ----------------

def element_base_image(el):
    kind = el.get("type", "icon")
    if kind == "icon":
        return icon_image(el["name"], int(el.get("size", 0.25) * W))
    if kind == "text":
        color = hex_color(el.get("color", "#ffffff"))
        return text_image(el["text"], int(el.get("size", 0.065) * W), color, el.get("box", False), int(el.get("max_width", 0.86) * W))
    if kind == "label":
        return label_image(el["text"], int(el.get("size", 0.04) * W), hex_color(el.get("color", "#ffcc4d")), hex_color(el.get("text_color", "#1b1b26")))
    if kind == "table":
        return table_image(el, int(el.get("size", 0.8) * W))
    return None


def clamp_into_safe_area(el, img):
    # Giu phan tu nam tron trong khung va tren vung phu de
    if img is None:
        return
    half_w = img.width / 2 / W
    half_h = img.height / 2 / H
    def clamp(x, y):
        x = min(max(x, SAFE_LEFT + half_w), SAFE_RIGHT - half_w)
        y = min(max(y, SAFE_TOP + half_h), SAFE_BOTTOM - half_h)
        return x, y
    el["x"], el["y"] = clamp(el.get("x", 0.5), el.get("y", 0.4))
    for move in el.get("moves", []):
        move["to"][0], move["to"][1] = clamp(move["to"][0], move["to"][1])


# ---------------- Canh tu ve ----------------

def find_drawing(folder, name):
    # Tim file ve: thu muc video truoc, thu vien chung sau. Tra ve duong dan hoac None
    places = []
    if folder is not None:
        places.append(os.path.join(folder, "drawings", name + ".py"))
    places.append(os.path.join(DRAW_DIR, name + ".py"))
    for path in places:
        if os.path.exists(path):
            return path
    return None


def load_drawing(path):
    # Nap file .py nhu mot module de goi ham draw
    spec = importlib.util.spec_from_file_location("drawing_" + os.path.basename(path)[:-3], path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def drawing_params(module, scene):
    # Thong so mac dinh cua file ve, ghi de bang params trong storyboard
    params = {}
    defaults = getattr(module, "DEFAULT_PARAMS", {})
    for key in defaults:
        params[key] = defaults[key]
    given = scene.get("params", {})
    for key in given:
        params[key] = given[key]
    return params


def list_drawings(words):
    if not os.path.isdir(DRAW_DIR):
        print("(no drawings yet)")
        return
    for file_name in sorted(os.listdir(DRAW_DIR)):
        if not file_name.endswith(".py") or file_name.startswith("_"):
            continue
        name = file_name[:-3]
        try:
            module = load_drawing(os.path.join(DRAW_DIR, file_name))
            description = getattr(module, "DESCRIPTION", "")
            defaults = getattr(module, "DEFAULT_PARAMS", {})
        except Exception as error:
            description = "(cannot load: %s)" % error
            defaults = {}
        text = (name + " " + description).lower()
        keep = len(words) == 0
        for word in words:
            if word.lower() in text:
                keep = True
        if keep:
            print(name + ": " + description)
            print("    params: " + json.dumps(defaults, ensure_ascii=False))


def check_storyboard(board, names, folder=None):
    problems = []
    if not isinstance(board.get("scenes"), list) or len(board["scenes"]) == 0:
        return ["storyboard.json has no scenes list"]
    for scene in board["scenes"]:
        sid = scene.get("id")
        mode = scene.get("mode", "asset")
        if mode not in ("asset", "draw"):
            problems.append("scene %s: mode must be asset or draw" % sid)
        if mode == "draw":
            name = scene.get("drawing")
            if not name:
                problems.append("scene %s: draw scene needs a drawing name" % sid)
            else:
                path = find_drawing(folder, name)
                if path is None:
                    # Hinh moi: Director ghi draw_brief, Asset viet file sau
                    if not scene.get("draw_brief"):
                        problems.append("scene %s: drawing '%s' does not exist yet; add draw_brief (what to draw and how it moves) or pick one from --drawings" % (sid, name))
                else:
                    try:
                        module = load_drawing(path)
                        if not hasattr(module, "draw"):
                            problems.append("scene %s: %s has no draw(frame, t, sec, duration, params) function" % (sid, path))
                        else:
                            test = Image.new("RGBA", (W, H), (0, 0, 0, 255))
                            params = drawing_params(module, scene)
                            for t in (0.0, 0.5, 1.0):
                                module.draw(test, t, t * 5.0, 5.0, params)
                    except Exception as error:
                        problems.append("scene %s: drawing '%s' fails: %s" % (sid, name, error))
        if scene.get("background", "night") not in BACKGROUNDS:
            problems.append("scene %s: background must be one of %s" % (sid, ", ".join(BACKGROUNDS)))
        icons = 0
        moving = 0
        for i, el in enumerate(scene.get("elements", [])):
            where = "scene %s element %d" % (sid, i + 1)
            kind = el.get("type", "icon")
            if kind not in TYPES:
                problems.append(where + ": type must be one of " + ", ".join(TYPES))
                continue
            if kind == "icon":
                icons = icons + 1
                if el.get("name") not in names:
                    close = difflib.get_close_matches(str(el.get("name")), list(names.keys()), n=4, cutoff=0.5)
                    problems.append(where + ": unknown icon '%s'. Close names: %s. Use --find to search." % (el.get("name"), ", ".join(close)))
            if kind in ("text", "label") and not el.get("text"):
                problems.append(where + ": text is empty")
            if kind == "arrow" and ("from" not in el or "to" not in el):
                problems.append(where + ": arrow needs from and to")
            if kind == "table" and not el.get("rows"):
                problems.append(where + ": table needs rows")
            if el.get("enter", "fade") not in ENTERS:
                problems.append(where + ": enter must be one of " + ", ".join(ENTERS))
            for effect in el.get("effects", []):
                name = effect["name"] if isinstance(effect, dict) else effect
                if name not in EFFECTS:
                    problems.append(where + ": effect must be one of " + ", ".join(EFFECTS))
            if el.get("moves") or el.get("effects") or el.get("scale_to") or el.get("rotate_to"):
                moving = moving + 1
        if mode == "draw":
            continue  # canh tu ve da co chuyen dong, khong bat buoc icon
        if icons == 0:
            problems.append("scene %s: needs at least one icon (pictures, not only text)" % sid)
        if moving == 0:
            problems.append("scene %s: needs at least one element with moves, effects, scale_to or rotate_to" % sid)
    return problems


# ---------------- Dung mot canh ----------------

def audio_seconds(path):
    try:
        f = wave.open(path, "rb")
        seconds = f.getnframes() / float(f.getframerate())
        f.close()
        return seconds
    except Exception:
        out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
        return float(out.decode().strip())


def scene_frames(scene, duration, folder=None):
    # Tra ve ham ve khung hinh thu n, dung chung cho dung video va xem truoc
    background = make_background(scene.get("background", "night"), int(scene.get("id", 1)))
    drawing = None
    params = {}
    if scene.get("mode", "asset") == "draw":
        path = find_drawing(folder, scene.get("drawing", ""))
        if path is not None:
            drawing = load_drawing(path)
            params = drawing_params(drawing, scene)
        else:
            # Hinh chua viet: ve chu bao tam de van xem truoc duoc
            note = text_image("Hình tự vẽ chưa viết: " + str(scene.get("drawing")), int(0.045 * W), (255, 200, 80, 255), True, int(W * 0.86))
            background.alpha_composite(note, (int((W - note.width) / 2), int(H * 0.4)))
    elements = []
    for el in scene.get("elements", []):
        el = json.loads(json.dumps(el))
        img = element_base_image(el)
        if el.get("type") == "counter":
            img = text_image(str(el.get("to", 0)) + el.get("suffix", ""), int(el.get("size", 0.12) * W), hex_color(el.get("color", "#ffcc4d")), False, W)
        clamp_into_safe_area(el, img)
        elements.append((el, img))
    camera = scene.get("camera", [])

    def draw(n):
        sec = n / float(FPS)
        t = sec / duration
        frame = background.copy()
        if drawing is not None:
            result = drawing.draw(frame, t, sec, duration, params)
            if result is not None:
                frame = result.convert("RGBA")
        for el, img in elements:
            state = element_state(el, t, sec, duration)
            if state is None:
                continue
            kind = el.get("type", "icon")
            if kind == "arrow":
                draw_arrow(frame, el, state)
                continue
            if kind == "counter":
                a = el.get("at", 0.0)
                b = el.get("count_until", min(1.0, a + 0.5))
                value = lerp(el.get("from", 0), el.get("to", 0), ease((t - a) / max(0.001, b - a), "out"))
                text = str(int(round(value))) + el.get("suffix", "")
                img = text_image(text, int(el.get("size", 0.12) * W), hex_color(el.get("color", "#ffcc4d")), False, W)
            paste(frame, img, state["x"] * W, state["y"] * H, state["scale"], state["alpha"], state["angle"], el.get("flip", False))
        # Hieu ung may quay
        zoom = 1.0
        shake_x = 0
        shake_y = 0
        flash = 0.0
        for cam in camera:
            window = cam.get("at", [0.0, 1.0])
            if t < window[0] or t > window[1]:
                continue
            p = (t - window[0]) / max(0.001, window[1] - window[0])
            if cam.get("effect") == "zoom":
                zoom = lerp(1.0, cam.get("to", 1.15), ease(p, "inout"))
            elif cam.get("effect") == "shake":
                shake_x = int(math.sin(sec * 70) * 14 * (1 - p))
                shake_y = int(math.cos(sec * 57) * 10 * (1 - p))
            elif cam.get("effect") == "flash":
                flash = max(0.0, 1 - p)
        if zoom > 1.001:
            cw = int(W / zoom)
            ch = int(H / zoom)
            left = (W - cw) // 2
            top = int((H * 0.4) - ch * 0.4)
            frame = frame.crop((left, top, left + cw, top + ch)).resize((W, H), Image.BILINEAR)
        if shake_x != 0 or shake_y != 0:
            moved = Image.new("RGBA", (W, H), (0, 0, 0, 255))
            moved.paste(frame, (shake_x, shake_y))
            frame = moved
        if flash > 0.01:
            white = Image.new("RGBA", (W, H), (255, 255, 255, int(220 * flash)))
            frame.alpha_composite(white)
        return frame.convert("RGB")

    return draw


def render_scene(scene, duration, out_path, folder=None):
    draw = scene_frames(scene, duration, folder)
    total = int(round(duration * FPS))
    tmp_path = out_path + ".tmp.mp4"
    command = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H), "-r", str(FPS),
               "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-an", tmp_path]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    for n in range(total):
        process.stdin.write(draw(n).tobytes())
    process.stdin.close()
    code = process.wait()
    if code != 0:
        raise RuntimeError("ffmpeg failed with code %d for %s" % (code, out_path))
    os.replace(tmp_path, out_path)
    return total


# ---------------- Chuong trinh chinh ----------------

def scene_durations(folder, board, script):
    durations = {}
    for scene in board["scenes"]:
        sid = int(scene["id"])
        audio = os.path.join(folder, "audio", "scene_%02d.wav" % sid)
        if os.path.exists(audio):
            durations[sid] = (audio_seconds(audio), audio_seconds(audio) + PAD_SEC)
        else:
            fallback = 5.0
            if script is not None:
                for s in script.get("scenes", []):
                    if int(s.get("id", 0)) == sid:
                        fallback = float(s.get("duration_sec", 5.0))
            durations[sid] = (None, fallback)
    return durations


def main():
    args = sys.argv[1:]
    if len(args) == 0:
        print(__doc__ or "see the comments at the top of this file")
        return 1
    names = icon_names()

    if args[0] == "--drawings":
        list_drawings(args[1:])
        return 0

    if args[0] == "--find":
        for word in args[1:]:
            word = word.lower()
            found = []
            for slug in ALIASES.get(word, []):
                if slug in names:
                    found.append(slug)
            for slug, info in names.items():
                if (word in slug or word in info["name"].lower()) and slug not in found:
                    found.append(slug)
            print(word + ": " + (", ".join(found[:40]) if found else "(none)"))
        return 0

    folder = args[0].rstrip("/\\")
    board = load_json(os.path.join(folder, "storyboard.json"))
    script = None
    if os.path.exists(os.path.join(folder, "script.json")):
        script = load_json(os.path.join(folder, "script.json"))

    problems = check_storyboard(board, names, folder)
    if len(problems) > 0:
        print("STORYBOARD PROBLEMS:")
        for problem in problems:
            print(" - " + problem)
        if "--check" in args or "--force" not in args:
            return 2
    if "--check" in args:
        print("storyboard OK: %d scenes" % len(board["scenes"]))
        for scene in board["scenes"]:
            if scene.get("mode") == "draw" and find_drawing(folder, scene.get("drawing", "")) is None:
                print("NOTE: scene %s needs a new drawing '%s'. Asset writes %s/drawings/%s.py from draw_brief." % (scene.get("id"), scene.get("drawing"), folder, scene.get("drawing")))
        return 0

    durations = scene_durations(folder, board, script)

    if "--preview" in args:
        thumbs = []
        for scene in board["scenes"]:
            duration = durations[int(scene["id"])][1]
            draw = scene_frames(scene, duration, folder)
            for part in (0.15, 0.5, 0.92):
                thumbs.append(draw(int(duration * FPS * part)).resize((180, 320)))
        cols = 9
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * 184, rows * 324), (30, 30, 30))
        for i, thumb in enumerate(thumbs):
            sheet.paste(thumb, ((i % cols) * 184 + 2, (i // cols) * 324 + 2))
        out = os.path.join(folder, "preview.png")
        sheet.save(out)
        print("preview written: " + out + " (3 frames per scene: start, middle, end)")
        return 0

    only = None
    if "--scene" in args:
        only = int(args[args.index("--scene") + 1])
    os.makedirs(os.path.join(folder, "scenes"), exist_ok=True)
    report = []
    for scene in board["scenes"]:
        sid = int(scene["id"])
        if only is not None and sid != only:
            continue
        audio_sec, duration = durations[sid]
        if scene.get("mode") == "draw" and find_drawing(folder, scene.get("drawing", "")) is None:
            print("ERROR: scene %d needs drawing '%s'. Write %s/drawings/%s.py first (copy tools/drawings/_template.py)." % (sid, scene.get("drawing"), folder, scene.get("drawing")))
            return 3
        out = os.path.join(folder, "scenes", "scene_%02d.mp4" % sid)
        frames = render_scene(scene, duration, out, folder)
        print("scene %d: %.2f s, %d frames -> %s" % (sid, duration, frames, out))
        item = {"id": sid, "mode": scene.get("mode", "asset"), "audio_sec": round(audio_sec, 3) if audio_sec else None, "video_sec": round(frames / float(FPS), 3)}
        if scene.get("mode") == "draw":
            item["drawing"] = scene.get("drawing")
        report.append(item)

    if only is None:
        f = open(os.path.join(folder, "assets.json"), "w", encoding="utf-8")
        json.dump({"scenes": report}, f, ensure_ascii=False, indent=1)
        f.close()
        print("assets.json written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
