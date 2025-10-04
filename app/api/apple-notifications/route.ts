import { NextRequest, NextResponse } from "next/server";
import {supabase} from "@/lib/supabaseClient"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("Apple Notification Received:", body);

    const { notificationType, data } = body;

    switch (notificationType) {
      case "REVOKE":
        // Utente ha revocato l'accesso: disabilitiamo account o flag
        if (data.userId) {
          await supabase
            .from("utenti")
            .update({ notifiche: false })
            .eq("id", data.userId);
          console.log(`User revoked access: ${data.userId}`);
        }
        break;

      case "DELETE_ACCOUNT":
        // Utente ha cancellato account: cancelliamo record
        if (data.userId) {
          await supabase
            .from("utenti")
            .delete()
            .eq("id", data.userId);
          console.log(`User deleted account: ${data.userId}`);
        }
        break;

      case "EMAIL_CHANGE":
        // Utente ha cambiato email (Apple relay email)
        if (data.userId && data.newEmail) {
          await supabase
            .from("utenti")
            .update({ email: data.newEmail })
            .eq("id", data.userId);
          console.log(`User changed email: ${data.userId} → ${data.newEmail}`);
        }
        break;

      default:
        console.warn("Unknown notification type:", notificationType);
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("Failed to process Apple notification:", err);
    return NextResponse.json(
      { status: "error", message: (err as Error).message },
      { status: 400 }
    );
  }
}
