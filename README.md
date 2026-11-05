# 成語闖關（五年級國語）

React + TypeScript + Tailwind 製作的成語闖關網頁，部署在 Cloudflare Pages（靜態網頁 + Pages Functions API），成績存放在 Cloudflare D1。

## 本機開發

```bash
pnpm install
pnpm dev:cf             # 建置後以 wrangler pages dev 啟動，http://localhost:8788
pnpm db:migrate:local   # 建立本機 D1 資料表（啟用 D1 綁定後）
```

## Cloudflare Pages（連結 GitHub 自動部署）設定

| 欄位 | 值 |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| 環境變數 | `NODE_VERSION` = `22`（專案另有 `.node-version`） |

`/api/*` 由 `functions/` 資料夾的 Pages Functions 提供。第一次部署只含網頁與 API 骨架，`/api/health` 會回 `{"ok":true,"db":false}`。

## 啟用 D1 資料庫（排行榜需要）

專案有 `wrangler.toml`，D1 綁定要寫在檔案裡（儀表板不能另外設定）：

1. 在自己的電腦：`pnpm exec wrangler d1 create idiom-quest-db`
2. 把輸出的 `database_id` 填進 `wrangler.toml`，並取消 `[[d1_databases]]` 區塊的註解
3. `pnpm db:migrate:remote` 建立資料表
4. 推送到 GitHub，Cloudflare 會自動重新部署
5. 老師後台密碼：在儀表板 Settings > Variables and Secrets 新增 Secret `ADMIN_PASSWORD`

部署後打開 `/api/health`，看到 `{"ok":true,"db":true,...}` 代表已接通。資料表有變動時，要再執行一次 `pnpm db:migrate:remote`（推送程式碼不會自動套用）。
