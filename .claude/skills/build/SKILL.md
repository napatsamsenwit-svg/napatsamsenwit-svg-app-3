---
name: build
description: Build the learner's whole app from `.course/plan.md` in one go, in a few visible parts, then open it in the learner's own browser and offer to put it online. Use after setup and go-live are done, when `build.done` is false, or when the learner says สร้างแอปเลย, สร้างต่อ, ทำต่อ.
---

# Build the whole app

The learner already said what they want in `.course/plan.md`. Do not ask for requirements again. Make sensible choices yourself and mention them afterwards.

## 1. Kick off

Read `.course/plan.md` (especially "สำหรับ Claude") and `build.parts` in `progress.json`. Tell the learner in two lines what you are about to build and that it takes a few minutes: "ระหว่างนี้นั่งดูได้เลย เสร็จแต่ละส่วนจะบอกนะ".

Make sure the local site is running (`preview` skill) so they can refresh their browser and watch the app appear.

Load the `design` skill and set the theme from the plan's style and colour (its section 1) before building any screen. Then build the app shell from `design/patterns.md` first, so every later part slots into the same navigation. Follow it for every part: phone and desktop layouts, and empty, loading/skeleton and error states for every data screen.

## 2. Build part by part

Follow the build order in the plan (3–5 parts). For each part not yet in `build.parts`:
1. Build it.
2. Check the dev server log and `curl` the pages you touched for a 200; fix any error before moving on.
3. Save with the `save` skill (message: `สร้าง: <part name>`), add the part to `build.parts`.
4. Post one short progress line: "✅ ส่วนที่ 2/4: หน้าเพิ่มรายการ เสร็จแล้ว".

Do not stop between parts to ask questions. If something in the plan is ambiguous, pick the simplest reasonable option and note it for the summary.

## 3. Finish

1. Run `npm run lint` and `npm run typecheck`, fix anything.
2. Go through the `design` skill's "Before you say done" checklist for every screen (375px and 1280px, all states) and fix what fails.
3. Ask the learner to refresh `<localUrl>` in their browser (open it for them if it is not open yet), then give a short Thai tour: what each screen does and what to try first ("ลองเพิ่มรายการสัก 2–3 อัน แล้วดูหน้าสรุป"). Mention any choices you made for them.
4. Set `build.done: true`.
5. Ask with AskUserQuestion:
   - "เอาขึ้นเว็บเลย (แนะนำ)": run the `deploy` skill (this counts as the confirmation).
   - "ขอลองเล่นก่อน": tell them to try it and just type what they want changed, or "เอาขึ้นเว็บ" when ready.
   - "อยากปรับบางอย่าง": ask what in plain text, change it, then ask again.

If the session ends mid-build, the next session resumes from the first part not in `build.parts`.
