---
name: plan
description: Ask the learner what app they want with clickable questions (AskUserQuestion), cut it to a buildable first version, and write `.course/plan.md`. Runs once, right after setup and go-live are done (end of the start skill); this is the only time the learner gives requirements. Use when `plan.done` is false, or when the learner says เปลี่ยนแผน, อยากทำแอปใหม่, เปลี่ยนไอเดีย.
---

# Plan: requirements by clicking

This is the learner's one chance to say what they want. After it, you build everything without asking again, so ask enough to build confidently, but no more than **3 rounds** of AskUserQuestion (plus the final confirmation). Every question uses AskUserQuestion as described in CLAUDE.md: Thai text, 2–4 options, recommended option first marked "(แนะนำ)", a one-line Thai description per option, `multiSelect` for feature lists.

The questions to ask depend on the template. Follow "Plan questions" in the "This template" section of CLAUDE.md.

## 1. Ask

Say in one line why you are asking ("ตอบไม่กี่ข้อ แล้วผมจะสร้างแอปให้ทั้งตัวเลย กดเลือกได้เลย ไม่มีผิดไม่มีถูก"), then run the rounds. Adapt later rounds to earlier answers: never ask something already answered, and skip a question when one option is obviously right.

## 2. Cut to a first version

Apply the scope rules from the "This template" section of CLAUDE.md. Anything outside them goes on a "เก็บไว้ทำทีหลัง" list.

Always out of scope for the first version, in every template: payments, sending email/LINE/SMS, calling AI APIs, realtime chat, multiple user roles or admin panels, file uploads larger than profile pictures, anything needing another paid service.

## 3. Confirm

Show a short Thai summary (app name, who it is for, 3–6 bullet features, style, and the "later" list with one kind reason), then ask with AskUserQuestion:
- "สร้างตามนี้เลย (แนะนำ)"
- "ขอปรับนิดหน่อย" → ask which part with one more AskUserQuestion, update, and confirm again.

## 4. Write the plan

Write `.course/plan.md`:

```markdown
# <app name>

<one-sentence pitch in Thai>

## ใช้ทำอะไร / ใครใช้
<from the answers>

## ฟีเจอร์ในเวอร์ชันแรก
- <feature in learner terms>

## หน้าตา
<style and colour exactly as picked (they map to presets in the `design` skill), mood, navigation (bottom tabs on phone / top bar on desktop)>

## เก็บไว้ทำทีหลัง
- <item> (<why>)

## สำหรับ Claude
<technical plan: data shape, pages/routes, components, build order in 3–5 parts, each part ending in something visible>
```

Set `plan.done: true`. If this was a re-plan after the app was already built, set `build.done: false` and `build.parts: []` so `build` starts over on the new plan, and save first with the `save` skill.
