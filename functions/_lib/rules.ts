// 伺服器端規則：驗證成績是否合理。數值需與前端（src/lib.ts）的計分規則一致。
export const LEVEL_COUNT = 4;
/** 單關滿分：5 題 × 10 分 + 第 3~5 題連續第一次答對的加分 2 × 3 */
export const MAX_LEVEL_POINTS = 56;
export const MAX_RUN_POINTS = MAX_LEVEL_POINTS * LEVEL_COUNT;
/** 拿 3 星的門檻（單關） */
export const THREE_STAR_POINTS = 45;
/** 連續挑戰要視為「全部 3 星」的總分下限 */
export const RUN_PERFECT_MIN_POINTS = THREE_STAR_POINTS * LEVEL_COUNT;
/** 人類不可能更快：每關 5 題，每題至少約 1.6 秒 */
export const MIN_SECONDS_PER_LEVEL = 8;
export const MAX_SECONDS_PER_LEVEL = 1800;
export const NICKNAME_MAX = 12;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** 清理暱稱：移除控制字元、合併空白；回傳 null 代表不合法 */
export function cleanNickname(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const len = Array.from(s).length;
  if (len < 1 || len > NICKNAME_MAX) return null;
  return s;
}
