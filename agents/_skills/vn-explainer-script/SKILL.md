---
name: vn-explainer-script
description: Craft guide for writing a Vietnamese voice-over script for a short explainer video (30 to 300 seconds) - structure, pacing, narration that reads well with TTS, and visual intent per scene. Use this whenever you write or rewrite script.json in the video studio.
---

# Vietnamese explainer script

The script is the spine of the video. Every later stage builds on it: Director turns each `visual` into pictures, Asset turns each `narration` into voice, Editor turns it into subtitles. A clear script makes every later stage cheaper.

## 1. Plan before writing
Write these four lines for yourself (not in the file):
- Core message: the one sentence the viewer must remember.
- Audience: who watches (from the task or brief.md). Default: secondary-school students and curious adults.
- Entry angle: an everyday situation or question that leads into the topic.
- Knowledge order: what must be understood before what (staircase). Never mention a concept before you explain it.

## 2. Structure (story arc)
| Beat | Share of time | Job |
|---|---|---|
| Hook | first scene, at most 5 s | A question or surprise from daily life. No greeting, no "hôm nay chúng ta sẽ". |
| Setup | ~15% | The minimum background the viewer needs. |
| Build | ~45% | One new idea per scene, each raising the next question. |
| Aha / payoff | ~15% | The key insight, shown clearly. Give it a full scene. |
| Real life | ~15% | Where the viewer meets it (call-back to the hook if possible). |
| Close | last scene | One-line takeaway or an open question. No "hãy like và subscribe" unless brief.md asks. |

Use one central metaphor through the whole video if it helps; do not mix metaphors.

## 3. Pacing
- Vietnamese TTS speaks about 4.5 syllables per second. A syllable is one word between spaces ("giao thoa" = 2).
- Count syllables for every scene: about duration_sec x 4.5 (5 s = 21 to 24, 8 s = 34 to 38, 10 s = 43 to 47). Too short leaves silent pictures; too long rushes the voice.
- At most about 2 new concepts per minute. A hard concept gets a longer scene, not more words.

## 4. Narration that sounds good
- Short sentences, at most about 15 syllables each, one idea per sentence.
- Everyday words first, then the term: "hai sóng chồng lên nhau, người ta gọi là giao thoa".
- Write numbers, symbols and formulas as spoken words, because the voice engine may read them wrong: "λ" -> "lam-đa", "d2 − d1" -> "hiệu hai quãng đường", "50%" -> "năm mươi phần trăm", "k" -> "một số nguyên".
- No parentheses, slashes, bullet marks, emoji, English abbreviations or quotes inside narration; they are read aloud or break the voice.
- Punctuation is pacing: comma = short pause, period = medium pause, question mark = rising voice. Avoid "..." (unreliable pause).
- Follow the tone in brief.md (for example "mình - bạn", friendly). Keep the same pronouns in every scene.

## 5. Visual intent (`visual`, English)
Write what the camera sees, not what the narration says. Director turns it into icons or a drawn simulation.
- Show, don't tell: "a rocket lifts off and the flame grows", not "text: rockets are fast".
- Name concrete objects, people, animals, places, and how they move.
- For an abstract idea use the mapping: quantity -> size or count, comparison -> side by side, process -> arrows or path, cause and effect -> one thing hits or pushes another, change over time -> before and after.
- For a physical or mathematical phenomenon describe it precisely so Director can choose a drawn simulation, for example "two pulses travel toward each other on a rope, meet in the middle and add up to one pulse twice as tall". Say which parts must be visible (crest, trough, bright band, dark band) and what the viewer must notice.
- One visual idea per scene. If you need two, make two scenes.

## 6. Self-check before saving
- Hook in scene 1, payoff has its own scene, last scene closes.
- Every scene: one idea, syllable count within range, no symbols or digits in narration.
- Every `visual` is something a camera or a simulation can show.
- Sum of duration_sec within 3 s of target_sec.

## Glossary
- Hook: the opening seconds that make the viewer stay.
- Beat: one unit of story, usually one scene here.
- Payoff / aha: the moment the key idea clicks.
- Call-back: returning to something shown earlier (often the hook).
- VO (voice-over): the narration.
- Visual intent: a plain description of the picture, before any technical layout.
