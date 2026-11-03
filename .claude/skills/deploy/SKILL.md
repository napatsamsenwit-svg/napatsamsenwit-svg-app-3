---
name: deploy
description: Update the learner's live website on Vercel by pushing to GitHub, then report the live URL. Use when the learner says เอาขึ้นเว็บ, deploy, อยากให้เพื่อนดู, อัปเดตเว็บจริง, ส่งลิงก์ให้คนอื่น, or after the build skill finishes. Always confirm first.
---

# Deploy

Pushing to `main` on GitHub makes Vercel rebuild the live site automatically. That push is the only thing that changes the live website. The GitHub copy and Vercel are connected once during `start`; if `golive.repo` or `golive.vercel` is not `true`, run those steps of the `start` skill first.

## 1. Confirm

Ask with AskUserQuestion: "จะเอาเวอร์ชันล่าสุดขึ้นเว็บจริง ทุกคนที่มีลิงก์จะเห็นทันที" with options "เอาขึ้นเลย (แนะนำ)" / "ยังก่อน". Skip this when the learner just picked "เอาขึ้นเว็บเลย" in the `build` skill.

## 2. Check before going live

Save any unsaved work with the `save` skill. Then use the `pre-deploy-checker` agent. If it reports problems, fix them, save, and run it again. Tell the learner only "ตรวจงานก่อนขึ้นเว็บ… ผ่านแล้ว ✅" or, if it fails after you fix things twice, explain the problem simply and stop.

## 3. Template extras

If the "This template" section of CLAUDE.md lists something to do before deploying (e.g. environment variables), do it now.

## 4. Push

`git push origin main`. If it is rejected because GitHub has newer changes (rare), run `git pull --rebase origin main`, then push again. Never force-push.

## 5. Watch the build and report

Vercel reports each build back to GitHub. Wait for the pushed commit (`git rev-parse HEAD`) to finish, checking every 20 seconds for up to 5 minutes:
- `gh api repos/<repo>/commits/<sha>/status --jq '.state + " " + ((.statuses[0].target_url) // "")'` until the state is `success` or `failure`.
- If no status appears after a minute, look at GitHub deployments instead: `gh api "repos/<repo>/deployments?sha=<sha>" --jq '.[0].id'`, then `gh api repos/<repo>/deployments/<id>/statuses --jq '.[0].state + " " + (.[0].environment_url // "")'`.
- Still nothing after 3 minutes on the first deploy usually means the Vercel import in `start` was not finished. Re-check with the learner.

On success:
- Get the live URL. The production domain is usually `https://<name>.vercel.app`; confirm by opening it, or ask the learner to copy it from the Vercel page if it differs.
- Save `deploy.url` and `deploy.lastDeployAt` in `progress.json`.
- Celebrate: "เว็บอัปเดตแล้ว 🎉 <url> ลองเปิดในมือถือ หรือส่งให้เพื่อนดูได้เลย". Mention that next time they just say "เอาขึ้นเว็บ".

On failure:
- The previous version of the site stays online, so nothing is broken for visitors. Say that first.
- Get the build log from the status target URL, or run `npx --yes vercel@latest inspect <url> --logs` if the learner is logged into the Vercel CLI. Fix the cause, save, and push again. Use `error-explainer` if the cause is unclear.
