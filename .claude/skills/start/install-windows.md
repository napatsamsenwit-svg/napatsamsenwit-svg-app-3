# Installing tools on Windows

Before Git is installed you only have PowerShell. Use the PowerShell tool for everything in this file.

Every install shows a Windows prompt **"Do you want to allow this app to make changes to your device?"** (User Account Control). The learner must click **Yes**. Warn them before each install so they look for it; it sometimes appears behind other windows or only as a flashing icon on the taskbar.

## Preferred: winget

Check `winget --version`. If it works, install each missing tool one at a time:

| Tool | Command |
|---|---|
| Git | `winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements` |
| Node.js LTS | `winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements` |
| GitHub CLI | `winget install --id GitHub.cli -e --source winget --accept-package-agreements --accept-source-agreements` |

Before each one, tell the learner:
1. กำลังติดตั้ง <ชื่อ> ใช้เวลา 1–5 นาที
2. ถ้ามีหน้าต่างถามว่า "Do you want to allow this app to make changes" ให้กด **Yes**
3. ถ้าไม่เห็นหน้าต่าง ลองดูที่แถบด้านล่างจอว่ามีไอคอนกระพริบไหม

Run the command in the background and wait for it to finish. Exit code 0, or a message that it is already installed, means success. The new tool is only on PATH after the app restarts, so verify with the full path:
- Git: `& "C:\Program Files\Git\cmd\git.exe" --version`
- Node: `& "C:\Program Files\nodejs\node.exe" -v`
- GitHub CLI: `& "C:\Program Files\GitHub CLI\gh.exe" --version`

## Fallback: official installers (no winget)

Download into `$HOME\Downloads`, then run with `Start-Process <file>`. Tell the learner to click **Yes** on the Windows prompt, then **Next** on every screen without changing anything, then **Install** and **Finish**.

- Git: open `https://git-scm.com/download/win` in the browser (`Start-Process https://git-scm.com/download/win`) and guide them to click "Click here to download" for the 64-bit installer, then open it from Downloads.
- Node.js: get the LTS version with `(Invoke-RestMethod https://nodejs.org/dist/index.json | Where-Object { $_.lts } | Select-Object -First 1).version`, download `https://nodejs.org/dist/<v>/node-<v>-x64.msi` with `Invoke-WebRequest -OutFile`, then `Start-Process` it.
- GitHub CLI: open `https://cli.github.com` and guide them to the Windows download, then open it from Downloads.

## If something fails

- **"Windows protected your PC"** (SmartScreen): click **More info**, then **Run anyway**.
- **Clicked No on the Windows prompt** by accident: run the same install again.
- **No permission to install** (company or school computer): pause kindly; they need a personal computer or IT help.
- After the restart, `git` or `node` is still not found: check the full paths above. If the file exists, the app was not fully closed; ask them to quit it from the system tray icon (bottom right) and open it again.
