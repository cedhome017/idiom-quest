import type { Mode } from "./lib";

export type Board = "points" | "time";
/** "run" = 連續挑戰總榜；"1"~"4" = 各關 */
export type Scope = "run" | "1" | "2" | "3" | "4";

export type Row = {
  nickname: string;
  points: number;
  seconds: number;
  perfect: number;
  created_at: string;
};

export type SubmitPayload = {
  nickname: string;
  mode: Mode;
  levelId: number;
  points: number;
  seconds: number;
  perfect: boolean;
};

export type SubmitResult =
  | { ok: true; rankPoints: number; rankTime: number | null }
  | { ok: false; reason: "unavailable" | "invalid" | "network"; message: string };

export async function submitScore(p: SubmitPayload): Promise<SubmitResult> {
  try {
    const res = await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    if (res.status === 503) {
      return { ok: false, reason: "unavailable", message: "排行榜還沒有啟用" };
    }
    const data = (await res.json().catch(() => null)) as
      | { ok: boolean; rankPoints?: number; rankTime?: number | null; error?: string }
      | null;
    if (res.ok && data?.ok) {
      return { ok: true, rankPoints: data.rankPoints ?? 0, rankTime: data.rankTime ?? null };
    }
    if (res.status === 400) {
      const msg =
        data?.error === "invalid_nickname"
          ? "暱稱要 1 到 12 個字"
          : "這筆成績不符合規則，無法上傳";
      return { ok: false, reason: "invalid", message: msg };
    }
    return { ok: false, reason: "network", message: "上傳失敗，請稍後再試" };
  } catch {
    return { ok: false, reason: "network", message: "連不上網路，請稍後再試" };
  }
}

export type BoardResult =
  | { ok: true; rows: Row[] }
  | { ok: false; reason: "unavailable" | "network" };

export async function fetchLeaderboard(scope: Scope, board: Board): Promise<BoardResult> {
  try {
    const res = await fetch(`/api/leaderboard?scope=${scope}&board=${board}`, { cache: "no-store" });
    if (res.status === 503) return { ok: false, reason: "unavailable" };
    const data = (await res.json().catch(() => null)) as { ok: boolean; rows?: Row[] } | null;
    if (res.ok && data?.ok && Array.isArray(data.rows)) return { ok: true, rows: data.rows };
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
