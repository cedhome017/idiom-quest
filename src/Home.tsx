import { useState } from "react";
import { Lock, Star, Swords, Trophy } from "lucide-react";
import { LEVELS, type Level } from "./data";
import { ConfirmBar, Stars, card } from "./components";
import type { Progress } from "./lib";

export function HomeScreen({
  progress,
  isUnlocked,
  onStart,
  onRun,
  onBoard,
  onReset,
}: {
  progress: Progress;
  isUnlocked: (id: number) => boolean;
  onStart: (l: Level) => void;
  onRun: () => void;
  onBoard: () => void;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const total = Object.values(progress).reduce((s, p) => s + p.stars, 0);
  const allDone = LEVELS.every((l) => (progress[l.id]?.stars ?? 0) >= 1);

  return (
    <div>
      <header className="mb-5">
        <p className="text-sm font-medium text-ink-soft">五年級國語　成語單元</p>
        <h1 className="mt-1 font-serif text-5xl font-black leading-tight tracking-wide text-ink sm:text-6xl">
          成語闖關
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          一共 {LEVELS.length} 關，每關 5 題。答錯會有提示，加油！
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
            <Star size={20} className="fill-sun text-sun-deep" />
            <span className="font-bold">
              {total} / {LEVELS.length * 3}
            </span>
            <span className="text-sm text-ink-soft">顆星</span>
          </div>
          <button
            type="button"
            onClick={onBoard}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-ink px-4 py-2 font-bold text-white"
          >
            <Trophy size={18} /> 排行榜
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={onRun}
        className="mb-5 flex w-full items-center gap-4 rounded-2xl bg-jade p-4 text-left text-white shadow-[0_3px_0_#1f7a5a] active:translate-y-[1px]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Swords size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-2xl font-black">連續挑戰</span>
          <span className="block text-sm text-white/90">一口氣闖完 4 關，比總積分與總時間</span>
        </span>
      </button>

      <h2 className="mb-3 font-serif text-xl font-black">單關練習</h2>
      <ol className="relative space-y-4">
        <span aria-hidden className="absolute bottom-6 left-[34px] top-6 w-1 rounded bg-ink/15" />
        {LEVELS.map((level) => {
          const unlocked = isUnlocked(level.id);
          const p = progress[level.id];
          return (
            <li key={level.id} className="relative">
              <button
                type="button"
                disabled={!unlocked}
                onClick={() => onStart(level)}
                aria-label={`第 ${level.id} 關 ${level.name}${unlocked ? "" : "，尚未解鎖"}`}
                className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.99] ${
                  unlocked
                    ? `${card} hover:shadow-[0_5px_0_rgba(27,42,65,0.18)]`
                    : "bg-white/50"
                }`}
              >
                <span
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-serif text-2xl font-black ${
                    unlocked
                      ? "bg-sun text-ink ring-4 ring-white"
                      : "bg-ink/10 text-ink/40 ring-4 ring-white/60"
                  }`}
                >
                  {unlocked ? level.id : <Lock size={22} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-2xl font-black text-ink">{level.name}</span>
                  <span className="block text-sm text-ink-soft">{level.subtitle}</span>
                  {unlocked && p && (
                    <span className="mt-1 block text-xs text-ink-soft">最高 {p.best} 分</span>
                  )}
                </span>
                {unlocked && <Stars count={p?.stars ?? 0} size={20} />}
              </button>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <p className="anim-pop mt-6 rounded-2xl bg-jade-pale p-4 text-center font-bold text-jade-deep">
          恭喜你，全部關卡都通過了！想拿滿 3 顆星，就再挑戰一次吧。
        </p>
      )}

      <p className="mt-6 text-sm text-ink-soft">
        單關通關方式：每關拿到至少 1 顆星，就能打開下一關。連續挑戰隨時都可以玩。
      </p>
      {total > 0 && !confirmReset && (
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="mt-3 text-sm text-ink-soft underline underline-offset-4"
        >
          清除闖關紀錄
        </button>
      )}
      {confirmReset && (
        <div className="mt-4">
          <ConfirmBar
            text="確定要清除這台裝置上的闖關紀錄嗎？（已上傳的排行榜成績不受影響）"
            okLabel="清除"
            onOk={() => {
              onReset();
              setConfirmReset(false);
            }}
            onCancel={() => setConfirmReset(false)}
          />
        </div>
      )}
    </div>
  );
}
