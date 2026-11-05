// GET /api/admin/scores：後台查看成績；DELETE /api/admin/scores：刪除選取的成績。
import { requireAdmin, type AdminEnv } from "../../_lib/auth";
import { LEVEL_COUNT, json } from "../../_lib/rules";

interface Env extends AdminEnv {
  DB?: D1Database;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;
const MAX_DELETE = 100;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 503);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 30);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "", 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "", 10) || 0, 0);

  const where: string[] = [];
  const binds: (string | number)[] = [];

  if (scope === "run") {
    where.push("mode = 'run'");
  } else if (scope !== "all") {
    const lv = Number(scope);
    if (!Number.isInteger(lv) || lv < 1 || lv > LEVEL_COUNT) return json({ ok: false, error: "invalid_scope" }, 400);
    where.push("mode = 'level' AND level_id = ?");
    binds.push(lv);
  }
  if (q) {
    where.push("nickname LIKE ? ESCAPE '\\'");
    binds.push("%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%");
  }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  try {
    const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM scores ${whereSql}`)
      .bind(...binds)
      .first<{ n: number }>();
    const { results } = await env.DB.prepare(
      `SELECT id, nickname, mode, level_id, points, seconds, perfect, created_at
       FROM scores ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
      .bind(...binds, limit, offset)
      .all();
    return json({ ok: true, total: total?.n ?? 0, rows: results });
  } catch (e) {
    return json({ ok: false, error: "db_error", detail: String(e) }, 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 503);

  let ids: number[];
  try {
    const body = (await request.json()) as { ids?: unknown };
    if (!Array.isArray(body.ids)) throw new Error("ids");
    ids = body.ids.map(Number);
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }
  if (ids.length < 1 || ids.length > MAX_DELETE || !ids.every((n) => Number.isInteger(n) && n > 0)) {
    return json({ ok: false, error: "invalid_ids" }, 400);
  }

  try {
    const placeholders = ids.map(() => "?").join(",");
    const res = await env.DB.prepare(`DELETE FROM scores WHERE id IN (${placeholders})`)
      .bind(...ids)
      .run();
    return json({ ok: true, deleted: res.meta.changes });
  } catch (e) {
    return json({ ok: false, error: "db_error", detail: String(e) }, 500);
  }
};
