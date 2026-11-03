---
name: preview
description: Start the learner's website on their own computer and open it in their default browser at <localUrl>. Use when the learner says ขอดูเว็บ, เปิดเว็บ, ดูผลงาน, preview, หน้าเว็บหายไป, and at the start of a session once setup is done.
---

# Preview (in the learner's own browser)

Never use Claude's built-in browser or preview pane. The site opens in the learner's everyday browser.

`<localUrl>` is `localUrl` in `.course/progress.json` (each template uses its own port, so a learner can run both).

1. Check whether **this** project is already running: `curl -s <localUrl>/vibe-project-id.txt` must print exactly the contents of `public/vibe-project-id.txt`. If it does, skip to step 3.
2. Otherwise start it as a **background** command: `npm run dev` (if `node_modules` is missing, run `npm ci` first). Wait until the log says it is ready, then repeat the check.
   - If the log says the port is already in use, another project is on it. Do not touch that server. Start this one on a free port instead (`npm run dev -- -p <port + 10>`, trying higher ports if needed), update `localUrl` in `progress.json`, and repeat the check.
   - **Never open `<localUrl>` until the id check passes.** If you cannot run the check, say so and ask the learner what they see rather than opening a page that may belong to another project.
3. If the log or the curl shows an error, fix it before showing the learner (use the `help` skill if one try is not enough).
4. Open it in their default browser: macOS `open "<localUrl>"`, Windows `start "" "<localUrl>"` (Git Bash) or `Start-Process "<localUrl>"` (PowerShell). Skip opening a new tab if you already opened it earlier in this session; just ask them to refresh.
5. Tell the learner: "เปิดเว็บในเบราว์เซอร์ของคุณแล้ว ลองกดเล่นดูได้เลย (ถ้าไม่เด้งขึ้นมา กดลิงก์นี้: <localUrl>)". The first time, add one line: "ลิงก์นี้คือเว็บที่รันอยู่ในเครื่องคุณ เห็นแค่คุณคนเดียว และต้องเปิดแชทนี้ไว้ เว็บถึงจะทำงาน".
6. To see the phone layout, suggest they open the live URL (`deploy.url`) on their phone after the next deploy, or make the browser window narrow.
