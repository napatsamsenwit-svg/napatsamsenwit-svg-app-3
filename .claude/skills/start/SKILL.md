---
name: start
description: First-run flow for a beginner, resumable across sessions. Installs Git, Node.js and GitHub CLI, creates the private GitHub copy, connects Vercel and puts the starter page online first, and only then asks what app they want (clickable, via the plan skill) and hands over to build. Use when the learner says เริ่ม, start, ติดตั้ง, เริ่มใหม่, เปิดมาครั้งแรก, or when `.course/progress.json` shows unfinished plan, setup or go-live steps.
---

# Start

Goal: from a fresh computer to "my site already has a real URL, I told Claude what I want, and Claude is building my app". Finish all setup and go-live steps **before** asking anything about the app: do not run `plan` or ask about their idea until step 13. The learner only answers clickable questions, clicks installers and approves logins in **their own default browser** (open every page with `open` / `start` / `Start-Process` as described in CLAUDE.md; never Claude's built-in browser). Speak simple Thai throughout (see CLAUDE.md). Never show raw command output.

Read `.course/progress.json` first and skip every step already marked `true`. Each step ends by writing its flag.

## 0. Welcome (only if nothing is done yet)

Say hello, then explain in 4 short lines:
- ติดตั้งเครื่องมือ 3 อย่าง (ประมาณ 20–30 นาที ส่วนใหญ่คือรอ) และต้องปิด-เปิดแอป Claude ใหม่ 1 ครั้ง
- เอาเว็บขึ้นออนไลน์ให้ได้ลิงก์จริงก่อนเลย
- พอทุกอย่างพร้อม ค่อยถามว่าอยากได้แอปแบบไหน (กดเลือกไม่กี่ข้อ)
- แล้ว Claude สร้างแอปให้ทั้งตัว

Then add: ใช้คอมส่วนตัวที่รู้รหัสเครื่อง และควรมีบัญชี GitHub กับ Vercel แล้ว (ถ้ายังไม่มี เดี๋ยวพาสมัคร)

## 1. Not yet: the plan

Do not ask about the app here, even if the learner already describes an idea. Say "เก็บไอเดียไว้ก่อนนะ เตรียมเครื่องให้เสร็จแล้วจะถามละเอียดเลย" and continue. The plan happens in step 13.

## 2. Detect the computer

Run `uname -s` (Bash) or `$env:OS` (PowerShell). Store `"os": "mac"` or `"os": "windows"`.

## 3. Check the folder location (`setup.folderOk`)

Get the current folder path. It is **risky** if any of these are true:
- it contains `OneDrive`, `iCloud`, `Mobile Documents`, `Dropbox` or `Google Drive`
- on macOS it is under `~/Desktop` or `~/Documents` (often synced to iCloud)
- it contains non-English characters (e.g. Thai) or is inside a `.zip` preview folder (Windows shows unzipped-looking paths under `\AppData\Local\Temp\`)

Also check that `package.json` is in the current folder. If it is not, but exactly one sub-folder contains it, the learner opened the wrong level: tell them which folder to open instead and stop.

If risky, copy the project (including `.course/`, so progress is kept) to a safe place, then ask the learner to open it:
- macOS: `~/vibe-projects/<folder-name>` (`mkdir -p ~/vibe-projects && cp -R . ~/vibe-projects/<folder-name>`)
- Windows: `$HOME\vibe-projects\<folder-name>`, or `C:\vibe-projects\<folder-name>` if the home path itself has non-English characters (`Copy-Item -Recurse`)

Explain: "ย้ายโปรเจกต์ไปไว้ที่ที่ปลอดภัยกว่าแล้ว เพราะที่เดิมคอมจะ sync ขึ้น cloud ทำให้ช้า". Give the steps to start a new session on the new folder and type "เริ่ม" there. Do not continue in the old folder.

## 4. Check tools

| Tool | macOS check | Windows check | Needs |
|---|---|---|---|
| Git | `xcode-select -p` succeeds **and** `git --version` works | `git --version` | any |
| Node.js | `node -v` | `node -v` | `>= 20.9` |
| GitHub CLI | `gh --version` | `gh --version` | any |

On macOS, do **not** run `git --version` before `xcode-select -p` succeeds: it pops up an install dialog by itself.

Tell the learner in one line what is already there and what is missing ("เครื่องคุณมี Git แล้ว ✅ ยังขาด Node กับ GitHub CLI"). Mark found tools `true`.

## 5. Install what is missing

Follow `install-mac.md` or `install-windows.md` in this skill folder. Install in this order: Git → Node.js → GitHub CLI. One tool at a time: start the installer, tell the learner exactly what to click, then ask with AskUserQuestion ("ติดตั้งเสร็จแล้ว" / "มีปัญหา") and verify.

## 6. Restart the app once (`setup.restarted`)

If you installed anything in step 5, the app must restart to see the new tools. Set `"restartPending": true`, then say:

1. ปิดแอป Claude ให้สนิท (Mac: กด ⌘Q / Windows: กดปุ่ม X แล้วเช็กว่าไม่มีไอคอนค้างที่มุมขวาล่าง)
2. เปิดแอป Claude ใหม่
3. เปิดโปรเจกต์เดิม แล้วพิมพ์ว่า "เริ่ม"

Reassure: ขั้นที่ทำไปแล้วไม่หาย ทำต่อจากเดิมได้เลย. Stop here. In the next session, re-run step 4. If a tool is still missing after the restart, try the installer again once, then use the `help` skill. When all three are found, set `restarted: true` and `restartPending: false`. If nothing was installed, set `restarted: true` without restarting.

## 7. Install the project's parts (`setup.npmInstalled`)

Say "กำลังเตรียมไฟล์ของเว็บ ใช้เวลา 1–3 นาที". Run `npm ci` (use `npm install` only if `npm ci` fails). Warnings are normal; only real errors matter. On network errors, retry once, then ask whether they are on office/school Wi-Fi that may block downloads.

Start the local site and open it in their browser (`preview` skill), and say "นี่คือหน้าเริ่มต้นของเว็บคุณ เดี๋ยวเอาขึ้นออนไลน์ก่อน แล้วค่อยสร้างแอปจริง".

## 8. Log into GitHub (`setup.githubLogin`)

Explain in one line: GitHub คือที่เก็บงานของเราไว้บนอินเทอร์เน็ต เผื่อคอมพัง และเป็นทางที่เอาเว็บขึ้นออนไลน์

1. Ask with AskUserQuestion whether they have a GitHub account ("มีแล้ว" / "ยังไม่มี"). If not, open `https://github.com/signup` and walk them through signing up (they type their own email and password; you never see them). Wait until they confirm.
2. Run `gh auth login --web --hostname github.com --git-protocol https` **in the background**, then read its output to get the 8-character one-time code.
3. Tell the learner the code in large text, open `https://github.com/login/device` in their default browser, and say: ใส่รหัสนี้ → กด Continue → กด Authorize GitHub
4. When the background command finishes, run `gh auth status` to confirm, then `gh auth setup-git`.

## 9. First save point (`setup.gitReady`)

If there is no `.git` folder:
1. `git init -b main`
2. Get the GitHub identity: `gh api user --jq '.login + " " + (.id|tostring)'`
3. `git config user.name "<login>"` and `git config user.email "<id>+<login>@users.noreply.github.com"` (the private noreply address, so their real email never appears)
4. Write a random id (e.g. from `node -e "console.log(crypto.randomUUID())"`) to `public/vibe-project-id.txt`. The `preview` skill uses it to recognise this project's own dev server.
5. `git add -A && git commit -m "เริ่มโปรเจกต์"`

## 10. Create the GitHub copy (`golive.repo`)

1. There is no app idea yet, so name the copy `<login>-app` in lowercase (check it is free with `gh repo view <login>/<name>`; if taken, try `<login>-app-2`, `-3`, ...). Do not ask the learner for a name. Save it as `deploy.repoName`.
2. `gh repo create <name> --private --source . --remote origin --push`
3. Save `deploy.repo` (`<login>/<name>`).

If this template has a "Before Vercel" part in the "This template" section of CLAUDE.md, do it now, before step 11.

## 11. Connect Vercel (`golive.vercel`)

Explain: Vercel คือบริการที่เอาเว็บของเราขึ้นออนไลน์ฟรี ทำครั้งเดียว ต่อไปสั่งคำเดียวจบ

Open `https://vercel.com/new` in their default browser, then walk the learner through, one step at a time, confirming each with AskUserQuestion:
1. ถ้ายังไม่มีบัญชี กด **Continue with GitHub** แล้วกด **Authorize Vercel** (ถ้าถามประเภทบัญชี เลือก **Hobby** ซึ่งฟรี)
2. ที่หัวข้อ Import Git Repository ถ้ายังไม่เห็นโปรเจกต์ กด **Install** หรือ **Adjust GitHub App Permissions** → เลือก **Only select repositories** → เลือก `<name>` → กด **Install**
3. กด **Import** ข้างชื่อ `<name>`
4. Only if `.env.local` exists: copy it to the clipboard yourself (macOS `pbcopy < .env.local`, Windows PowerShell `Get-Content .env.local -Raw | Set-Clipboard`; never show its contents in the chat), then guide: กดเปิดหัวข้อ **Environment Variables** → คลิกที่ช่อง **Key** ช่องแรก → กดวาง (Mac ⌘V / Windows Ctrl+V) ค่าจะเติมให้เองครบทุกบรรทัด
5. ส่วนอื่นไม่ต้องแก้ กด **Deploy** แล้วรอประมาณ 1–2 นาที

## 12. First deploy (`golive.firstDeploy`)

Follow step 5 ("Watch the build and report") of the `deploy` skill for the current commit. On success, save `deploy.url` and celebrate: "เว็บของคุณออนไลน์แล้ว 🎉 <url> ตอนนี้ยังเป็นหน้าเริ่มต้น เดี๋ยวบอกไอเดีย แล้วสร้างแอปจริงจะอัปเดตที่ลิงก์เดิม". Suggest they open it on their phone.

If this template has an "After first deploy" part in the "This template" section of CLAUDE.md, do it now.

## 13. Plan, then hand over (`plan.done`)

All `setup` and `golive` flags are `true`. Say one line ("Setup เสร็จหมดแล้ว ✅ ต่อไปมาคุยกันว่าอยากได้แอปแบบไหน"), then run the `plan` skill. When it finishes, put the app name from `.course/plan.md` into `name` and `shortName` in `src/lib/brand.ts` (the rest of `brand.ts` is filled in by `build`, following the `design` skill), say "ได้แผนแล้ว เริ่มสร้างแอปของคุณเลยนะ" and run the `build` skill.
