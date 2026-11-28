# 專案協作規則

## Git Commit 規範

1. **每次變動都要 Commit**：只要在本專案中有新增、修改或刪除檔案，完成任務後必須執行 `git commit`，不要留下未提交的變更。
2. **使用正體中文撰寫 Commit 訊息**：Commit 訊息一律使用正體中文（可搭配 Conventional Commits 前綴，例如 `feat: 新增...`、`fix: 修正...`、`refactor: 重構...`、`docs: 更新...`、`chore: ...`）。並且同步倒序寫入 D:\Victor's brain\hd-metaverse-log.md
3. **只提交相關變更**：提交前先檢查 `git status`，避免誤把 `.env`、暫存檔或無關變動一起加入 commit。
4. **Commit 後自動 Push**：每次 `git commit` 完成後，立即執行 `git push` 同步至遠端（`origin main`），確保雲端與本機進度一致。

## log 規則

1. **每則指令都要 log**：將使用者下的指令與 Agent 的操作重點倒序寫入 D:\Victor's brain\hd-metaverse-log.md。並且每則 timetag 和標題都加上橘色螢光筆以利辨識。以此記錄下完整開發過程與思路。日期部分自動採用 Ob winilink 連結每日筆記。.md 的標題不使用 ``，保持原始大字體方便我閱讀
