import bcrypt from "bcryptjs";
import { createAdminSession } from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password ?? "";
    const hash = process.env.ADMIN_PASSWORD_HASH;

    if (!hash) {
      return Response.json({ error: "ADMIN_PASSWORD_HASH is not configured." }, { status: 500 });
    }

    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return Response.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    await createAdminSession();
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
