---
name: video-finishing
description: Finishing guide for the video studio Editor - joining scene clips, keeping voice in sync, timing and breaking Vietnamese subtitles, burning them in, and exporting the four delivery formats with ffmpeg on Windows. Use this whenever you build or rebuild the files in clips/<name>/final/.
---

# Video finishing

The 9:16 file is the master; the other three are conformed from it. Everything is checked with ffprobe before you hand off.

## Inputs
- `scenes/scene_XX.mp4`: silent, 720x1280, 30 fps, length = voice + 0.3 s.
- `audio/scene_XX.wav`: the voice of each scene.
- `assets.json`: `audio_sec` and `video_sec` per scene.
- `script.json`: narration text for subtitles.

## 1. Keep voice in sync
Each scene video is 0.3 s longer than its voice. If you only concatenate the wav files, scene 2's voice starts 0.3 s early and the drift grows every scene. Pad every voice to its scene length first:
```
ffmpeg -y -i audio/scene_01.wav -af apad -t <video_sec of scene 1> work/a_01.wav
```
Then concatenate the padded files with the concat demuxer.

## 2. Join
List files use forward slashes and paths relative to the list file:
```
file 'scene_01.mp4'
file 'scene_02.mp4'
```
```
ffmpeg -y -f concat -safe 0 -i work/scenes.txt -c copy work/video.mp4
ffmpeg -y -f concat -safe 0 -i work/audio.txt -c:a pcm_s16le work/voice.wav
ffmpeg -y -i work/video.mp4 -i work/voice.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 160k -shortest work/joined.mp4
```

## 3. Subtitles (subs.ass)
- Use the style line from your AGENTS.md unchanged (PlayResX 720, PlayResY 1280, bottom margin keeps text inside the reserved bottom 22%).
- Timing per scene: start = sum of video_sec of the previous scenes; the scene's text spans its audio_sec.
- Break each narration into chunks of at most about 28 characters (one line) and split the scene time between chunks in proportion to their syllables.
- Break at punctuation or phrase boundaries. Never split a Vietnamese compound word or name ("bảo vệ", "giao thoa", "Việt Nam" stay together) and avoid a chunk of a single word.
- Copy the text exactly, with full diacritics. Save subs.ass as UTF-8.

## 4. Burn in and export
Burn subtitles only on the master, in the last video step:
```
ffmpeg -y -i work/joined.mp4 -vf "subtitles=clips/<name>/final/subs.ass:fontsdir=tools/assets/fonts" -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p -c:a copy -movflags +faststart final/tmp_9x16.mp4
```
Conform the other formats from the master by scaling to fit and padding with the background color (letterbox or pillarbox), never stretching:
| File | Size |
|---|---|
| video_9x16.mp4 | 720x1280 |
| video_1x1.mp4 | 1080x1080 |
| video_4x5.mp4 | 1080x1350 |
| video_16x9.mp4 | 1920x1080 |
```
-vf "scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2:color=<background>,setsar=1"
```
Write to a temporary name ending in .mp4 and rename only when ffmpeg exits with code 0, so a half-written file never looks finished.

## 5. Verify
```
ffprobe -v error -show_entries stream=codec_type,width,height -show_entries format=duration -of json final/video_9x16.mp4
```
Check each file: expected size, one video and one audio stream, duration within 0.5 s of the sum of video_sec. Extract one frame from the middle of two scenes and look at the subtitles (diacritics, not cut, not covering pictures).

## Glossary
- Master: the main export every other version is made from.
- Conform: make a version for another frame size.
- Burn-in: subtitles drawn into the picture (cannot be turned off).
- Letterbox / pillarbox: bars added top-bottom / left-right to fit a frame.
- Sync drift: voice slowly getting ahead of or behind the pictures.
