import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Home,
  Lightbulb,
  Lock,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { LEVELS, type Level, type Question } from "./data";

/* ---------- 計分規則 ---------- */
const POINTS_FIRST = 10; // 第一次就答對
const POINTS_SECOND = 5; // 看過提示後第二次答對
const COMBO_BONUS = 2; // 連續 3 題（含）以上第一次答對，每題加分
const MAX_TRIES = 2;

function starsFor(points: number) {
  if (points >= 45) return 3;
  if (points >= 30) return 2;
  if (points >= 15) return 1;
  return 0;
}

/* ---------- 進度儲存（只在此瀏覽器） ---------- */
type Progress = Record<number, { stars: number; best: number }>;
const KEY = "idiom-quest-progress-v1";

function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}
function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* 無法儲存時略過 */
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Screen =
  | { name: "home" }
  | { name: "play"; level: Level; run: number }
  | { name: "result"; level: Level; points: number; correct: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const runCounter = useRef(0);
  const startLevel = (level: Level) =>
    setScreen({ name: "play", level, run: ++runCounter.current });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const isUnlocked = (id: number) =>
    id === 1 || (progress[id - 1]?.stars ?? 0) >= 1;

  const finishLevel = (level: Level, points: number, correct: number) => {
    const stars = starsFor(points);
    const prev = progress[level.id];
    const next: Progress = {
      ...progress,
      [level.id]: {
        stars: Math.max(prev?.stars ?? 0, stars),
        best: Math.max(prev?.best ?? 0, points),
      },
    };
    setProgress(next);
    saveProgress(next);
    setScreen({ name: "result", level, points, correct });
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-5 sm:pt-8">
        {screen.name === "home" && (
          <HomeScreen
            progress={progress}
            isUnlocked={isUnlocked}
            onStart={startLevel}
            onReset={() => {
              setProgress({});
              saveProgress({});
            }}
          />
        )}
        {screen.name === "play" && (
          <PlayScreen
            key={screen.run}
            level={screen.level}
            onExit={() => setScreen({ name: "home" })}
            onFinish={finishLevel}
          />
        )}
        {screen.name === "result" && (
          <ResultScreen
            level={screen.level}
            points={screen.points}
            correct={screen.correct}
            nextLevel={LEVELS.find((l) => l.id === screen.level.id + 1)}
            nextUnlocked={isUnlocked(screen.level.id + 1)}
            onHome={() => setScreen({ name: "home" })}
            onRetry={() => startLevel(screen.level)}
            onNext={startLevel}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- 頁面內確認列（沙盒中不能用 window.confirm） ---------- */
function ConfirmBar({
  text,
  okLabel,
  onOk,
  onCancel,
}: {
  text: string;
  okLabel: string;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={text}
      className="anim-pop mb-4 rounded-2xl bg-white p-4 shadow-[0_3px_0_rgba(27,42,65,0.18)] ring-2 ring-coral"
    >
      <p className="font-bold">{text}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={onOk}
          className="min-h-[48px] flex-1 rounded-xl bg-coral px-3 font-bold text-white"
        >
          {okLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] flex-1 rounded-xl bg-sky-pale px-3 font-bold"
        >
          繼續
        </button>
      </div>
    </div>
  );
}

/* ---------- 星星 ---------- */
function Stars({ count, size = 22 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${count} 顆星，共 3 顆`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={2}
          className={
            n <= count ? "fill-sun text-sun-deep" : "fill-transparent text-ink/25"
          }
        />
      ))}
    </span>
  );
}

/* ---------- 首頁：關卡地圖 ---------- */
function HomeScreen({
  progress,
  isUnlocked,
  onStart,
  onReset,
}: {
  progress: Progress;
  isUnlocked: (id: number) => boolean;
  onStart: (l: Level) => void;
  onReset: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const total = Object.values(progress).reduce((s, p) => s + p.stars, 0);
  const allDone = LEVELS.every((l) => (progress[l.id]?.stars ?? 0) >= 1);

  return (
    <div>
      <header className="mb-6">
        <p className="text-sm font-medium text-ink-soft">五年級國語　成語單元</p>
        <h1 className="mt-1 font-serif text-5xl font-black leading-tight tracking-wide text-ink sm:text-6xl">
          成語闖關
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          一共 {LEVELS.length} 關，每關 5 題。答錯會有提示，加油！
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
          <Star size={20} className="fill-sun text-sun-deep" />
          <span className="font-bold">
            {total} / {LEVELS.length * 3}
          </span>
          <span className="text-sm text-ink-soft">顆星</span>
        </div>
      </header>

      <ol className="relative space-y-4">
        <span
          aria-hidden
          className="absolute bottom-6 left-[34px] top-6 w-1 rounded bg-ink/15"
        />
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
                    ? "bg-white shadow-[0_3px_0_rgba(27,42,65,0.18)] hover:shadow-[0_5px_0_rgba(27,42,65,0.18)]"
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
                  <span className="block font-serif text-2xl font-black text-ink">
                    {level.name}
                  </span>
                  <span className="block text-sm text-ink-soft">{level.subtitle}</span>
                  {unlocked && p && (
                    <span className="mt-1 block text-xs text-ink-soft">
                      最高 {p.best} 分
                    </span>
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
        通關方式：每關拿到至少 1 顆星，就能打開下一關。
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
            text="確定要清除所有闖關紀錄嗎？"
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

/* ---------- 作答畫面 ---------- */
type Status = "answering" | "correct" | "revealed";

function PlayScreen({
  level,
  onExit,
  onFinish,
}: {
  level: Level;
  onExit: () => void;
  onFinish: (level: Level, points: number, correct: number) => void;
}) {
  const questions = useMemo<Question[]>(() => shuffle(level.questions), [level]);
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("answering");
  const [gained, setGained] = useState<number | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);

  const q = questions[index];
  const options = useMemo(() => shuffle([q.answer, ...q.wrong]), [q]);
  const isShort = options.every((o) => o.length <= 6);
  const isLast = index === questions.length - 1;

  const pick = (choice: string) => {
    if (status !== "answering" || wrongPicks.includes(choice)) return;
    const tries = wrongPicks.length + 1;

    if (choice === q.answer) {
      const first = tries === 1;
      const nextCombo = first ? combo + 1 : 0;
      const bonus = first && nextCombo >= 3 ? COMBO_BONUS : 0;
      const add = (first ? POINTS_FIRST : POINTS_SECOND) + bonus;
      setCombo(nextCombo);
      setPoints((p) => p + add);
      setGained(add);
      setCorrectCount((c) => c + 1);
      setStatus("correct");
      return;
    }

    // 答錯
    setWrongPicks((w) => [...w, choice]);
    setShakeKey((k) => k + 1);
    setCombo(0);
    if (tries >= MAX_TRIES) {
      setGained(0);
      setStatus("revealed");
    }
  };

  const next = () => {
    if (isLast) {
      onFinish(level, points, correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setWrongPicks([]);
    setStatus("answering");
    setGained(null);
  };

  const showHint = wrongPicks.length > 0 && status === "answering";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setConfirmExit(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium shadow-sm"
        >
          <Home size={16} /> 關卡地圖
        </button>
        <div className="flex items-center gap-3 text-sm">
          {combo >= 2 && (
            <span className="anim-pop rounded-full bg-sun px-2.5 py-1 font-bold">
              連對 {combo}
            </span>
          )}
          <span className="font-bold">{points} 分</span>
        </div>
      </div>

      {confirmExit && (
        <ConfirmBar
          text="要離開這一關嗎？目前的作答不會被保存。"
          okLabel="離開"
          onOk={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}

      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-black">
          第 {level.id} 關・{level.name}
        </h2>
        <span className="text-sm text-ink-soft">
          第 {index + 1} / {questions.length} 題
        </span>
      </div>
      <div
        className="mb-4 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={questions.length}
        aria-valuenow={index + (status === "answering" ? 0 : 1)}
      >
        <div
          className="h-full rounded-full bg-jade transition-all"
          style={{
            width: `${((index + (status === "answering" ? 0 : 1)) / questions.length) * 100}%`,
          }}
        />
      </div>

      <section
        key={shakeKey + "-" + index}
        className={`rounded-2xl bg-white p-5 shadow-[0_3px_0_rgba(27,42,65,0.18)] ${
          shakeKey > 0 && status === "answering" ? "anim-shake" : ""
        }`}
      >
        <p className="text-sm font-medium text-ink-soft">{level.kind}</p>
        <p className="mt-2 font-serif text-2xl font-black leading-relaxed text-ink">
          {q.prompt}
        </p>
      </section>

      <div
        className={`mt-4 grid gap-3 ${isShort ? "grid-cols-2" : "grid-cols-1"}`}
        role="group"
        aria-label="選項"
      >
        {options.map((opt) => {
          const isWrong = wrongPicks.includes(opt);
          const isAnswer = opt === q.answer;
          const done = status !== "answering";
          let cls = "bg-white hover:bg-sky-deep/60";
          let icon = null;
          if (isWrong) {
            cls = "bg-coral-pale text-ink/50 line-through";
            icon = <X size={20} className="text-coral" />;
          } else if (done && isAnswer) {
            cls = "bg-jade-pale ring-2 ring-jade text-ink";
            icon = <Check size={20} className="text-jade-deep" />;
          } else if (done) {
            cls = "bg-white/60 text-ink/40";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={done || isWrong}
              onClick={() => pick(opt)}
              className={`flex min-h-[60px] items-center justify-center gap-2 rounded-2xl px-4 py-3 text-lg font-bold shadow-[0_3px_0_rgba(27,42,65,0.15)] transition active:translate-y-[2px] active:shadow-none ${
                isShort ? "font-serif text-2xl" : "text-left leading-snug"
              } ${cls}`}
            >
              {icon}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {showHint && (
        <div
          role="status"
          className="anim-pop mt-4 flex gap-3 rounded-2xl bg-sun/30 p-4"
        >
          <Lightbulb className="mt-0.5 shrink-0 text-sun-deep" size={22} />
          <div>
            <p className="font-bold">再想一想，給你一個提示：</p>
            <p className="mt-1 leading-relaxed">{q.hint}</p>
          </div>
        </div>
      )}

      {status !== "answering" && (
        <div
          role="status"
          className={`anim-pop mt-4 rounded-2xl p-4 ${
            status === "correct" ? "bg-jade-pale" : "bg-coral-pale"
          }`}
        >
          <p className="font-bold">
            {status === "correct"
              ? `答對了！ +${gained} 分`
              : `這題的答案是「${q.answer}」`}
          </p>
          <p className="mt-1 leading-relaxed">{q.explain}</p>
          <button
            type="button"
            onClick={next}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-lg font-bold text-white active:translate-y-[1px]"
          >
            {isLast ? "看結果" : "下一題"} <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- 結果畫面 ---------- */
function ResultScreen({
  level,
  points,
  correct,
  nextLevel,
  nextUnlocked,
  onHome,
  onRetry,
  onNext,
}: {
  level: Level;
  points: number;
  correct: number;
  nextLevel?: Level;
  nextUnlocked: boolean;
  onHome: () => void;
  onRetry: () => void;
  onNext: (l: Level) => void;
}) {
  const stars = starsFor(points);
  const passed = stars >= 1;
  const msg =
    stars === 3
      ? "太厲害了！你是成語小達人！"
      : stars === 2
        ? "很不錯！再練習一次，就有機會拿滿星。"
        : stars === 1
          ? "過關了！再挑戰一次，看看能不能拿更多星。"
          : "還差一點點，再試一次吧！記得看提示。";

  return (
    <div className="text-center">
      <p className="text-sm font-medium text-ink-soft">
        第 {level.id} 關・{level.name}
      </p>
      <h2 className="mt-1 font-serif text-4xl font-black">
        {passed ? "闖關成功" : "再接再厲"}
      </h2>
      <div className="anim-pop mt-5 flex justify-center">
        <Stars count={stars} size={52} />
      </div>
      <p className="mt-4 text-lg font-bold">{msg}</p>

      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">得分</dt>
          <dd className="font-serif text-3xl font-black">{points}</dd>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <dt className="text-sm text-ink-soft">答對題數</dt>
          <dd className="font-serif text-3xl font-black">
            {correct} / {level.questions.length}
          </dd>
        </div>
      </dl>

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-3">
        {passed && nextLevel && nextUnlocked && (
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
          <RotateCcw size={20} /> 再挑戰一次
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
