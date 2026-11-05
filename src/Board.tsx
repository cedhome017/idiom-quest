import { useEffect, useState } from "react";
import { ArrowLeft, Timer, Trophy } from "lucide-react";
import { LEVELS } from "./data";
import { card } from "./components";
import { fetchLeaderboard, type Board, type Row, type Scope } from "./api";
import { formatTime } from "./lib";

const SCOPES: { id: Scope; label: string }[] = [
  { id: "run", label: "總榜" },
  ...LEVELS.map((l) => ({ id: String(l.id) as Scope, label: `第${l.id}關` })),
];

type Load =
  | { s: "loading" }
  | { s: "ok"; rows: Row[] }
  | { s: "unavailable" }
  | { s: "error" };

function rankStyle(rank: number) {
  if (rank === 1) return "bg-sun text-ink";
  if (rank === 2) return "bg-ink/15 text-ink";
  if (rank === 3) return "bg-[#E9B58A] text-ink";
  return "bg-sky-pale text-ink-soft";
}

export function BoardScreen({
  initialScope,
  onBack,
}: {
  initialScope: Scope;
  onBack: () => void;
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [board, setBoard] = useState<Board>("points");
  const [load, setLoad] = useState<Load>({ s: "loading" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ s: "loading" });
    void fetchLeaderboard(scope, board).then((r) => {
      if (cancelled) return;
      if (r.ok) setLoad({ s: "ok", rows: r.rows });
      else setLoad({ s: r.reason === "unavailable" ? "unavailable" : "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [scope, board, tick]);

  const isRun = scope === "run";

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
      >
        <ArrowLeft size={16} /> 返回
      </button>

      <h2 className="flex items-center gap-2 font-serif text-4xl font-black">
        <Trophy className="text-sun-deep" size={32} /> 排行榜
      </h2>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="範圍">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={scope === s.id}
            onClick={() => setScope(s.id)}
            className={`min-h-[44px] shrink-0 rounded-full px-4 font-bold ${
              scope === s.id ? "bg-ink text-white" : "bg-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2" role="tablist" aria-label="賽制">
        <button
          type="button"
          role="tab"
          aria-selected={board === "points"}
          onClick={() => setBoard("points")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl font-bold ${
            board === "points" ? "bg-jade text-white" : "bg-white"
          }`}
        >
          <Trophy size={18} /> 積分賽
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={board === "time"}
          onClick={() => setBoard("time")}
          className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl font-bold ${
            board === "time" ? "bg-jade text-white" : "bg-white"
          }`}
        >
          <Timer size={18} /> 計時賽
        </button>
      </div>

      <p className="mt-3 text-sm text-ink-soft">
        {board === "points"
          ? "積分高的排前面，同分比誰用時短。"
          : isRun
            ? "只收 4 關都拿 3 星的成績，用時短的排前面。"
            : "只收這一關拿 3 星的成績，用時短的排前面。"}
        {isRun ? "（連續挑戰）" : ""}
      </p>

      <div className="mt-4">
        {load.s === "loading" && <p className={`${card} p-5 text-center text-ink-soft`}>載入中…</p>}
        {load.s === "unavailable" && (
          <p className={`${card} p-5 text-center text-ink-soft`}>排行榜還沒有啟用。</p>
        )}
        {load.s === "error" && (
          <div className={`${card} p-5 text-center`}>
            <p className="text-ink-soft">讀取失敗，請稍後再試。</p>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              className="mt-3 min-h-[44px] rounded-xl bg-ink px-5 font-bold text-white"
            >
              重新載入
            </button>
          </div>
        )}
        {load.s === "ok" && load.rows.length === 0 && (
          <p className={`${card} p-5 text-center text-ink-soft`}>
            還沒有人上榜，快來搶第一名！
          </p>
        )}
        {load.s === "ok" && load.rows.length > 0 && (
          <ol className="space-y-2">
            {load.rows.map((r, i) => (
              <li
                key={`${r.created_at}-${i}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-lg font-black ${rankStyle(i + 1)}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-lg font-bold">{r.nickname}</span>
                <span className="shrink-0 text-right leading-tight">
                  <span className="block font-serif text-xl font-black">
                    {board === "points" ? `${r.points} 分` : formatTime(r.seconds)}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {board === "points" ? formatTime(r.seconds) : `${r.points} 分`}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
