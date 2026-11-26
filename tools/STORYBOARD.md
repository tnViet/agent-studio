# Storyboard format (version 2)

`clips/<name>/storyboard.json` is rendered by `tools/render_scenes.py`. The canvas is 720x1280 (9:16).
All positions and sizes are fractions: x and size are fractions of the width, y is a fraction of the height.
All times (`at`, `until`, move windows) are fractions of the scene: 0 = scene start, 1 = scene end.
The real scene length comes from the voice file, so never write seconds.

The bottom 22% of the frame (y > 0.78) is reserved for subtitles. The tool keeps every element above it
and inside the left and right edges, so nothing is cut off.

## Top level

```json
{"version": 2, "scenes": [ ...one object per scene in script.json, same id... ]}
```

## Scene

| Field | Meaning |
|---|---|
| `id` | same id as in script.json |
| `mode` | `asset` (default): pictures from the icon library. `draw`: a drawn simulation, see "Drawn scenes" |
| `background` | `night`, `day`, `sunset`, `space`, `sea`, `road`, `paper`, `studio` |
| `elements` | list of elements, drawn in order (later = on top) |
| `camera` | optional list: `{"effect": "zoom", "to": 1.15, "at": [0.2, 1]}`, `{"effect": "shake", "at": [0.6, 0.9]}`, `{"effect": "flash", "at": [0.6, 0.7]}` |

## Element types

| type | Required fields | Optional fields |
|---|---|---|
| `icon` | `name` (from the icon library), `x`, `y` | `size` (default 0.25), `flip` (mirror left-right), `angle` (degrees) |
| `text` | `text`, `x`, `y` | `size` (default 0.065), `color` (#rrggbb, default white), `box` (dark rounded background), `max_width` (default 0.86) |
| `label` | `text`, `x`, `y` | `size` (default 0.04), `color` (pill color), `text_color` |
| `arrow` | `from` [x, y], `to` [x, y] | `color`, `width` (default 0.02) |
| `counter` | `from`, `to`, `x`, `y` | `suffix` (for example "%"), `size` (default 0.12), `color`, `count_until` |
| `table` | `rows` (list of rows, first row and first column are headers), `x`, `y` | `size` (table width, default 0.8), `highlight` ([[row, col], ...]) |

Common timing and motion fields for every element:

| Field | Meaning |
|---|---|
| `at` | when it appears (default 0) |
| `until` | when it disappears (default 1 = stays to the end) |
| `enter` | `none`, `fade` (default), `pop`, `grow`, `slide_left`, `slide_right`, `slide_up`, `slide_down`, `draw` (arrows) |
| `exit` | `fade` (default) or `pop`, used when `until` < 1 |
| `moves` | list of `{"to": [x, y], "at": [start, end], "ease": "in" / "out" / "inout" / "linear"}`, played in order |
| `scale_to` | `{"to": 1.6, "at": [start, end]}` grow or shrink |
| `rotate_to` | `{"to": 90, "at": [start, end]}` turn by degrees |
| `effects` | list of `bob`, `shake`, `pulse`, `spin`, `wobble`, `blink`, or `{"name": "shake", "at": [0.6, 1]}` |

## Icon library

About 1300 colorful 3D pictures (Noto Emoji): people, faces, animals, vehicles, buildings, food, tools,
weapons, money, flags of major countries, symbols. Find names with:

```
python tools/render_scenes.py --find car rocket flag money
```

Vehicles and animals face LEFT. To make one face right, set `"flip": true`.

## Drawn scenes (`"mode": "draw"`)

Use a drawn scene when the idea is a physical or mathematical phenomenon that icons cannot show correctly:
waves meeting, interference, graphs of a function, orbits, fields, growth curves, probability simulations.
Use `asset` for objects, people, animals and places.

| Field | Meaning |
|---|---|
| `drawing` | name of a drawing: a file `tools/drawings/<name>.py` (shared library) or `clips/<video>/drawings/<name>.py` (this video only) |
| `params` | values for the drawing; anything not given uses the drawing's DEFAULT_PARAMS |
| `draw_brief` | only for a NEW drawing that does not exist yet: English, what to draw, how it moves over the scene, what the viewer must notice, which params it should take. Asset writes the file from it |
| `background` | still used under the drawing |
| `elements` | optional, drawn on top of the drawing (text, label, arrow, icon). No icon is required in a drawn scene |

Find existing drawings first: `python tools/render_scenes.py --drawings` (or `--drawings wave`). Reuse them by changing params.
Make a new drawing only when nothing fits; at most 3 new drawings per video, because each costs tokens.
`--check` prints a NOTE (not a problem) for a new drawing that is not written yet, and `--preview` shows a placeholder for it.

```json
{"id": 4, "mode": "draw", "drawing": "interference", "background": "night",
 "params": {"sources": [[0.3, 0.4], [0.7, 0.4]], "starts": [0.0, 0.25]},
 "elements": [{"type": "label", "text": "Vân sáng", "x": 0.5, "y": 0.72, "at": 0.6}]}
```

## Rules for a good scene

- Show the idea with pictures. Every `asset` scene needs at least one icon and at least one moving element (moves, effects, scale_to or rotate_to).
- At most 2 text elements per scene, each at most 6 words. The narration is already shown as subtitles, so do not repeat it on screen.
- Tell the story with motion: things that meet move toward each other, a crash uses `collision` with `pop` plus a camera `shake` and `flash`, rising things move up, a choice uses two icons side by side with labels.
- Keep the main action between y = 0.15 and y = 0.75.

## Example scene

```json
{"id": 1, "background": "road", "elements": [
  {"type": "text", "text": "Nửa đêm", "x": 0.5, "y": 0.1, "size": 0.08, "enter": "pop"},
  {"type": "icon", "name": "automobile", "x": 0.18, "y": 0.62, "size": 0.3, "flip": true, "enter": "slide_left",
   "moves": [{"to": [0.4, 0.62], "at": [0.15, 0.95], "ease": "in"}], "effects": ["bob"]},
  {"type": "icon", "name": "racing_car", "x": 0.82, "y": 0.62, "size": 0.3, "enter": "slide_right",
   "moves": [{"to": [0.6, 0.62], "at": [0.15, 0.95], "ease": "in"}], "effects": ["bob"]},
  {"type": "label", "text": "Xe A", "x": 0.18, "y": 0.48, "at": 0.1, "until": 0.6}
 ],
 "camera": [{"effect": "zoom", "to": 1.12, "at": [0.3, 1.0]}]}
```

## Commands

```
python tools/render_scenes.py clips/<name> --check     validate, prints problems and close icon names
python tools/render_scenes.py clips/<name> --preview   writes clips/<name>/preview.png (start, middle, end of each scene)
python tools/render_scenes.py clips/<name>             renders scenes/scene_XX.mp4 and writes assets.json
python tools/render_scenes.py clips/<name> --scene 3   renders only scene 3
python tools/render_scenes.py --drawings [word]        lists drawings in tools/drawings with their params
```
