#!/bin/bash
# รันบนเครื่อง Mac: ดึงงานจาก Acadex แล้วส่งไฟล์ขึ้น GitHub (ให้ GitHub เป็นคนแจ้ง LINE)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")/.." || exit 1
git pull -q --rebase --autostash || exit 1
node scripts/job-watch.mjs --fetch-acadex
git add .job-watch/acadex-feed.json .job-watch/acadex-status.json
git diff --cached --quiet && exit 0
git commit -qm "อัปเดตรายการงาน Acadex" && git push -q
