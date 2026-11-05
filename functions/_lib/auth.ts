// 老師後台驗證：密碼 + 簽章權杖（HMAC-SHA256）。密碼放在 Cloudflare 的 Secret：ADMIN_PASSWORD。
import { json } from "./rules";

export interface AdminEnv {
  ADMIN_PASSWORD?: string;
}

const enc = new TextEncoder();
export const TOKEN_TTL_SECONDS = 8 * 60 * 60;

function toB64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** 固定長度、不提早結束的比較，避免從回應時間猜出內容 */
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function passwordMatches(input: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([hmac(secret, "pw:" + input), hmac(secret, "pw:" + secret)]);
  return safeEqual(a, b);
}

export async function makeToken(secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const exp = String(nowSec + TOKEN_TTL_SECONDS);
  const sig = await hmac(secret, "v1." + exp);
  return `${exp}.${toB64url(sig)}`;
}

export async function tokenValid(token: string, secret: string, nowSec = Math.floor(Date.now() / 1000)): Promise<boolean> {
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) <= nowSec) return false;
  const expected = toB64url(await hmac(secret, "v1." + exp));
  return safeEqual(enc.encode(expected), enc.encode(sig));
}

/** 通過回傳 null；未通過回傳要直接送出的錯誤回應 */
export async function requireAdmin(request: Request, env: AdminEnv): Promise<Response | null> {
  if (!env.ADMIN_PASSWORD) return json({ ok: false, error: "admin_disabled" }, 503);
  const auth = request.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !(await tokenValid(token, env.ADMIN_PASSWORD))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  return null;
}
