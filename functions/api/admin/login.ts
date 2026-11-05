// POST /api/admin/login：用後台密碼換取 8 小時有效的權杖。
import { TOKEN_TTL_SECONDS, makeToken, passwordMatches, type AdminEnv } from "../../_lib/auth";
import { json } from "../../_lib/rules";

export const onRequestPost: PagesFunction<AdminEnv> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return json({ ok: false, error: "admin_disabled" }, 503);

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password.slice(0, 200);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  if (!(await passwordMatches(password, env.ADMIN_PASSWORD))) {
    // 錯誤時稍微延遲，拖慢連續猜密碼
    await new Promise((r) => setTimeout(r, 800));
    return json({ ok: false, error: "wrong_password" }, 401);
  }

  const token = await makeToken(env.ADMIN_PASSWORD);
  return json({ ok: true, token, expiresIn: TOKEN_TTL_SECONDS });
};
