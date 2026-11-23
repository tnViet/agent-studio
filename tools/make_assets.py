# Asset agent: voice + silent scene videos for one clip folder.
# Run from D:\agent-studio:  python tools\make_assets.py clips\VIEA-7
import json, os, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 720, 1280, 30
folder = sys.argv[1]
only = [int(x) for x in sys.argv[2:]]  # optional scene ids to redo

script = json.load(open(f"{folder}/script.json", encoding="utf-8"))
sb = json.load(open(f"{folder}/storyboard.json", encoding="utf-8"))
pal = {k: tuple(v) for k, v in sb["palette"].items()}
os.makedirs(f"{folder}/audio", exist_ok=True)
os.makedirs(f"{folder}/scenes", exist_ok=True)

FB = "C:/Windows/Fonts/arialbd.ttf"
FR = "C:/Windows/Fonts/arial.ttf"


def probe(path, entries):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", entries,
                          "-of", "json", path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def dur(path):
    return float(probe(path, "format=duration")["format"]["duration"])


def mix(c, a):
    return tuple(int(pal["bg"][i] + (c[i] - pal["bg"][i]) * a) for i in range(3))


def fit_font(d, text, w, h, path, start):
    size = start
    while size > 16:
        f = ImageFont.truetype(path, size)
        lines = wrap(d, text, f, w)
        if len(lines) * size * 1.2 <= h:
            return f, lines, size
        size -= 2
    f = ImageFont.truetype(path, 16)
    return f, wrap(d, text, f, w), 16


def wrap(d, text, f, w):
    lines = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split(" "):
            t = (cur + " " + word).strip()
            if d.textlength(t, font=f) <= w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def draw_lines(d, lines, f, size, x, y, w, h, fill):
    lh = size * 1.2
    ty = y + (h - lh * len(lines)) / 2
    for ln in lines:
        d.text((x + (w - d.textlength(ln, font=f)) / 2, ty), ln, font=f, fill=fill)
        ty += lh


def draw_el(img, el, t):
    st = min(el.get("start_sec", 0), max(0, TOTAL - 0.6))  # keep late elements visible
    if t < st:
        return
    p = min(1.0, (t - st) / 0.5)
    anim = el.get("animation", "none")
    x, y, w, h = el["x"], el["y"], el["w"], el["h"]
    a = 1.0
    if anim == "fade_in":
        a = p
    elif anim == "slide_right":
        x = x - 300 * (1 - p)
    elif anim == "slide_left":
        x = x + 300 * (1 - p)
    d = ImageDraw.Draw(img)
    typ = el["type"]
    txt = el.get("text", "")
    if typ == "text":
        f, lines, s = fit_font(d, txt, w, h, FB, 60)
        draw_lines(d, lines, f, s, x, y, w, h, mix(pal["text"], a))
    elif typ == "box":
        d.rounded_rectangle([x, y, x + w, y + h], 16, fill=mix(pal["main"], a))
        f, lines, s = fit_font(d, txt, w - 20, h - 20, FB, 44)
        draw_lines(d, lines, f, s, x, y, w, h, mix(pal["text"], a))
    elif typ == "arrow":
        cy = y + h / 2
        c = mix(pal["accent"], a)
        d.line([x, cy, x + w - 20, cy], fill=c, width=10)
        d.polygon([(x + w, cy), (x + w - 30, cy - 25), (x + w - 30, cy + 25)], fill=c)
    elif typ == "table":
        rows = [r.split("|") for r in txt.split("\n")]
        nr, nc = len(rows), len(rows[0])
        cw, ch = w / nc, h / nr
        f = ImageFont.truetype(FB, 40)
        for i, r in enumerate(rows):
            for j, cell in enumerate(r):
                cx, cy = x + j * cw, y + i * ch
                fillc = mix(pal["main"], a * (0.5 if i == 0 or j == 0 else 0.25))
                d.rectangle([cx, cy, cx + cw, cy + ch], fill=fillc,
                            outline=mix(pal["text"], a), width=3)
                f2, lines, s = fit_font(d, cell, cw - 10, ch - 10, FB, 40)
                draw_lines(d, lines, f2, s, cx, cy, cw, ch, mix(pal["text"], a))


def render(scene, secs, out):
    global TOTAL
    TOTAL = secs
    n = int(round(secs * FPS))
    cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264",
           "-pix_fmt", "yuv420p", "-r", str(FPS), out]
    pr = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        img = Image.new("RGB", (W, H), pal["bg"])
        for el in scene["elements"]:
            draw_el(img, el, i / FPS)
        pr.stdin.write(img.tobytes())
    pr.stdin.close()
    if pr.wait() != 0:
        raise RuntimeError("ffmpeg failed")


# --- voice ---
need_tts = [s for s in script["scenes"] if (not only or s["id"] in only)
            and not os.path.exists(f"{folder}/audio/scene_{s['id']:02d}.wav")]
if need_tts:
    from vieneu import Vieneu
    tts = Vieneu()
    for s in need_tts:
        audio = tts.infer(text=s["narration"])
        tts.save(audio, f"{folder}/audio/scene_{s['id']:02d}.wav")
        print("tts", s["id"], flush=True)

# --- video ---
result = []
for s in script["scenes"]:
    i = s["id"]
    ap = f"{folder}/audio/scene_{i:02d}.wav"
    vp = f"{folder}/scenes/scene_{i:02d}.mp4"
    a = dur(ap)
    if not only or i in only or not os.path.exists(vp):
        scene = next(x for x in sb["scenes"] if x["id"] == i)
        for attempt in (1, 2):
            try:
                render(scene, a + 0.3, vp)
                break
            except Exception as e:
                print("scene", i, "attempt", attempt, "failed:", e)
                if attempt == 2:
                    raise SystemExit(f"SCENE FAILED: {i}")
    v = dur(vp)
    st = probe(vp, "stream=width,height,r_frame_rate")["streams"][0]
    assert (st["width"], st["height"], st["r_frame_rate"]) == (W, H, "30/1"), st
    assert abs(v - (a + 0.3)) <= 0.1, (i, v, a)
    result.append({"id": i, "audio_sec": round(a, 2), "video_sec": round(v, 2)})
    print("scene", i, a, v, flush=True)

json.dump({"scenes": result}, open(f"{folder}/assets.json", "w"), indent=1)
print("total audio", round(sum(r["audio_sec"] for r in result), 2))
