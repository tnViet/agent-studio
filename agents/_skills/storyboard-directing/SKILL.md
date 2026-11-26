---
name: storyboard-directing
description: Directing guide for turning script.json into storyboard.json (version 2) in the video studio - shot size, composition, screen direction, motion vocabulary, syncing pictures to narration, and choosing between icon scenes and drawn simulations. Use this whenever you write or edit a storyboard, and when you write a draw_brief.
---

# Storyboard directing

`tools/STORYBOARD.md` says what the fields are. This skill says how to use them so each scene reads like a planned shot and not a slide.

## 1. Film language mapped to storyboard fields
| Film term | Meaning | In storyboard.json |
|---|---|---|
| Establishing / wide shot | Where are we, who is there | `background` + 2 to 4 icons, size 0.15 to 0.22 |
| Medium shot | One or two subjects doing something | main icons size 0.3 to 0.4 |
| Close-up | One thing matters now | one icon size 0.5 to 0.6, or `scale_to` 1.5 |
| Push-in | Slowly draw attention | camera `zoom` to 1.1 to 1.2 over most of the scene |
| Punch-in | Sudden emphasis on a key word | camera `zoom` to 1.25 over a short window, e.g. [0.55, 0.65] |
| Reveal | Something appears on its beat | element `at` > 0 with `enter: pop` or `grow` |
| Impact | Hit, crash, sudden change | `pop` + effect `shake` + camera `shake` and `flash` |
| Cut | Scene change | every scene boundary is a hard cut; plan contrast between neighbours |

## 2. Composition
- Safe area: main action between y 0.15 and 0.75; text near y 0.08 to 0.12 or just above 0.75. Below 0.78 is subtitles.
- Rule of thirds: put subjects at x 0.33 or 0.67, not always at 0.5. Center only for a single hero subject.
- Fill the frame. Avoid "thumbnail syndrome": the main subject should be at least 0.3 of the width. Tiny icons in a big empty frame read as a mistake.
- One focal point at a time. Emphasize with size, motion, a label or a camera move; at most 3 elements moving at the same moment.

## 3. Screen direction and continuity
- Vehicles and animals face LEFT by default; `flip: true` faces right.
- Keep a subject moving the same way across consecutive scenes (180-degree rule). Progress, time and "forward" go left to right.
- The same character or object keeps the same icon, side of frame and color in every scene it appears. Keep one background through a sequence of related scenes; change it to mark a new section.

## 4. Sync pictures to the narration (beats)
Times are fractions of the scene. To place an element on a word: count the syllables before that word in the scene's narration, divide by the total syllables, subtract 0.03 so the picture arrives just before the word. Example: the key word is syllable 12 of 24 -> `at: 0.47`.
Something should change about every 3 seconds: a 10 s scene needs at least 3 beats (appear, move, emphasize).

## 5. Motion vocabulary
| Idea in the narration | Motion |
|---|---|
| Two things meet or compete | icons start apart, `moves` toward each other, `ease: in` |
| Growth, rise, success | `moves` upward, `scale_to` > 1, `counter` |
| Decline, loss | `moves` down, `exit: fade`, smaller `scale_to` |
| Choice between options | two icons side by side, `label` under each, highlight the chosen one with `pulse` |
| Cause and effect | `arrow` with `enter: draw` from cause to effect |
| Comparison of numbers | `table` with `highlight`, or two `counter` elements |
| Waiting, thinking | small `bob` or `wobble`, slow push-in |
Every `asset` scene needs at least one moving element. Do not repeat the narration as on-screen text; text is for numbers, names and short labels (at most 2 text elements, at most 6 words each).

## 6. asset or draw
Choose `draw` when the meaning is in the motion or shape of something icons cannot show correctly: waves, interference, fields, orbits, graphs, probability. Choose `asset` for objects, people, animals, places. Follow brief.md if the user asked for one or the other.
Reuse first: `python tools/render_scenes.py --drawings`, then change `params`. A new drawing costs Asset many tokens: at most 3 per video.
Labels on a drawn scene (for example "cực đại") go in the scene's `elements`, not inside the drawing, so text uses the studio font and can be changed without code.

### Writing a draw_brief (for a new drawing)
Four short parts, English:
1. What is drawn: shapes, colors, where on screen (fractions).
2. How it moves over the scene: phases by t (for example 0-0.2 sources appear, 0.2-0.8 waves spread, 0.8-1 hold).
3. What the viewer must notice: the one thing the narration is about.
4. Params it should take, with sensible defaults, so it can be reused.
Example: "Two point sources S1 and S2 at (0.3,0.4) and (0.7,0.4) and a point P at (0.55,0.65). Draw segment S1-P in blue and S2-P in orange, growing from the sources during t 0.1-0.5, then both pulse once at t 0.6. The viewer must see that the two distances differ. Params: s1, s2, p, color_1, color_2."

## 7. Before handing off
Run `--check`, then `--preview` and look at every scene in preview.png:
- Is the idea of the scene readable without sound?
- Is anything overlapping, cut off, or too small?
- Does something move, and on the right beat?
- Is any on-screen text just repeating the subtitle?
Fix and preview again until all answers are good.
