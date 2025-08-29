import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "web"; // "mobile" o "web"

  const res = NextResponse.json({ success: true, client: type });
  res.cookies.set("client", type, {
    httpOnly: false, // così lo puoi leggere anche dal client
    path: "/", 
    sameSite: "lax",
  });

  return res;
}
