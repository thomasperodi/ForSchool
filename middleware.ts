
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("sb-pjeptyhgwaevnlgpovzb-auth-token")?.value;
  const hasSkAuthCookie = request.cookies.get("sk-auth")?.value === "1";

  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  // READ THE CUSTOM HEADER SENT FROM CAPACITOR APP
const ua = request.headers.get("user-agent")?.toLowerCase() || "";
const isAndroid = ua.includes("android");
const isIos = ua.includes("iphone") || ua.includes("ipad");
const isWebView = ua.includes("wv") || ua.includes("crios") || ua.includes("fxios"); // WebView indicator

const isNativeApp = (isAndroid || isIos) && isWebView;

  const isAuthenticated = !!accessToken || hasSkAuthCookie;

  // Debug: Log key information at the start of the middleware
  console.log(`[Middleware] Requesting path: ${pathname}`);
  console.log(`[Middleware] Detected Platform (from header): ${ua || 'web (no custom header)'}`);
  console.log(`[Middleware] User authenticated: ${isAuthenticated}`);

  // -------- MOBILE-SPECIFIC ROOT "/" REDIRECT --------
  // If it's a native mobile platform (detected by custom header) and the user is trying to access the root "/",
  // we redirect them to "/login".
  console.log("is native:", isNativeApp)
  if (isNativeApp && pathname === "/") {
    console.log("[Middleware] Mobile: Redirecting root path '/' to '/login'");
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  

  // -------- WEB & GENERIC ROOT "/" HANDLING --------
  // This block now runs for web, or on mobile if the path is not "/".
  // On mobile, the above `if` block already redirected the user from "/" to "/login".
//   if (pathname === "/") {
//     if (isAuthenticated) {
//       console.log("[Middleware] Web: Authenticated user on '/' - Redirecting to '/home'");
//       url.pathname = "/home";
//       return NextResponse.redirect(url);
//     } else {
//       console.log("[Middleware] Web: Unauthenticated user on '/' - Redirecting to '/login'");
//       url.pathname = "/login";
//       return NextResponse.redirect(url);
//     }
//   }

  // -------- LOGIN HANDLING (APPLIES TO BOTH WEB AND MOBILE) --------
  if (pathname === "/login" || pathname === "/login/") {
    if (isAuthenticated) {
      console.log("[Middleware] Authenticated user on '/login' - Redirecting to '/home'");
      url.pathname = "/home";
      return NextResponse.redirect(url);
    } else {
      console.log("[Middleware] User on '/login' is unauthenticated, proceeding.");
    }
  }

  console.log("[Middleware] No redirect needed. Proceeding to next page.");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/login/"],
};
