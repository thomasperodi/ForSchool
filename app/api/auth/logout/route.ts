import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = NextResponse.json({ ok: true });

    // Cancella i cookie lato server
    res.cookies.delete("sb-access-token");
    res.cookies.delete("sb-refresh-token");
    res.cookies.delete("sk-auth");

    return res;
  } catch (err) {
    console.error("Errore logout:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
