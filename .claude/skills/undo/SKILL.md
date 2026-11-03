---
name: undo
description: Go back to an earlier save point when the app broke or the learner does not like a change. Use when the learner says ย้อนกลับ, กลับไปเหมือนเดิม, พังแล้ว เอาคืน, undo, ไม่ชอบ เอาอันเก่า. Always confirm before changing anything.
---

# Undo (back to a save point)

1. Show the last 5 save points as a numbered Thai list with friendly times, from `git log -5 --format="%h|%s|%cr"`. Translate the relative time to Thai ("10 นาทีที่แล้ว"). Never show the hashes.
2. If there are unsaved changes (`git status --porcelain` not empty), say so: "ตอนนี้มีงานที่ยังไม่ได้เซฟ ถ้าย้อนกลับ งานนั้นจะหายไป" and offer to save them first (`save` skill) so nothing is lost.
3. Ask which point to go back to, and wait for a clear answer. If the learner only said "ย้อนกลับ" with no context, suggest the most recent save point.
4. Go back **without rewriting history**, so it is always reversible:
   - Discard unsaved changes only if the learner agreed: `git restore --staged --worktree -- . ':!.course'` and `git clean -fd -- . ':!.course'`
   - To return to an older save point: `git restore --source=<hash> --staged --worktree -- . ':!.course'` then commit `ย้อนกลับไปที่: <subject>`
   - `.course/` is excluded so course progress and the app plan (`plan.md`) are never rolled back.
5. Check the local site still works (dev server log, `curl` for a 200), ask them to refresh their browser, and tell the learner: "ย้อนกลับเรียบร้อย ✅ เว็บกลับไปเป็นแบบตอน <subject>". Mention that this also became a save point, so they can undo the undo.

Never use `git reset --hard`, `git push --force` or anything that deletes save points. If the website is already online, undoing does not change it until the next `deploy`.
