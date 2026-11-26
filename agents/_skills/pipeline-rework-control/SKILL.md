---
name: pipeline-rework-control
description: How the video studio Producer reacts when it is woken by a comment on a video task - REVIEW FAILED or REVIEW PASSED from Reviewer, or a wish from the user - including starting and limiting rework rounds. Use this whenever Producer is woken by a new comment on a video (parent) task.
---

# Comments and rework rounds (Producer)

Find the newest comment on the video task and follow the matching case. In every case, set the video task back to blocked at the end, because the pipeline is still waiting for the user's gates.

## A) Starts with "REVIEW FAILED" (from Reviewer)
1. Read `VIDEO/review.json`. Each issue has a `stage`.
2. If any issue has stage `scriptwriter`: do not start a rework. Tell the user in Vietnamese what is wrong with the content and ask what to do. The script gate is already approved; changing content now needs the user's decision.
3. Otherwise start a rework round from the earliest stage among the issues (order: director, asset, editor). See "Rework rounds".
4. Post one Vietnamese comment: what failed and which fix tasks you created.

## B) Starts with "REVIEW PASSED" (from Reviewer, after a rework round)
1. Set the original Reviewer task (the first task assigned to Reviewer under this video task) to done. This unblocks the "Approve video" gate.
2. Post one Vietnamese comment: the video passed after the rework and is waiting for the user to approve.

## C) A comment from the user
1. Reply in Vietnamese in one short comment.
2. If it is a wish about the video, add it to `VIDEO/brief.md` under the right role with "(user)" at the end of the line.
3. If that stage has not run yet (its task is not done), stop here: the agent will read brief.md.
4. If that stage is done and the user clearly asks to change it, start a rework round from that stage (Director, Asset or Editor).
5. Script changes: before the script gate is approved, create only "Fix round N: Scriptwriter" and tell the user to read the new script before approving. After the script gate is approved, do not change the script; tell the user to create a new video.
6. Do not create or change tasks for anything else unless the user clearly asks.

## Rework rounds
Production stages in order: Director, Asset, Editor. A round that starts at stage S creates, with the video task as parent and in the same project:
1. "Fix round N: <stage>" for S and for every later stage up to Editor, each assigned to that agent. The first has no blocker; each next one is blocked by the previous one (real blocker relations, blockedByIssueIds).
2. "Review round N" assigned to Reviewer, blocked by the last fix task.

Description of every round task:
- Line 1 `Video folder: VIDEO`
- Line 2 `Read VIDEO/brief.md first.`
- Line 3 `Rework round N. Original review task: <identifier of the first Reviewer task>.`
- Then `Fix:` lines with the exact problems for that stage and the scene numbers, copied from review.json or from the user's comment. A later stage that only needs to rebuild gets `Fix: rebuild with the new files from the previous step.`

N is 2 for the first rework round and 3 for the second. At most 2 rework rounds per video: count the existing "Review round" tasks. If the limit is reached, create nothing; tell the user in Vietnamese what still fails and ask what to do. Never touch the gate tasks; the gate opens when the original Reviewer task is done.

After creating a round, read the tasks back and check assignees, parent and blockers.
