import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// Inizializza Firebase con Service Account JSON
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return NextResponse.json({ error: 'title e body sono obbligatori' }, { status: 400 });
    }

    // Recupera tutti i token
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const tokens = data?.map(t => t.token) ?? [];
    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Nessun token registrato' }, { status: 404 });
    }

    // Prepara il messaggio
    const message = {
      notification: { title, body },
      android: { priority: 'high' as const },
      apns: { headers: { 'apns-priority': '10' } },
      tokens, // invia a tutti i token
    };

    // Invia le notifiche in batch
    const response = await admin.messaging().sendEachForMulticast(message);


    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failure: response.failureCount,
      responses: response.responses,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
