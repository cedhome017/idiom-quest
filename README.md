# 成語闖關（五年級國語）

React + TypeScript + Tailwind 製作的成語闖關網頁，部署在 Cloudflare Pages（靜態網頁 + Pages Functions API），成績存放在 Cloudflare D1。

## Cloudflare Pages（連結 GitHub 自動部署）

| 欄位 | 值 |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| 環境變數 | `NODE_VERSION` = `22`（專案另有 `.node-version`） |

`/api/*` 由 `functions/` 資料夾的 Pages Functions 提供。

## 啟用排行榜（全部在 Cloudflare 網頁上操作）

1. 儀表板 > Storage & databases > D1 SQL database > Create，名稱填 `idiom-quest-db`。
2. 進入該資料庫的 Console 分頁，把 `d1-setup.sql` 的內容整份貼上並執行（建立資料表與索引）。
3. 到 Pages 專案 `idiom-quest` > Settings > Bindings > Add > D1 database，Variable name 填 `DB`，選 `idiom-quest-db`（Production 與 Preview 都設）。
4. 到 Deployments 重新部署一次（Retry deployment），讓綁定生效。
5. 打開 `/api/health`，看到 `{"ok":true,"db":true,...}` 代表已接通。

資料表結構以 `migrations/0001_init.sql` 為準，`d1-setup.sql` 是它去掉註解的版本，兩者內容需一致。

## 老師後台

網址：`https://idiom-quest.pages.dev/teacher`（首頁沒有連結，老師自行收藏即可）。可依範圍篩選、搜尋暱稱、勾選後刪除成績。

啟用方式：Pages 專案 > Settings > Variables and secrets > Add，類型選 **Secret**，名稱 `ADMIN_PASSWORD`，值填自訂的後台密碼（Production 與 Preview 都設），再重新部署一次。未設定時後台會顯示「尚未啟用」。

登入成功會得到 8 小時有效的簽章憑證，存在瀏覽器分頁（關閉分頁即登出）。網址本身不是保護，密碼才是。

## 本機開發

```bash
pnpm install
pnpm db:migrate:local   # 建立本機 D1 資料表（使用 wrangler.local.toml）
pnpm dev:cf             # 建置後啟動，http://localhost:8788
```

要測試後台，在專案根目錄建立 `.dev.vars`（已被 git 忽略）：

```
ADMIN_PASSWORD=自訂的測試密碼
```

`wrangler.local.toml` 只用於本機開發。專案刻意沒有 `wrangler.toml`，這樣線上的 D1 綁定才能在儀表板設定。
