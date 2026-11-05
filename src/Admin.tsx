import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LogOut, Search, Trash2 } from "lucide-react";
import { LEVELS } from "./data";
import { card, ConfirmBar } from "./components";
import { adminDelete, adminList, adminLogin, type AdminRow } from "./api";
import { formatTime } from "./lib";

const TOKEN_KEY = "idiom-quest-admin-token";
const PAGE_SIZE = 30;

const SCOPES: { id: string; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "run", label: "總榜" },
  ...LEVELS.map((l) => ({ id: String(l.id), label: `第${l.id}關` })),
];

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeToken(t: string) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 無法使用 sessionStorage 時，只在本頁記憶體保存 */
  }
}

function taipeiTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Load =
  | { s: "loading" }
  | { s: "ok"; rows: AdminRow[]; total: number }
  | { s: "error"; msg: string };

function Login({ onToken, onBack }: { onToken: (t: string) => void; onBack: () => void }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true);
    setMsg("");
    const r = await adminLogin(pw);
    setBusy(false);
    if (r.ok) {
      writeToken(r.token);
      onToken(r.token);
      return;
    }
    setPw("");
    setMsg(
      r.reason === "wrong"
        ? "密碼不正確。"
        : r.reason === "disabled"
          ? "後台還沒有啟用：請先在 Cloudflare 設定 ADMIN_PASSWORD。"
          : "連線失敗，請稍後再試。"
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
      >
        <ArrowLeft size={16} /> 回遊戲首頁
      </button>
      <h2 className="font-serif text-4xl font-black">老師後台</h2>
      <form onSubmit={submit} className={`${card} mt-4 p-5`}>
        <label htmlFor="admin-pw" className="block font-bold">
          後台密碼
        </label>
        <input
          id="admin-pw"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mt-2 min-h-[48px] w-full rounded-xl border-2 border-ink/20 bg-white px-3 text-lg"
        />
        {msg && (
          <p role="alert" className="mt-3 font-bold text-coral">
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={!pw || busy}
          className="mt-4 min-h-[48px] w-full rounded-xl bg-ink px-4 font-bold text-white disabled:opacity-40"
        >
          {busy ? "登入中…" : "登入"}
        </button>
      </form>
    </div>
  );
}

function Panel({ token, onLogout, onBack }: { token: string; onLogout: () => void; onBack: () => void }) {
  const [scope, setScope] = useState("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [load, setLoad] = useState<Load>({ s: "loading" });
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoad({ s: "loading" });
    void adminList(token, { scope, q, limit: PAGE_SIZE, offset: page * PAGE_SIZE }).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        // 刪除後最後一頁變空時，退回前一頁
        if (r.rows.length === 0 && r.total > 0 && page > 0) {
          setPage(Math.max(0, Math.ceil(r.total / PAGE_SIZE) - 1));
          return;
        }
        setLoad({ s: "ok", rows: r.rows, total: r.total });
        return;
      }
      if (r.reason === "unauthorized") {
        onLogout();
        return;
      }
      setLoad({
        s: "error",
        msg:
          r.reason === "disabled"
            ? "後台還沒有啟用（尚未設定 ADMIN_PASSWORD）。"
            : r.reason === "unavailable"
              ? "資料庫尚未啟用。"
              : "讀取失敗，請稍後再試。",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [token, scope, q, page, tick, onLogout]);

  const rows = load.s === "ok" ? load.rows : [];
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.id));

  const changeScope = (id: string) => {
    setScope(id);
    setPage(0);
    setPicked(new Set());
    setConfirming(false);
    setNote("");
  };

  const toggle = (id: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
  };

  const doDelete = useCallback(async () => {
    const ids = [...picked];
    setConfirming(false);
    const r = await adminDelete(token, ids);
    if (r.ok) {
      setNote(`已刪除 ${r.deleted} 筆。`);
      setPicked(new Set());
      setTick((t) => t + 1);
    } else if (r.reason === "unauthorized") {
      onLogout();
    } else {
      setNote("刪除失敗，請稍後再試。");
    }
  }, [picked, token, onLogout]);

  const totalPages = load.s === "ok" ? Math.max(1, Math.ceil(load.total / PAGE_SIZE)) : 1;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
        >
          <ArrowLeft size={16} /> 回遊戲首頁
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
        >
          <LogOut size={16} /> 登出
        </button>
      </div>

      <h2 className="font-serif text-4xl font-black">老師後台</h2>
      <p className="mt-1 text-sm text-ink-soft">查看與刪除學生上傳的成績。</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="範圍">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={scope === s.id}
            onClick={() => changeScope(s.id)}
            className={`min-h-[44px] shrink-0 rounded-full px-4 font-bold ${
              scope === s.id ? "bg-ink text-white" : "bg-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(qInput.trim());
          setPage(0);
          setPicked(new Set());
          setConfirming(false);
        }}
      >
        <input
          type="search"
          aria-label="搜尋暱稱"
          placeholder="搜尋暱稱"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="min-h-[48px] min-w-0 flex-1 rounded-xl border-2 border-ink/20 bg-white px-3"
        />
        <button
          type="submit"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-jade px-4 font-bold text-white"
        >
          <Search size={18} /> 搜尋
        </button>
      </form>

      {note && (
        <p role="status" className="mt-3 rounded-xl bg-white p-3 font-bold text-jade">
          {note}
        </p>
      )}

      <div className="mt-4">
        {confirming && (
          <ConfirmBar
            text={`確定要刪除選取的 ${picked.size} 筆成績嗎？刪除後無法復原。`}
            okLabel="確定刪除"
            cancelLabel="取消"
            onOk={() => void doDelete()}
            onCancel={() => setConfirming(false)}
          />
        )}

        {load.s === "loading" && <p className={`${card} p-5 text-center text-ink-soft`}>載入中…</p>}
        {load.s === "error" && (
          <div className={`${card} p-5 text-center`}>
            <p className="text-ink-soft">{load.msg}</p>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              className="mt-3 min-h-[44px] rounded-xl bg-ink px-5 font-bold text-white"
            >
              重新載入
            </button>
          </div>
        )}
        {load.s === "ok" && (
          <>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="inline-flex min-h-[44px] items-center gap-2 font-bold">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={allPicked}
                  disabled={rows.length === 0}
                  onChange={() => {
                    setConfirming(false);
                    setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.id)));
                  }}
                />
                全選本頁
              </label>
              <button
                type="button"
                disabled={picked.size === 0}
                onClick={() => setConfirming(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-coral px-4 font-bold text-white disabled:opacity-40"
              >
                <Trash2 size={18} /> 刪除（{picked.size}）
              </button>
            </div>
            <p className="mb-2 text-sm text-ink-soft">共 {load.total} 筆</p>

            {rows.length === 0 ? (
              <p className={`${card} p-5 text-center text-ink-soft`}>沒有符合的成績。</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0"
                        checked={picked.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`選取 ${r.nickname}`}
                      />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-lg font-bold">{r.nickname}</span>
                        <span className="block text-xs text-ink-soft">
                          {r.mode === "run" ? "總榜（連續挑戰）" : `第 ${r.level_id} 關`}
                          {r.perfect ? "・全 3 星" : ""}
                          {" ・ "}
                          {taipeiTime(r.created_at)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right leading-tight">
                        <span className="block font-serif text-xl font-black">{r.points} 分</span>
                        <span className="block text-xs text-ink-soft">{formatTime(r.seconds)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => {
                  setPage((p) => p - 1);
                  setPicked(new Set());
                  setConfirming(false);
                }}
                className="min-h-[44px] rounded-xl bg-white px-4 font-bold disabled:opacity-40"
              >
                上一頁
              </button>
              <span className="text-sm text-ink-soft">
                第 {page + 1} / {totalPages} 頁
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => {
                  setPage((p) => p + 1);
                  setPicked(new Set());
                  setConfirming(false);
                }}
                className="min-h-[44px] rounded-xl bg-white px-4 font-bold disabled:opacity-40"
              >
                下一頁
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminScreen({ onExit }: { onExit: () => void }) {
  const [token, setToken] = useState(readToken);
  const logout = useCallback(() => {
    writeToken("");
    setToken("");
  }, []);

  return token ? (
    <Panel token={token} onLogout={logout} onBack={onExit} />
  ) : (
    <Login onToken={setToken} onBack={onExit} />
  );
}
