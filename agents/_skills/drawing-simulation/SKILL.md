---
name: drawing-simulation
description: How to write, test and reuse a drawn simulation (a Python draw() file) for a "draw" scene in the video studio - waves, interference, graphs, orbits and other phenomena that icons cannot show. Use this whenever --check prints a NOTE about a new drawing, or a storyboard scene has "mode": "draw" with a drawing that does not exist yet.
---

# Drawn simulation

A drawing is a small Python file that paints one frame. `tools/render_scenes.py` calls it 30 times per second of the scene, then draws the storyboard `elements` (labels, arrows) on top. Good drawings are reused by later videos, so write them general, not for one sentence.

## Contract
```python
DESCRIPTION = "English, one or two sentences: what it shows and what the params change."
DEFAULT_PARAMS = {...}          # every param with a sensible default
def draw(frame, t, sec, duration, params):
    # frame: RGBA image 720x1280, already has the background
    # t: 0 at scene start, 1 at scene end; sec: seconds from scene start; duration: scene length in seconds
    # draw on frame and return None, or return a new RGBA image of the same size
```
Rules (also at the top of `tools/drawings/_template.py`): only Pillow, numpy and math; no file reading, no network; content between y 0.04*H and 0.78*H; each frame under 0.1 s; motion computed from t or sec only (frames may be drawn out of order).

## Workflow
1. Read the scene's `draw_brief`, brief.md, and the narration of that scene in script.json: the drawing must show what the voice says at that moment.
2. Copy `tools/drawings/_template.py` to `clips/<name>/drawings/<drawing>.py`. Look at `tools/drawings/interference.py` (numpy grid) and `wave.py` (lines) as patterns.
3. Write DESCRIPTION, DEFAULT_PARAMS, then draw(). Read params with `params["key"]`; the tool merges storyboard params over DEFAULT_PARAMS.
4. Test one scene only: `python tools/render_scenes.py clips/<name> --scene <id>`, then `--preview` and look at that scene's start, middle and end frames.
5. Fix and retry, at most 3 tries in total. After 3 failed tries stop and report (see your AGENTS.md).
6. If it works and is reusable, copy it to `tools/drawings/<drawing>.py` (never overwrite an existing file; choose a new name) and add a row to `tools/drawings/README.md`.

## Craft
- Stage the motion in phases of t, like a shot: setup (0 to 0.15, things appear), main action (0.15 to 0.8), hold (0.8 to 1, the result stays still enough to read). A drawing that keeps changing until the cut feels rushed.
- Ease phase changes: `e = p * p * (3 - 2 * p)` for p in 0..1 is smooth start and stop.
- For continuous oscillation (waves) use `sec` so speed does not depend on scene length; for staging use `t`.
- Make the important thing obvious: high contrast on a dark background, line width at least 4 px, two compared things in clearly different colors (for example #4fc3f7 and #ff8a65), the result in white.
- Use as much of the safe area as the idea needs; small drawings look like mistakes on a phone.
- Do not draw text inside the drawing. Labels belong to storyboard `elements` (Director adds them) so they use the studio font. If the brief asks for text in the drawing, say in your comment that it should be a label element.
- Randomness must be repeatable: `numpy.random.default_rng(7)` created inside draw(), never global random state.

## Speed
Never loop over pixels in Python. For fields (interference, heat maps) compute on a coarse numpy grid (step 3 to 6 px) with `meshgrid`, color it, then `Image.fromarray(...).resize(...)` and paste, like interference.py. For curves, compute the points with numpy or a loop over 200 to 400 x values and draw one `line`.

## Common failures
| Symptom in preview | Usual cause |
|---|---|
| Blank scene | drawing outside the frame, color equal to background, alpha 0, or returned a wrong-size image |
| Frozen picture | position does not depend on t or sec |
| Cut off at the bottom | something drawn below 0.78*H |
| Render very slow | per-pixel Python loop |
| Flicker | random values change every frame |
| `--check` error "has no draw(...)" | wrong function name or signature |

## Comment
Say which drawings you wrote, which you added to the library, the params you chose, and anything still imperfect.
