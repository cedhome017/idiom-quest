// 共用規則與工具。計分數值需與 functions/_lib/rules.ts 一致。
export const POINTS_FIRST = 10; // 第一次就答對
export const POINTS_SECOND = 5; // 看過提示後第二次答對
export const COMBO_BONUS = 2; // 連續 3 題（含）以上第一次答對，每題加分
export const MAX_TRIES = 2;
export const MAX_LEVEL_POINTS = 56;

export type Mode = "level" | "run";

export function starsFor(points: number) {
  if (points >= 45) return 3;
  if (points >= 30) return 2;
  if (points >= 15) return 1;
  return 0;
}

export type LevelRecord = {
  levelId: number;
  levelName: string;
  points: number;
  stars: number;
  seconds: number;
  correct: number;
};

export type Result = {
  mode: Mode;
  /** 單關為 1~4，連續挑戰為 0 */
  levelId: number;
  title: string;
  points: number;
  seconds: number;
  stars: number;
  maxStars: number;
  /** 計時賽資格：單關 3 星 / 連續挑戰 4 關皆 3 星 */
  perfect: boolean;
  correct: number;
  total: number;
  records?: LevelRecord[];
};

/* ---------- 進度與暱稱（只存在這個瀏覽器；可能無法使用） ---------- */
export type Progress = Record<number, { stars: number; best: number }>;
const PROGRESS_KEY = "idiom-quest-progress-v1";
const NICK_KEY = "idiom-quest-nickname-v1";

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    return {};
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* 無法儲存時略過 */
  }
}
export function loadNick(): string {
  try {
    return localStorage.getItem(NICK_KEY) ?? "";
  } catch {
    return "";
  }
}
export function saveNick(n: string) {
  try {
    localStorage.setItem(NICK_KEY, n);
  } catch {
    /* 略過 */
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(sec: number): string {
  if (sec < 60) return `${sec.toFixed(1)} 秒`;
  let m = Math.floor(sec / 60);
  let s = Math.round(sec - m * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m} 分 ${s} 秒`;
}
