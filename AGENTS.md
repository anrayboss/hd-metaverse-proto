# 專案協作規則

## Git Commit 規範

1. **每次變動都要 Commit**：只要在本專案中有新增、修改或刪除檔案，完成任務後必須執行 `git commit`，不要留下未提交的變更。
2. **使用正體中文撰寫 Commit 訊息**：Commit 訊息一律使用正體中文（可搭配 Conventional Commits 前綴，例如 `feat: 新增...`、`fix: 修正...`、`refactor: 重構...`、`docs: 更新...`、`chore: ...`）。
3. **只提交相關變更**：提交前先檢查 `git status`，避免誤把 `.env`、暫存檔或無關變動一起加入 commit。
