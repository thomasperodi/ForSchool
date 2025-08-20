import { NextRequest, NextResponse } from 'next/server';
import { fcm } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { token, title, body } = await req.json();

    if (!token || !title || !body) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

   const message = {
  token,
  notification: {
    title,
    body,
  },
  android: {
    priority: 'high' as const, // <-- cast letterale
  },
  apns: {
    headers: {
      'apns-priority': '10',
    },
  },
};




    const response = await fcm.send(message);

    return NextResponse.json({ success: true, response });
  } catch (error: unknown) {
    console.error(error);

    // Tipizza correttamente l'errore
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
