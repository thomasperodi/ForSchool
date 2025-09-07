import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production", // ✅ solo in https in prod
      maxAge: 60 * 60 * 24 * 30, // 30 giorni
    };

    // ✅ Cookie richiesti da Supabase
    res.cookies.set("sb-access-token", access_token, cookieOptions);
    res.cookies.set("sb-refresh-token", refresh_token, cookieOptions);

    // ✅ Cookie custom della tua app
    res.cookies.set("sk-auth", "1", cookieOptions);

    return res;
  } catch (err) {
    console.error("Errore set-session:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
