import { useEffect, useRef, useState } from "react";
import { LEVELS, type Level } from "./data";
import type { Scope } from "./api";
import { PlayScreen } from "./Play";
import { HomeScreen } from "./Home";
import { BetweenScreen, ResultScreen, type Ranks } from "./Result";
import { BoardScreen } from "./Board";
import { AdminScreen } from "./Admin";
import {
  loadProgress,
  saveProgress,
  starsFor,
  type LevelRecord,
  type Mode,
  type Progress,
  type Result,
} from "./lib";

type Screen =
  | { name: "home" }
  | { name: "play"; level: Level; mode: Mode; run: number }
  | { name: "between"; record: LevelRecord; next: Level }
  | { name: "result"; result: Result; retry: () => void; level?: Level }
  | { name: "board"; scope: Scope; back: Screen }
  | { name: "admin" };

const isTeacherPath = () => /^\/teacher\/?$/.test(window.location.pathname);

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    isTeacherPath() ? { name: "admin" } : { name: "home" }
  );
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const runCounter = useRef(0);
  const runRecords = useRef<LevelRecord[]>([]);
  // 已上傳過的成績（以結果物件為鍵），返回結果頁時不會再顯示上傳表單
  const submittedRanks = useRef(new WeakMap<Result, Ranks>());
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  // 瀏覽器上一頁／下一頁時，依網址切換後台或首頁
  useEffect(() => {
    const onPop = () =>
      setScreen((cur) => (isTeacherPath() ? { name: "admin" } : cur.name === "admin" ? { name: "home" } : cur));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const isUnlocked = (id: number) => id === 1 || (progress[id - 1]?.stars ?? 0) >= 1;

  const updateProgress = (levelId: number, points: number) => {
    const prev = progressRef.current[levelId];
    const next: Progress = {
      ...progressRef.current,
      [levelId]: {
        stars: Math.max(prev?.stars ?? 0, starsFor(points)),
        best: Math.max(prev?.best ?? 0, points),
      },
    };
    progressRef.current = next;
    setProgress(next);
    saveProgress(next);
  };

  const startLevel = (level: Level) =>
    setScreen({ name: "play", level, mode: "level", run: ++runCounter.current });

  const startRun = () => {
    runRecords.current = [];
    setScreen({ name: "play", level: LEVELS[0], mode: "run", run: ++runCounter.current });
  };

  const finishLevel = (level: Level, points: number, correct: number, seconds: number) => {
    updateProgress(level.id, points);
    const stars = starsFor(points);

    const result: Result = {
      mode: "level",
      levelId: level.id,
      title: `第 ${level.id} 關・${level.name}`,
      points,
      seconds,
      stars,
      maxStars: 3,
      perfect: stars === 3,
      correct,
      total: level.questions.length,
    };
    setScreen({ name: "result", result, level, retry: () => startLevel(level) });
  };

  const finishRunLevel = (level: Level, points: number, correct: number, seconds: number) => {
    updateProgress(level.id, points);
    const record: LevelRecord = {
      levelId: level.id,
      levelName: level.name,
      points,
      stars: starsFor(points),
      seconds,
      correct,
    };
    runRecords.current = [...runRecords.current, record];
    const done = runRecords.current.length;

    if (done < LEVELS.length) {
      setScreen({ name: "between", record, next: LEVELS[done] });
      return;
    }

    const records = runRecords.current;
    const result: Result = {
      mode: "run",
      levelId: 0,
      title: "連續挑戰",
      points: records.reduce((s, r) => s + r.points, 0),
      seconds: records.reduce((s, r) => s + r.seconds, 0),
      stars: records.reduce((s, r) => s + r.stars, 0),
      maxStars: LEVELS.length * 3,
      perfect: records.every((r) => r.stars === 3),
      correct: records.reduce((s, r) => s + r.correct, 0),
      total: LEVELS.reduce((s, l) => s + l.questions.length, 0),
      records,
    };
    setScreen({ name: "result", result, retry: startRun });
  };

  const goBoard = (scope: Scope, back: Screen) => setScreen({ name: "board", scope, back });

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-xl px-4 pb-10 pt-5 sm:pt-8">
        {screen.name === "home" && (
          <HomeScreen
            progress={progress}
            isUnlocked={isUnlocked}
            onStart={startLevel}
            onRun={startRun}
            onBoard={() => goBoard("run", screen)}
            onReset={() => {
              progressRef.current = {};
              setProgress({});
              saveProgress({});
            }}
          />
        )}

        {screen.name === "play" && (
          <PlayScreen
            key={screen.run}
            level={screen.level}
            mode={screen.mode}
            runInfo={
              screen.mode === "run"
                ? { index: runRecords.current.length, total: LEVELS.length }
                : undefined
            }
            onExit={() => setScreen({ name: "home" })}
            onFinish={(points, correct, seconds) =>
              screen.mode === "run"
                ? finishRunLevel(screen.level, points, correct, seconds)
                : finishLevel(screen.level, points, correct, seconds)
            }
          />
        )}

        {screen.name === "between" && (
          <BetweenScreen
            record={screen.record}
            next={screen.next}
            onNext={() =>
              setScreen({ name: "play", level: screen.next, mode: "run", run: ++runCounter.current })
            }
          />
        )}

        {screen.name === "result" && (
          <ResultScreen
            result={screen.result}
            nextLevel={
              screen.result.mode === "level"
                ? LEVELS.find((l) => l.id === screen.result.levelId + 1)
                : undefined
            }
            nextUnlocked={screen.result.mode === "level" && isUnlocked(screen.result.levelId + 1)}
            onHome={() => setScreen({ name: "home" })}
            submitted={submittedRanks.current.get(screen.result)}
            onSubmitted={(r) => submittedRanks.current.set(screen.result, r)}
            onRetry={screen.retry}
            onNext={startLevel}
            onBoard={() =>
              goBoard(
                screen.result.mode === "run" ? "run" : (String(screen.result.levelId) as Scope),
                screen
              )
            }
          />
        )}

        {screen.name === "admin" && (
          <AdminScreen
            onExit={() => {
              try {
                window.history.pushState(null, "", "/");
              } catch {
                /* 忽略 */
              }
              setScreen({ name: "home" });
            }}
          />
        )}

        {screen.name === "board" && (
          <BoardScreen initialScope={screen.scope} onBack={() => setScreen(screen.back)} />
        )}
      </div>
    </div>
  );
}
