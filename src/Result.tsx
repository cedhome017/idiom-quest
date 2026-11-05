import { useState } from "react";
import { ArrowRight, Home, RotateCcw, Send, Timer, Trophy } from "lucide-react";
import type { Level } from "./data";
import { Stars, card } from "./components";
import { submitScore } from "./api";
import { formatTime, loadNick, saveNick, type LevelRecord, type Result } from "./lib";

/* ---------- 連續挑戰：關與關之間 ---------- */
export function BetweenScreen({
  record,
  next,
  onNext,
}: {
  record: LevelRecord;
  next: Level;
  onNext: () => void;
}) {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-jade-deep">連續挑戰</p>
      <h2 className="mt-1 font-serif text-3xl font-black">
        第 {record.levelId} 關完成
      </h2>
      <div className="anim-pop mt-4 flex justify-center">
        <Stars count={record.stars} size={44} />
      </div>
      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">本關得分</dt>
          <dd className="font-serif text-3xl font-black">{record.points}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">本關用時</dt>
          <dd className="font-serif text-2xl font-black">{formatTime(record.seconds)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-ink-soft">休息的時間不會計入總時間，準備好再按下一關。</p>
      <button
        type="button"
        onClick={onNext}
        className="mx-auto mt-5 flex min-h-[56px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-jade px-4 text-lg font-bold text-white shadow-[0_3px_0_#1f7a5a]"
      >
        前往第 {next.id} 關・{next.name} <ArrowRight size={20} />
      </button>
    </div>
  );
}

/* ---------- 上傳成績 ---------- */
export type Ranks = { points: number; time: number | null };

function SubmitBox({
  result,
  initial,
  onDone,
  onBoard,
}: {
  result: Result;
  /** 這筆成績已經上傳過時的名次（返回此畫面時用來避免重複上傳） */
  initial?: Ranks;
  onDone: (r: Ranks) => void;
  onBoard: () => void;
}) {
  const [nick, setNick] = useState(() => loadNick());
  const [state, setState] = useState<"idle" | "sending" | "done" | "unavailable" | "error">(
    initial ? "done" : "idle"
  );
  const [msg, setMsg] = useState("");
  const [ranks, setRanks] = useState<Ranks | null>(initial ?? null);

  const submit = async () => {
    const name = nick.trim();
    if (!name) {
      setMsg("請先輸入暱稱");
      return;
    }
    setState("sending");
    setMsg("");
    saveNick(name);
    const r = await submitScore({
      nickname: name,
      mode: result.mode,
      levelId: result.levelId,
      points: result.points,
      seconds: result.seconds,
      perfect: result.perfect,
    });
    if (r.ok) {
      const rk = { points: r.rankPoints, time: r.rankTime };
      setRanks(rk);
      setState("done");
      onDone(rk);
    } else if (r.reason === "unavailable") {
      setState("unavailable");
    } else {
      setState("error");
      setMsg(r.message);
    }
  };

  if (state === "done" && ranks) {
    return (
      <div className={`${card} anim-pop mx-auto mt-6 max-w-sm p-4 text-left`}>
        <p className="flex items-center gap-2 font-bold text-jade-deep">
          <Trophy size={20} /> 成績已上傳！
        </p>
        <p className="mt-2">
          積分賽目前第 <span className="font-serif text-2xl font-black">{ranks.points}</span> 名
        </p>
        {ranks.time !== null ? (
          <p>
            計時賽目前第 <span className="font-serif text-2xl font-black">{ranks.time}</span> 名
          </p>
        ) : (
          <p className="text-sm text-ink-soft">
            {result.mode === "run" ? "4 關都拿 3 星" : "拿到 3 星"}，才能進入計時賽喔。
          </p>
        )}
        <button
          type="button"
          onClick={onBoard}
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 font-bold text-white"
        >
          <Trophy size={18} /> 看排行榜
        </button>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-white/70 p-4 text-sm text-ink-soft">
        排行榜還沒有啟用，這次的成績不會被上傳。
      </p>
    );
  }

  return (
    <form
      className={`${card} mx-auto mt-6 max-w-sm p-4 text-left`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label htmlFor="nick" className="block font-bold">
        上傳成績到排行榜
      </label>
      <p className="mt-1 text-sm text-ink-soft">請輸入暱稱（最多 12 個字），不要用真實姓名喔。</p>
      <input
        id="nick"
        value={nick}
        onChange={(e) => setNick(e.target.value)}
        maxLength={12}
        autoComplete="off"
        placeholder="你的暱稱"
        className="mt-3 min-h-[48px] w-full rounded-xl border-2 border-ink/20 bg-sky-pale/50 px-3 text-lg focus:border-ink focus:outline-none"
      />
      {msg && (
        <p role="alert" className="mt-2 text-sm font-bold text-coral">
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-jade px-4 text-lg font-bold text-white disabled:opacity-60"
      >
        <Send size={18} /> {state === "sending" ? "上傳中…" : "上傳成績"}
      </button>
    </form>
  );
}

/* ---------- 結果 ---------- */
export function ResultScreen({
  result,
  nextLevel,
  nextUnlocked,
  submitted,
  onSubmitted,
  onHome,
  onRetry,
  onNext,
  onBoard,
}: {
  result: Result;
  nextLevel?: Level;
  nextUnlocked: boolean;
  submitted?: Ranks;
  onSubmitted: (r: Ranks) => void;
  onHome: () => void;
  onRetry: () => void;
  onNext: (l: Level) => void;
  onBoard: () => void;
}) {
  const isRun = result.mode === "run";
  const passed = result.stars >= 1;
  const msg = isRun
    ? result.perfect
      ? "全部 3 星！你是成語大達人！"
      : result.stars >= result.maxStars * 0.66
        ? "好厲害！再練習一次，就有機會拿滿星。"
        : "完成連續挑戰了！想提高排名，再來一次吧。"
    : result.stars === 3
      ? "太厲害了！你是成語小達人！"
      : result.stars === 2
        ? "很不錯！再練習一次，就有機會拿滿星。"
        : result.stars === 1
          ? "過關了！再挑戰一次，看看能不能拿更多星。"
          : "還差一點點，再試一次吧！記得看提示。";

  return (
    <div className="text-center">
      <p className="text-sm font-medium text-ink-soft">{result.title}</p>
      <h2 className="mt-1 font-serif text-4xl font-black">
        {isRun ? "挑戰完成" : passed ? "闖關成功" : "再接再厲"}
      </h2>
      <div className="anim-pop mt-5 flex justify-center">
        <Stars count={result.stars} max={result.maxStars} size={isRun ? 30 : 52} />
      </div>
      <p className="mt-4 text-lg font-bold">{msg}</p>

      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">得分</dt>
          <dd className="font-serif text-3xl font-black">{result.points}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="flex items-center justify-center gap-1 text-sm text-ink-soft">
            <Timer size={14} /> 用時
          </dt>
          <dd className="font-serif text-2xl font-black leading-[2.25rem]">{formatTime(result.seconds)}</dd>
        </div>
        <div className="col-span-2 rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">答對題數</dt>
          <dd className="font-serif text-3xl font-black">
            {result.correct} / {result.total}
          </dd>
        </div>
      </dl>

      {result.records && (
        <ul className="mx-auto mt-3 max-w-sm space-y-2 text-left">
          {result.records.map((r) => (
            <li key={r.levelId} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-sm">
              <span className="font-bold">
                第 {r.levelId} 關・{r.levelName}
              </span>
              <span className="flex items-center gap-2">
                <span>{r.points} 分</span>
                <Stars count={r.stars} size={14} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <SubmitBox result={result} initial={submitted} onDone={onSubmitted} onBoard={onBoard} />

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
        {!isRun && passed && nextLevel && nextUnlocked && (
          <button
            type="button"
            onClick={() => onNext(nextLevel)}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-jade px-4 text-lg font-bold text-white shadow-[0_3px_0_#1f7a5a]"
          >
            前往第 {nextLevel.id} 關・{nextLevel.name} <ArrowRight size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-white px-4 text-lg font-bold shadow-[0_3px_0_rgba(27,42,65,0.18)]"
        >
          <RotateCcw size={20} /> {isRun ? "再挑戰一次" : "再挑戰這一關"}
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl px-4 font-medium text-ink-soft"
        >
          <Home size={18} /> 回關卡地圖
        </button>
      </div>
    </div>
  );
}
