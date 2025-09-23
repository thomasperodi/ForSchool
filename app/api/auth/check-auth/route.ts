import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const isAuth = !!req.cookies.get("sk-auth");
    const clientType = req.cookies.get("client")?.value;
    
    return NextResponse.json({ 
      isAuth, 
      clientType,
      cookies: {
        skAuth: !!req.cookies.get("sk-auth"),
        sbAccessToken: !!req.cookies.get("sb-access-token"),
        sbRefreshToken: !!req.cookies.get("sb-refresh-token"),
        client: req.cookies.get("client")?.value
      }
    });
  } catch (err) {
    console.error("Errore check-auth:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
