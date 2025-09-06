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

  // 📱 Mobile su "/" → redirect a /login
  if (req.nextUrl.pathname === "/" && type === "mobile") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 💻 Web su "/" → redirect a /web-home


  // 🔐 Autenticato → se va su /login redirect a /home
  if (req.nextUrl.pathname === "/login" && isAuth ) {
    return NextResponse.redirect(new URL("/home", req.url));
  }

  // 🔒 Non autenticato → se prova ad accedere a /home redirect a /login
  if (req.nextUrl.pathname.startsWith("/home") && !isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/home/:path*"], // routes su cui applicare il middleware
};
