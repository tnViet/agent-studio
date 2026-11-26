---
name: video-qc
description: Quality-control guide for the video studio Reviewer - technical checks with ffprobe and ffmpeg (resolution, streams, duration, black frames, silence), visual checks from extracted frames, deciding which stage caused each problem, and writing issues that the next fix round can act on. Use this whenever you review clips/<name>/final/ or write review.json.
---

# Video QC

You decide whether a video is good enough for the user to approve. Each failed review starts a fix round that costs tokens and time (at most 2 rounds per video), so every issue must be real, specific and assigned to the stage that can fix it.

## 1. Technical checks (commands)
Streams, size and duration of each file:
```
ffprobe -v error -show_entries stream=codec_type,width,height -show_entries format=duration -of json clips/<name>/final/video_9x16.mp4
```
Expected sizes: 9x16 720x1280, 1x1 1080x1080, 4x5 1080x1350, 16x9 1920x1080.

Black segments longer than 1 s (prints black_start / black_end):
```
ffmpeg -hide_banner -i clips/<name>/final/video_9x16.mp4 -vf blackdetect=d=1:pix_th=0.10 -an -f null - 2>&1 | findstr black_start
```
Long silences inside the voice (more than 1.5 s, often a missing or broken scene voice):
```
ffmpeg -hide_banner -i clips/<name>/final/video_9x16.mp4 -af silencedetect=n=-40dB:d=1.5 -vn -f null - 2>&1 | findstr silence_
```
Use `grep` instead of `findstr` if the shell is bash.

## 2. Visual checks (look at frames)
Scene start times come from assets.json (sum of previous video_sec). Extract the middle frame of each scene (or at least 3 scenes for long videos):
```
ffmpeg -y -ss <time> -i clips/<name>/final/video_9x16.mp4 -frames:v 1 clips/<name>/work/qc_scene_03.png
```
Open each image and check:
| Check | Fail when |
|---|---|
| Idea | the picture does not show what the narration of that scene says |
| Pictures | only text or boxes in an `asset` scene; a `draw` scene blank, frozen or not matching its draw_brief |
| Framing | something important cut off at an edge, or main subject very small |
| Overlap | text or icons cover each other so they cannot be read |
| Subtitles | text differs from script.json, broken diacritics, a word split badly, covering the main picture |
Compare a frame near the start and near the end of a drawn scene to confirm it moves.

## 3. Assign the stage
| Problem | Stage |
|---|---|
| Wrong, missing or confusing content in what is said | scriptwriter |
| Wrong idea shown, layout, size, overlap, cut-off, no motion, wrong mode | director |
| Missing or broken scene video or voice, wrong length, drawing blank, frozen or wrong | asset |
| Join, sync, subtitles, sound, formats, resolution, black gaps between scenes | editor |
If two stages could fix it, choose the earliest one that is the real cause (a too-small icon is director, not editor).

## 4. Writing issues
One issue per problem, observable and measurable, with scene ids:
- Good: `{"stage": "director", "scenes": [5], "problem": "interference bands fill only the top 20% of the frame; should fill y 0.15-0.75"}`
- Bad: `{"stage": "director", "scenes": [], "problem": "pictures could be nicer"}`
Describe what is wrong and what is expected; do not write the fix steps.

## 5. Pass or fail
- Any technical check failing: fail.
- Visual: fail only for problems a viewer would notice (idea unclear, cut off, unreadable, blank, frozen, wrong subtitle). Taste notes (colors could be nicer) go into the check `detail` and do not fail the video, because a failed review starts a costly round.
- In a "Review round N": first check that every issue from the previous review.json is fixed, then run the full checks again; a fix can break something else.
