// Cloudflare Worker：處理 /api/*，其餘請求交給靜態網頁（dist/）。
interface Env {
  DB?: D1Database; // 建立 D1 並在 wrangler.toml 啟用綁定後才會存在
  ASSETS: Fetcher;
  ADMIN_PASSWORD?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      if (!env.DB) {
        return Response.json({ ok: true, db: false, note: "D1 尚未綁定" });
      }
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores").first<{ n: number }>();
        return Response.json({ ok: true, db: true, scores: row?.n ?? 0 });
      } catch (e) {
        return Response.json({ ok: false, db: true, error: String(e) }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
