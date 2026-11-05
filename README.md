# 成語闖關（五年級國語）

React + TypeScript + Tailwind 製作的成語闖關網頁，部署在 Cloudflare Pages，成績存放在 Cloudflare D1。

## 本機開發

```bash
pnpm install
pnpm build              # 建置到 dist/
pnpm db:migrate:local   # 建立本機 D1 資料表
pnpm dev:cf             # http://localhost:8788
```

## Cloudflare Pages（連結 GitHub 自動部署）設定

| 欄位 | 值 |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| 環境變數 | `NODE_VERSION` = `22`（專案另有 `.node-version`） |

建立專案後，在 Settings 補上：

- Bindings → D1 database：變數名稱 `DB`，選 `idiom-quest-db`
- Variables and Secrets：`ADMIN_PASSWORD`（老師後台密碼，用 Secret）

資料表有變動時，另外在自己的電腦執行 `pnpm db:migrate:remote`（Git 推送不會自動套用）。

## 驗證

部署後打開 `/api/health`，看到 `{"ok":true,...}` 代表網頁與資料庫已接通。
