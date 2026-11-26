# Tao giong doc tieng Viet cho tung canh bang goi vieneu.
# Cach dung (chay tu D:\agent-studio):
#   python tools/make_voice.py clips/VIEA-30            tao file con thieu
#   python tools/make_voice.py clips/VIEA-30 --redo     tao lai tat ca
# Doc narration trong script.json, ghi audio/scene_01.wav, scene_02.wav, ...
import json
import os
import sys
import wave

folder = sys.argv[1].rstrip("/\\")
redo = "--redo" in sys.argv

f = open(os.path.join(folder, "script.json"), encoding="utf-8")
script = json.load(f)
f.close()
os.makedirs(os.path.join(folder, "audio"), exist_ok=True)

tts = None
for scene in script["scenes"]:
    sid = int(scene["id"])
    out = os.path.join(folder, "audio", "scene_%02d.wav" % sid)
    if os.path.exists(out) and not redo:
        print("scene %d: already exists, skip" % sid)
        continue
    if tts is None:
        from vieneu import Vieneu
        tts = Vieneu()
    audio = tts.infer(text=scene["narration"])
    tts.save(audio, out)
    w = wave.open(out, "rb")
    seconds = w.getnframes() / float(w.getframerate())
    w.close()
    print("scene %d: %.2f s -> %s" % (sid, seconds, out))
print("voice done")
