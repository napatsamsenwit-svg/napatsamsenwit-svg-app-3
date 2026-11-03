# Installing tools on macOS

Every installer here is the official one and opens its own window. The learner types their Mac password in that window, never in chat. Never use `sudo` or Homebrew.

Downloads go to `~/Downloads`. After each install, verify with the check from SKILL.md step 3. Note: in the current session the new tool may only be found by its full path (shown below); that is expected until the app restarts.

## Git (Apple Command Line Tools)

1. Run `xcode-select --install`.
2. Tell the learner:
   1. จะมีหน้าต่างของ Apple เด้งขึ้นมา ถามว่าจะติดตั้ง "command line developer tools" ไหม
   2. กดปุ่ม **Install** (ไม่ต้องกด Get Xcode)
   3. กด **Agree**
   4. รอจนขึ้นว่าติดตั้งเสร็จ (5–15 นาที ขึ้นกับเน็ต) แล้วกด **Done**
   5. กลับมาพิมพ์ในแชทว่า "เสร็จแล้ว"
3. If the window does not appear, `xcode-select -p` may already succeed (already installed). If the command says an update is available, that is fine too.
4. Verify: `xcode-select -p` prints a path, and `/usr/bin/git --version` works.

## Node.js (LTS)

1. Find the current LTS version:
   `curl -fsSL https://nodejs.org/dist/index.tab | awk -F'\t' 'NR>1 && $10 != "-" {print $1; exit}'`
   This prints something like `v24.22.1`.
2. Download: `curl -fsSL -o ~/Downloads/node-<v>.pkg https://nodejs.org/dist/<v>/node-<v>.pkg`
3. Open it: `open ~/Downloads/node-<v>.pkg`
4. Tell the learner:
   1. หน้าต่างติดตั้ง Node.js จะเปิดขึ้นมา
   2. กด **Continue** ไปเรื่อย ๆ แล้วกด **Agree**
   3. กด **Install** แล้วใส่รหัสเครื่อง Mac (รหัสที่ใช้ปลดล็อกเครื่อง)
   4. พอขึ้นว่าเสร็จ กด **Close** (ถ้าถามว่าจะลบไฟล์ติดตั้งไหม กด Move to Trash ได้เลย)
   5. พิมพ์ในแชทว่า "เสร็จแล้ว"
5. Verify: `/usr/local/bin/node -v`

## GitHub CLI

1. Find the latest version from the redirect (no API, so a whole classroom on one Wi-Fi does not hit rate limits):
   `curl -fsSIL https://github.com/cli/cli/releases/latest | grep -i '^location:'`
   The URL ends in `/tag/v<version>`, e.g. `v2.103.2`.
2. Download: `curl -fsSL -o ~/Downloads/gh.pkg https://github.com/cli/cli/releases/download/v<version>/gh_<version>_macOS_universal.pkg`
3. Open it: `open ~/Downloads/gh.pkg`, then give the same click-by-click steps as Node.js.
4. Verify: `/usr/local/bin/gh --version`

## If something fails

- "can't be opened because it is from an unidentified developer": tell them to open **System Settings → Privacy & Security**, scroll down, click **Open Anyway**, then open the file again (you run `open` again).
- The learner does not know their Mac password: they need it for any install. Pause setup kindly and suggest asking whoever set up the Mac.
- A download fails: retry once. If it fails again, open the download page in the browser (`open https://nodejs.org/en/download` or `open https://cli.github.com`) and guide them to click the macOS installer.
