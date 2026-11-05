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

/* ---------- 老師後台 ---------- */
export type AdminRow = {
  id: number;
  nickname: string;
  mode: "level" | "run";
  level_id: number;
  points: number;
  seconds: number;
  perfect: number;
  created_at: string;
};

export type AdminFail = { ok: false; reason: "unauthorized" | "disabled" | "unavailable" | "network" };

export async function adminLogin(
  password: string
): Promise<{ ok: true; token: string } | { ok: false; reason: "wrong" | "disabled" | "network" }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.status === 503) return { ok: false, reason: "disabled" };
    const data = (await res.json().catch(() => null)) as { ok?: boolean; token?: string } | null;
    if (res.ok && data?.ok && data.token) return { ok: true, token: data.token };
    if (res.status === 401) return { ok: false, reason: "wrong" };
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

async function adminCall<T>(token: string, path: string, init?: RequestInit): Promise<({ ok: true } & T) | AdminFail> {
  try {
    const res = await fetch(path, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 503) {
      const d = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, reason: d?.error === "admin_disabled" ? "disabled" : "unavailable" };
    }
    const data = (await res.json().catch(() => null)) as ({ ok?: boolean } & T) | null;
    if (res.ok && data?.ok) return { ...data, ok: true } as { ok: true } & T;
    return { ok: false, reason: "network" };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export function adminList(token: string, p: { scope: string; q: string; limit: number; offset: number }) {
  const qs = new URLSearchParams({ scope: p.scope, q: p.q, limit: String(p.limit), offset: String(p.offset) });
  return adminCall<{ total: number; rows: AdminRow[] }>(token, `/api/admin/scores?${qs}`);
}

export function adminDelete(token: string, ids: number[]) {
  return adminCall<{ deleted: number }>(token, "/api/admin/scores", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
