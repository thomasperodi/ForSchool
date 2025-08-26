import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(request: NextRequest) {
	const response = NextResponse.next();
	
	// Debug: log all cookies
	console.log("[middleware] All cookies:", request.cookies.getAll());
	
	const supabase = createMiddlewareClient({ req: request, res: response });
	const {
		data: { session },
	} = await supabase.auth.getSession();

	const hasSkAuthCookie = request.cookies.get("sk-auth")?.value === "1";
	
	// Debug: log session and cookie status
	console.log("[middleware] Session present:", !!session);
	console.log("[middleware] sk-auth cookie present:", hasSkAuthCookie);
	console.log("[middleware] Path:", request.nextUrl.pathname);

	if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/login/") && (session || hasSkAuthCookie)) {
		const url = request.nextUrl.clone();
		url.pathname = "/home";
		console.log("[middleware] Redirecting to /home");
		return NextResponse.redirect(url);
	}

	return response;
}

export const config = {
	matcher: ["/login", "/login/"],
};


