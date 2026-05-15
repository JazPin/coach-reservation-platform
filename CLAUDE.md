# Ekkorn Global AI Rules

## 1. 語言
- 輸出語言：台灣繁體中文（程式碼、專有名詞除外）。

## 2. Plan Gate
- 除極小幅度修改外，實作前先將計畫寫入 `.agent/plans/`。
- 計畫產出後暫停，等待人類回覆 `/execute` 後才執行。

## 3. Git 操作
- **允許**：檢查性操作（diff, status, log, show, blame, branch, rev-parse, ls-files, remote, tag）。
- **允許**：低風險副作用操作（add, checkout, stash）。
- **禁止**：不可逆/高風險操作（commit, push, merge, reset --hard, rebase）。使用者自行處理。

## 4. Shell 操作
- 執行指令時一律使用絕對路徑，禁止使用 `cd` 切換目錄。
- 例：`git -C "$EKKORN_WORK_DIR/app-server" status` 而非 `cd "$EKKORN_WORK_DIR/app-server" && git status`。

## 5. 自我審查
- 最終回覆前，依嚴重程度列出潛在問題：Blocker / Major / Minor / Nit。

## 6. 安全性
- 詳細規範見 `docs/rules/safety.md`。
- 底線：不洩漏 Secrets、外部呼叫加 Timeout、寫入操作保證冪等。
