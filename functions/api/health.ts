// 健康檢查：確認 API 與 D1 綁定。部署後可打 /api/health 驗證。
import { json } from "../_lib/rules";

interface Env {
  DB?: D1Database; // 建立 D1 並在 Cloudflare 儀表板綁定後才會存在
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return json({ ok: true, db: false, note: "D1 尚未綁定" });
  }
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores").first<{ n: number }>();
    return json({ ok: true, db: true, scores: row?.n ?? 0 });
  } catch (e) {
    return json({ ok: false, db: true, error: String(e) }, 500);
  }
};
