# Test scene: 5 seconds, 720x1280 (9:16), 30 fps.
# Run from D:\agent-studio:  python tools\test_scene.py
from PIL import Image, ImageDraw, ImageFont
import os

W = 720
H = 1280
FPS = 30
SECONDS = 5
BG = (20, 30, 60)
WHITE = (255, 255, 255)

os.makedirs("clips/test_frames", exist_ok=True)

font_big = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 64)
font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 44)

total_frames = FPS * SECONDS

for i in range(total_frames):
    t = i / FPS
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # 1) Title fades in during the first second
    a = t / 1.0
    if a > 1:
        a = 1
    r = int(BG[0] + (WHITE[0] - BG[0]) * a)
    g = int(BG[1] + (WHITE[1] - BG[1]) * a)
    b = int(BG[2] + (WHITE[2] - BG[2]) * a)
    title = "Bài toán người tù"
    w = d.textlength(title, font=font_big)
    d.text(((W - w) / 2, 200), title, font=font_big, fill=(r, g, b))

    # 2) Two boxes slide in from the sides between 1.0s and 2.5s
    p = (t - 1.0) / 1.5
    if p < 0:
        p = 0
    if p > 1:
        p = 1
    xa = -300 + (40 - (-300)) * p
    xb = W + ((W - 340) - W) * p
    d.rectangle([xa, 500, xa + 300, 800], fill=(60, 110, 200))
    d.rectangle([xb, 500, xb + 300, 800], fill=(200, 90, 90))
    d.text((xa + 40, 630), "Người tù A", font=font_small, fill=WHITE)
    d.text((xb + 40, 630), "Người tù B", font=font_small, fill=WHITE)

    # 3) Question fades in between 3.0s and 4.0s
    q = t - 3.0
    if q < 0:
        q = 0
    if q > 1:
        q = 1
    r = int(BG[0] + (WHITE[0] - BG[0]) * q)
    g = int(BG[1] + (WHITE[1] - BG[1]) * q)
    b = int(BG[2] + (WHITE[2] - BG[2]) * q)
    text = "Im lặng hay khai?"
    w = d.textlength(text, font=font_big)
    d.text(((W - w) / 2, 950), text, font=font_big, fill=(r, g, b))

    name = "clips/test_frames/f_%04d.png" % i
    img.save(name)

print("Done:", total_frames, "frames")
