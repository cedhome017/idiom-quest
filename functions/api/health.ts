// 健康檢查：確認 API 與 D1 綁定都正常。部署後可打 /api/health 驗證。
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores").first<{ n: number }>();
    return Response.json({ ok: true, scores: row?.n ?? 0 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
};
