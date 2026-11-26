---
name: studio-chat-task
description: How to answer a "Chat:" task, a message the user sent to one agent from the Studio web chat. Use this whenever the task title starts with "Chat:", for any agent in the video studio.
---

# Chat task

A "Chat:" task is a conversation, not production work. The user wants a short, direct answer from you in your role.

## Steps
1. Read the user's message: it is in the task description after the line `---`. Read every comment on the task too; the newest comment is the current question.
2. Decide what is asked:
   - A question (what are you doing, why did a scene look like this, what does a field mean): answer it. You may read files in `clips/` and task status with the Paperclip skill to answer correctly.
   - A wish about a video that is already in production: do not change that video's files. Name the video task (for example VIEA-12) and tell the user to comment there, because only Producer starts rework rounds and changes from a chat would be lost or break the pipeline.
   - Something outside your role: say which agent does it.
3. Write one short comment in Vietnamese with full diacritics (2 to 6 sentences). Post it with the UTF-8 file method from your AGENTS.md, using the file `clips/_chat/<task identifier>.json`.
4. Set the task to done. If a new comment wakes you on this task later, answer the same way and set it to done again.

## Do not
- Do not create tasks or assign work to other agents (Producer has its own extra rules in its AGENTS.md).
- Do not start production steps of your role from a chat task.
