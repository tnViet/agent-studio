---
name: studio-rework
description: How to do a "Fix round N" task in the video studio, a correction after Reviewer failed a video or the user asked for a change. Use this whenever the task title starts with "Fix round", for Scriptwriter, Director, Asset or Editor.
---

# Rework (Fix round)

A fix round is a pick-up: the video already exists and only some scenes are wrong. The goal is to fix exactly what was reported and keep everything else identical, so the next stages can rebuild without surprises and Reviewer can compare.

## Read first
1. The `Fix:` lines in the task description. They are the scope of your work.
2. `<Video folder>/review.json` if it exists: the issues whose `stage` is your role, with their scene ids and problem text.
3. `<Video folder>/brief.md`: lines ending with "(user)" are wishes the user added later and still apply.

## Rules
- Change only the scenes named in the Fix lines or in your review issues. Leave other scenes byte-for-byte the same (continuity: same icons, positions, timing).
- A Fix line that says "rebuild with the new files from the previous step" means: run your normal steps again on the current input files, change nothing by hand.
- Overwrite the old output files. Same output, same done criteria as a normal task.
- If a problem belongs to another stage (for example a subtitle typo reported to Director), do your part, and say in the comment which stage should fix the rest.
- If you cannot fix a problem, say why in the comment and set the task blocked with the reason "Cannot fix: <short reason>".

## What to redo by role
| Role | Redo |
|---|---|
| Scriptwriter | Rewrite only the named scenes; keep total duration rules; post the whole new script as usual. |
| Director | Edit only the named scenes in storyboard.json, then run `--check` and `--preview` again and look at the preview. |
| Asset | Run voice, check, drawings and render again. If a Fix line is about the voice of some scenes, delete those `audio/scene_XX.wav` first so they are made again. |
| Editor | Rebuild all four final files and subs.ass from the current scenes and audio. |

## Comment
Start with `Fix round N:` then one line per change: `Scene 3: icons made bigger (0.25 -> 0.4)`. Name anything you could not fix.
