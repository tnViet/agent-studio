# Test Vietnamese voice. Run from D:\agent-studio:  python tools\test_tts.py
from vieneu import Vieneu

tts = Vieneu()

text = "Bài toán người tù. Hai người bị bắt, mỗi người phải chọn im lặng hay khai. Chọn thế nào mới là tốt nhất?"
audio = tts.infer(text=text)
tts.save(audio, "clips/test_voice.wav")

print("Done: clips/test_voice.wav")
