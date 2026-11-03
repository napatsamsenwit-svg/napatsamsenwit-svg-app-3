---
name: connect-supabase
description: Create the learner's free Supabase project and connect it to the app (local env, email login settings, Vercel env vars). Runs once during the start skill, after the GitHub copy and before the Vercel import. Also use when the learner says เชื่อม database, ต่อ Supabase, ข้อมูลไม่บันทึก, or when the deploy skill needs Supabase env vars on Vercel.
---

# Connect Supabase

Explain once: Supabase คือ "สมุดกลางบนอินเทอร์เน็ต" ที่เก็บข้อมูลและระบบ login ให้แอปเรา ใช้ฟรี

Track progress in the `supabase` section of `.course/progress.json`. Skip finished steps.

## 1. Supabase account

Ask with AskUserQuestion whether they have a Supabase account ("มีแล้ว" / "ยังไม่มี"). If not, open `https://supabase.com/dashboard/sign-up` in their default browser and guide: กด **Continue with GitHub** → **Authorize**. If asked to create an organization, name it anything, choose **Personal** and the **Free** plan.

## 2. Connect the Supabase tools

The project's `.mcp.json` defines a `supabase` server. Check whether `mcp__supabase__*` tools are available.

If they are not:
- The app may be asking the learner to approve the project's `supabase` server, or to sign in to it. Tell them: ถ้าเห็นหน้าต่างหรือแถบถามเรื่อง "supabase" ให้กด **Approve / Allow** แล้วถ้าเบราว์เซอร์เปิดหน้า Supabase ให้กด **Authorize** และเลือก organization ของตัวเอง
- If nothing appears, tell them to type `/mcp` in the chat, pick **supabase**, and choose **Authenticate**.
- After approving, the tools may need a new session: ask them to start a new chat on this folder and type "เริ่ม"; `start` resumes here because `golive.supabase` is still false.
- If it still does not work after one new session, use the fallback at the end of this file.

## 3. Create the project (`supabase.projectRef`)

1. `list_organizations` and pick the learner's (ask if more than one).
2. `get_cost` for a project in that org; it should be free. If it is not $0, stop and explain: free accounts allow 2 active projects; offer to use an existing project from `list_projects` instead.
3. `confirm_cost`, then `create_project` named after `deploy.repoName` (there is no app idea yet) and region `ap-southeast-1` (Singapore, closest to Thailand).
4. Poll `get_project` every 20 seconds until it is ready (about 1–2 minutes). Tell the learner "กำลังสร้างสมุดกลางให้ รอสักครู่".
5. Save `projectRef` in `progress.json`.
6. Lock the tools to this project for future sessions: change the URL in `.mcp.json` to `https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,debugging,development,docs`. Keep using the current tools (with the project id) for the rest of this session.

## 4. Local settings (`supabase.envWritten`)

1. `get_project_url` and `get_publishable_keys` (use the publishable key, `sb_publishable_...`; use the legacy anon key only if there is no publishable key).
2. Write `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<url>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<key>
   ```
3. Restart the background dev server (env files are only read at start). `curl -s -o /dev/null -w "%{redirect_url}" <localUrl>` should now point to `/login`.

## 5. Turn off "Confirm email" (`supabase.confirmEmailOff`)

Explain why in one line: ระบบส่งอีเมลฟรีของ Supabase ส่งได้แค่ 2 ฉบับต่อชั่วโมง ถ้าเปิดไว้ คนอื่นจะสมัครไม่ได้

Open `https://supabase.com/dashboard/project/<ref>/auth/providers` in their default browser and guide:
1. กดที่ **Email**
2. ปิดสวิตช์ **Confirm email**
3. กด **Save**
4. Then ask with AskUserQuestion: "ปิดแล้ว" / "หาไม่เจอ"

Then let the learner test it: open `<localUrl>/login` in their browser and ask them to press "ยังไม่มีบัญชี? สมัครสมาชิก" and sign up with any email and a password of 6+ characters. Confirm with AskUserQuestion ("เข้าได้แล้ว" / "มีข้อความ error"). Tell them no email is sent, so any address works.

## 6. Vercel environment variables (`supabase.vercelEnvSet`)

Normally not needed: `start` pastes `.env.local` into Vercel during the import. Use this step only when the live site does not redirect to `/login` after a deploy, or when the variables change. Only possible after the Vercel import (`golive.vercel` is `true`).

1. Log into the Vercel CLI: run `npx --yes vercel@latest login` **in the background**, read the code and link from its output, open the link, and tell the learner: กด **Confirm** / **Allow** ในหน้าเว็บ Vercel (ใช้บัญชีเดียวกับที่สมัครไว้)
2. `npx --yes vercel@latest link --yes --project <repo-name>`
3. For each of `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and each environment `production`, `preview`, `development`:
   `printf '%s' '<value>' | npx --yes vercel@latest env add <NAME> <environment>`
   (use the values from step 4; never read `.env.local` back into the chat)
4. Rebuild the live site: `git commit --allow-empty -m "อัปเดตการตั้งค่าเว็บ"` and push, then follow the `deploy` skill's step 5 (watch the build). The live site should now redirect to `/login`.

## Fallback without the Supabase tools

Use this only if step 2 failed twice.
1. Guide the learner to create a project at `https://supabase.com/dashboard/new` (name, a generated database password they do not need to remember, region Southeast Asia (Singapore), Free plan).
2. Guide them to **Project Settings → API Keys** and ask them to copy the **Project URL** and the **Publishable key** into the chat. Both are safe to share; never ask for the secret or service_role key.
3. Continue from step 4.
4. For each migration, write the SQL to `supabase/migrations/`, then guide them to **SQL Editor → New query**, paste the SQL you show them, and click **Run**. Show only the SQL, in one code block.
