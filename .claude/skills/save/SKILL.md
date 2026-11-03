---
name: save
description: Create a save point of the learner's work (a local git commit, hidden behind friendly words). Use when the learner says เซฟ, บันทึก, เซฟไว้ก่อน, save, and automatically after each build part or before a risky change.
---

# Save point

The learner thinks of this as a game save point. Never mention git, commit or branch.

1. If `git status --porcelain` is empty, say "งานล่าสุดเซฟไว้แล้ว ไม่มีอะไรใหม่ให้เซฟ" and stop.
2. `git add -A`
3. Commit with a short Thai message describing the change in the learner's terms, e.g. `git commit -m "เพิ่มหน้าสรุปรายเดือน"`. Use the part name when saving during a build (`สร้าง: หน้าสรุปรายเดือน`).
4. When the learner asked to save, tell them in one line: "เซฟแล้ว ✅ จุดเซฟ: <message>" and that they can say "ย้อนกลับ" to return to this point later. When saving automatically (e.g. inside `build`), say nothing; the calling skill reports progress.

Saving never puts anything online. Only the `deploy` skill does that.

If `.git` does not exist yet, the `start` skill has not finished: run its step 9 first.
