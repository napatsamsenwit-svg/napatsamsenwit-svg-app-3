#!/bin/bash
# รันบน GitHub: ตรวจ 1 รอบ หรือ (ถ้าเริ่มจากตัวตั้งเวลา) วนตรวจทุก 2 นาที เพื่อให้ iHappy / New Step ถูกตรวจถี่แม้ Mac ปิดอยู่
# วนจนกว่าจะมีรอบใหม่รอคิวอยู่ (เช่น Mac สั่งมา หรือตัวตั้งเวลารอบถัดไป) แล้วค่อยจบ เพื่อไม่ให้รอบอื่นต้องรอนาน
git config user.name "job-watch"
git config user.email "job-watch@users.noreply.github.com"

save() {
  git add .job-watch/seen.json
  git add .job-watch/crash.json 2>/dev/null || true
  git diff --cached --quiet || { git commit -qm "อัปเดตรายการงานที่เห็นแล้ว" && git pull -q --rebase && git push -q; }
}

end=$((SECONDS + 19800))
while true; do
  node scripts/job-watch.mjs || node scripts/job-watch.mjs --notify-crash
  save
  [ "$LOOP" = "1" ] || break
  [ "$SECONDS" -ge "$end" ] && break
  waiting=$(gh run list --workflow job-watch.yml --limit 20 --json status -q '[.[] | select(.status=="queued" or .status=="pending" or .status=="waiting")] | length' 2>/dev/null)
  [ "${waiting:-0}" -gt 0 ] && break
  sleep 120
  git pull -q --rebase
done
