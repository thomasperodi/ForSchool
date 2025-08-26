import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(request: Request) {
	try {
		const { access_token, refresh_token } = await request.json();
		if (!access_token || !refresh_token) {
			return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
		}

		const supabase = createRouteHandlerClient({ cookies });
		const { error } = await supabase.auth.setSession({ access_token, refresh_token });
		if (error) {
			return NextResponse.json({ error: error.message }, { status: 401 });
		}

		const res = NextResponse.json({ ok: true });
		res.cookies.set("sk-auth", "1", {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			maxAge: 60 * 60 * 24 * 30,
		});
		return res;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 500 });
	}
}


