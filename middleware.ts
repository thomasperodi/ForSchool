import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Legge il tipo di client dal cookie impostato precedentemente
  const clientType = req.cookies.get("client")?.value;

  // fallback se il cookie non esiste ancora (User-Agent)
  let type = clientType;
  if (!type) {
    const ua = req.headers.get("user-agent") || "";
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    type = isMobile ? "mobile" : "web";
  }

  // check autenticazione tramite cookie sk-auth
  const isAuth = !!req.cookies.get("sk-auth");
  
  // Debug logging
  console.log(`🔍 Middleware: ${req.nextUrl.pathname}, type: ${type}, isAuth: ${isAuth}`);

  // 📱 Mobile su "/" → redirect a /login
  if (req.nextUrl.pathname === "/" && type === "mobile") {
    console.log("📱 Middleware: Redirect / → /login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 💻 Web su "/" → redirect a /web-home


  // 🔐 Autenticato → se va su /login redirect a /home
  // MA solo se non è un dispositivo mobile (per evitare loop)
  if (req.nextUrl.pathname === "/login" && isAuth && type !== "mobile") {
    console.log("🔐 Middleware: Redirect /login → /home (autenticato, web)");
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // 🔒 Non autenticato → se prova ad accedere a /home redirect a /login
  // if (req.nextUrl.pathname.startsWith("/home") && !isAuth) {
  //   console.log("🔒 Middleware: Redirect /home → /login (non autenticato)");
  //   return NextResponse.redirect(new URL("/login", req.url));
  // }

  console.log("✅ Middleware: Allow request");
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/home/:path*"], // routes su cui applicare il middleware
};





// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// function detectClientType(req: NextRequest) {
//   const fromCookie = req.cookies.get("client")?.value;
//   if (fromCookie) return fromCookie;

//   const ua = req.headers.get("user-agent") || "";
//   return /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "web";
// }

// function isAuthenticated(req: NextRequest) {
//   // compatibile con il tuo setup
//   const hasAccess = !!req.cookies.get("sb-access-token")?.value;
//   const hasRefresh = !!req.cookies.get("sb-refresh-token")?.value;
//   const hasCustom = !!req.cookies.get("sk-auth")?.value;
//   return hasAccess || hasRefresh || hasCustom;
// }

// export function middleware(req: NextRequest) {
//   const path = req.nextUrl.pathname;
//   const type = detectClientType(req);
//   const isAuth = isAuthenticated(req);

//   console.log(`🔍 Middleware: ${path}, type: ${type}, isAuth: ${isAuth}`);

//   // "/" → redirect condizionato
//   if (path === "/") {
//     if (type === "mobile") {
//       console.log("📱 Redirect / → /login");
//       return NextResponse.redirect(new URL("/login", req.url));
//     }
//     console.log("💻 Redirect / → /home");
//     return NextResponse.redirect(new URL("/home", req.url));
//   }

//   // Se autenticato e prova ad aprire /login → vai su /home
//   if (path === "/login" && isAuth && type === "web") {
//     console.log("🔐 Redirect /login → /home (autenticato)");
//     return NextResponse.redirect(new URL("/home", req.url));
//   }

//   // Se non autenticato e tenta di accedere a /home → vai su /login
//   if (path.startsWith("/home") && !isAuth) {
//     console.log("🔒 Redirect /home → /login (non autenticato)");
//     return NextResponse.redirect(new URL("/login", req.url));
//   }

//   console.log("✅ Allow request");
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/", "/login", "/home/:path*"],
// };
