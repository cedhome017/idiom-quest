// POST /api/scores：學生上傳成績（免登入）。
import {
  LEVEL_COUNT,
  MAX_LEVEL_POINTS,
  MAX_RUN_POINTS,
  MAX_SECONDS_PER_LEVEL,
  MIN_SECONDS_PER_LEVEL,
  RUN_PERFECT_MIN_POINTS,
  THREE_STAR_POINTS,
  cleanNickname,
  json,
} from "../_lib/rules";

interface Env {
  DB?: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) return json({ ok: false, error: "db_unavailable" }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const nickname = cleanNickname(body.nickname);
  if (!nickname) return json({ ok: false, error: "invalid_nickname" }, 400);

  const mode = body.mode;
  if (mode !== "level" && mode !== "run") return json({ ok: false, error: "invalid_mode" }, 400);

  let levelId: number;
  let maxPoints: number;
  let levels: number;
  if (mode === "level") {
    levelId = Number(body.levelId);
    if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVEL_COUNT) {
      return json({ ok: false, error: "invalid_level" }, 400);
    }
    maxPoints = MAX_LEVEL_POINTS;
    levels = 1;
  } else {
    levelId = 0;
    maxPoints = MAX_RUN_POINTS;
    levels = LEVEL_COUNT;
  }

  const points = Number(body.points);
  if (!Number.isInteger(points) || points < 0 || points > maxPoints) {
    return json({ ok: false, error: "invalid_points" }, 400);
  }

  const secondsRaw = Number(body.seconds);
  const minSeconds = MIN_SECONDS_PER_LEVEL * levels;
  const maxSeconds = MAX_SECONDS_PER_LEVEL * levels;
  if (!Number.isFinite(secondsRaw) || secondsRaw < minSeconds || secondsRaw > maxSeconds) {
    return json({ ok: false, error: "invalid_seconds" }, 400);
  }
  const seconds = Math.round(secondsRaw * 10) / 10;

  // 計時賽資格：單關 3 星；連續挑戰需 4 關都 3 星（用前端旗標 + 總分下限雙重檢查）
  const perfect =
    mode === "level"
      ? points >= THREE_STAR_POINTS
      : body.perfect === true && points >= RUN_PERFECT_MIN_POINTS;

  try {
    const res = await env.DB.prepare(
      "INSERT INTO scores (nickname, mode, level_id, points, seconds, perfect) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(nickname, mode, levelId, points, seconds, perfect ? 1 : 0)
      .run();

    const better = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM scores
       WHERE mode = ? AND level_id = ?
         AND (points > ? OR (points = ? AND seconds < ?))`
    )
      .bind(mode, levelId, points, points, seconds)
      .first<{ n: number }>();

    let rankTime: number | null = null;
    if (perfect) {
      const faster = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM scores WHERE mode = ? AND level_id = ? AND perfect = 1 AND seconds < ?"
      )
        .bind(mode, levelId, seconds)
        .first<{ n: number }>();
      rankTime = (faster?.n ?? 0) + 1;
    }

    return json({
      ok: true,
      id: res.meta.last_row_id,
      rankPoints: (better?.n ?? 0) + 1,
      rankTime,
      perfect,
    });
  } catch (e) {
    return json({ ok: false, error: "db_error", detail: String(e) }, 500);
  }
};
