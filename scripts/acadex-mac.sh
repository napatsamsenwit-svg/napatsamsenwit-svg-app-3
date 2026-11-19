#!/bin/bash
# รันบนเครื่อง Mac: ดึงงานจาก Acadex แล้วส่งไฟล์ขึ้น GitHub (ให้ GitHub เป็นคนแจ้ง LINE)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")/.." || exit 1
git pull -q --rebase --autostash || exit 1
node scripts/job-watch.mjs --fetch-acadex
git add .job-watch/acadex-feed.json .job-watch/acadex-status.json
if git diff --cached --quiet; then
  # Acadex ไม่เปลี่ยน: สั่งให้ GitHub ตรวจ iHappy / New Step ทุก 5 นาทีแทน (ตัวตั้งเวลาของ GitHub ช้าถึงชั่วโมงละครั้ง)
  gh workflow run job-watch.yml -f mac_at="$(date +%s)" >/dev/null 2>&1
  exit 0
fi
git commit -qm "อัปเดตรายการงาน Acadex" && git push -q
