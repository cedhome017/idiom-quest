# 成語闖關（五年級國語）

React + TypeScript + Tailwind 製作的成語闖關網頁，部署在 Cloudflare Workers（靜態資源 + API），成績存放在 Cloudflare D1。

## 本機開發

```bash
pnpm install
pnpm dev:cf             # 建置後以 wrangler dev 啟動，http://localhost:8787
pnpm db:migrate:local   # 建立本機 D1 資料表（啟用 D1 綁定後）
```

## Cloudflare（連結 GitHub 自動部署）設定

在 Workers & Pages 建立 Worker 並連接這個儲存庫，欄位如下：

| 欄位 | 值 |
|---|---|
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| 環境變數 | `NODE_VERSION` = `22`（專案另有 `.node-version`） |

第一次部署只含網頁，`/api/health` 會回 `{"ok":true,"db":false}`。

## 啟用 D1 資料庫（排行榜需要）

1. 在自己的電腦：`pnpm exec wrangler d1 create idiom-quest-db`
2. 把輸出的 `database_id` 填進 `wrangler.toml`，並取消 `[[d1_databases]]` 區塊的註解
3. `pnpm db:migrate:remote` 建立資料表
4. 推送到 GitHub，Cloudflare 會自動重新部署
5. 老師後台密碼：`pnpm exec wrangler secret put ADMIN_PASSWORD`

部署後打開 `/api/health`，看到 `{"ok":true,"db":true,...}` 代表已接通。資料表有變動時，要再執行一次 `pnpm db:migrate:remote`（推送程式碼不會自動套用）。
