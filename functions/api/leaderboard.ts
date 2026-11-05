// GET /api/leaderboard?scope=run|1|2|3|4&board=points|time
import { LEVEL_COUNT, json } from "../_lib/rules";

interface Env {
  DB?: D1Database;
}

const LIMIT = 20;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 503);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "run";
  const board = url.searchParams.get("board") ?? "points";

  let mode: "run" | "level";
  let levelId: number;
  if (scope === "run") {
    mode = "run";
    levelId = 0;
  } else {
    levelId = Number(scope);
    if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVEL_COUNT) {
      return json({ ok: false, error: "invalid_scope" }, 400);
    }
    mode = "level";
  }
  if (board !== "points" && board !== "time") return json({ ok: false, error: "invalid_board" }, 400);

  // 積分賽：積分高者勝，同分比用時短；計時賽：只收 3 星成績，用時短者勝
  const sql =
    board === "points"
      ? `SELECT nickname, points, seconds, perfect, created_at FROM scores
         WHERE mode = ? AND level_id = ?
         ORDER BY points DESC, seconds ASC, id ASC LIMIT ?`
      : `SELECT nickname, points, seconds, perfect, created_at FROM scores
         WHERE mode = ? AND level_id = ? AND perfect = 1
         ORDER BY seconds ASC, points DESC, id ASC LIMIT ?`;

  try {
    const { results } = await env.DB.prepare(sql).bind(mode, levelId, LIMIT).all();
    return json({ ok: true, scope, board, rows: results });
  } catch (e) {
    return json({ ok: false, error: "db_error", detail: String(e) }, 500);
  }
};
