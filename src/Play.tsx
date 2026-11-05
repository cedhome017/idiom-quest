import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Home, Lightbulb, X } from "lucide-react";
import type { Level, Question } from "./data";
import { ConfirmBar, card } from "./components";
import { COMBO_BONUS, MAX_TRIES, POINTS_FIRST, POINTS_SECOND, shuffle, type Mode } from "./lib";

type Status = "answering" | "correct" | "revealed";

export function PlayScreen({
  level,
  mode,
  runInfo,
  onExit,
  onFinish,
}: {
  level: Level;
  mode: Mode;
  runInfo?: { index: number; total: number };
  onExit: () => void;
  onFinish: (points: number, correct: number, seconds: number) => void;
}) {
  const questions = useMemo<Question[]>(() => shuffle(level.questions), [level]);
  const startRef = useRef(Date.now());
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
      onFinish(points, correctCount, (Date.now() - startRef.current) / 1000);
      return;
    }
    setIndex((i) => i + 1);
    setWrongPicks([]);
    setStatus("answering");
    setGained(null);
  };

  const showHint = wrongPicks.length > 0 && status === "answering";
  const done = index + (status === "answering" ? 0 : 1);

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
            <span className="anim-pop rounded-full bg-sun px-2.5 py-1 font-bold">連對 {combo}</span>
          )}
          <span className="font-bold">{points} 分</span>
        </div>
      </div>

      {confirmExit && (
        <ConfirmBar
          text={
            mode === "run"
              ? "要離開連續挑戰嗎？目前的作答不會被保存。"
              : "要離開這一關嗎？目前的作答不會被保存。"
          }
          okLabel="離開"
          onOk={onExit}
          onCancel={() => setConfirmExit(false)}
        />
      )}

      {runInfo && (
        <p className="mb-1 text-sm font-bold text-jade-deep">
          連續挑戰　第 {runInfo.index + 1} / {runInfo.total} 關
        </p>
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
        aria-valuenow={done}
      >
        <div
          className="h-full rounded-full bg-jade transition-all"
          style={{ width: `${(done / questions.length) * 100}%` }}
        />
      </div>

      <section
        key={shakeKey + "-" + index}
        className={`${card} p-5 ${shakeKey > 0 && status === "answering" ? "anim-shake" : ""}`}
      >
        <p className="text-sm font-medium text-ink-soft">{level.kind}</p>
        <p className="mt-2 font-serif text-2xl font-black leading-relaxed text-ink">{q.prompt}</p>
      </section>

      <div
        className={`mt-4 grid gap-3 ${isShort ? "grid-cols-2" : "grid-cols-1"}`}
        role="group"
        aria-label="選項"
      >
        {options.map((opt) => {
          const isWrong = wrongPicks.includes(opt);
          const isAnswer = opt === q.answer;
          const finished = status !== "answering";
          let cls = "bg-white hover:bg-sky-deep/60";
          let icon = null;
          if (isWrong) {
            cls = "bg-coral-pale text-ink/50 line-through";
            icon = <X size={20} className="text-coral" />;
          } else if (finished && isAnswer) {
            cls = "bg-jade-pale ring-2 ring-jade text-ink";
            icon = <Check size={20} className="text-jade-deep" />;
          } else if (finished) {
            cls = "bg-white/60 text-ink/40";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={finished || isWrong}
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
        <div role="status" className="anim-pop mt-4 flex gap-3 rounded-2xl bg-sun/30 p-4">
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
          className={`anim-pop mt-4 rounded-2xl p-4 ${status === "correct" ? "bg-jade-pale" : "bg-coral-pale"}`}
        >
          <p className="font-bold">
            {status === "correct" ? `答對了！ +${gained} 分` : `這題的答案是「${q.answer}」`}
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
