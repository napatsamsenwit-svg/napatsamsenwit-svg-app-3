---
name: help
description: Rescue the learner when something is broken, an error appears, the page is blank, or they are stuck and do not know what to do. Use when the learner says error, พัง, ไม่ขึ้น, ไม่ทำงาน, ทำไมไม่ได้, ช่วยด้วย, งง, ติด, หน้าขาว, help.
---

# Help

First, reassure: "ไม่ต้องห่วง แก้ได้ และงานที่เซฟไว้ไม่หายแน่นอน".

## Find out what is wrong

Do the detective work yourself; ask the learner only what you cannot see.
- Is the dev server running? Check its background log and `curl` the page (`<localUrl>/...`). You cannot see their browser, so ask what they see when the server looks fine.
- Run `npm run typecheck` and `npm run lint` for code errors.
- If they mention something outside the app (an installer, a browser page, a login), ask them to describe what they see on screen, or to take a screenshot and paste it into the chat.
- Check `.course/progress.json` for unfinished setup.

## Fix it

1. Try the obvious fix once.
2. If it still fails, use the `error-explainer` agent with the error text and the files involved. Apply its fix.
3. If the app is badly broken and you cannot fix it in two tries, offer the `undo` skill to go back to the last save point that worked.

## Tell the learner

- What went wrong, in one plain sentence ("ตัวเลขที่พิมพ์มาเป็นตัวหนังสือ แอปเลยคำนวณไม่ได้").
- What you did about it.
- What to try now after refreshing their browser.

Never paste the raw error. If the learner is stuck rather than broken ("ไม่รู้จะทำอะไรต่อ"), look at `progress.json` and suggest the single next step.
