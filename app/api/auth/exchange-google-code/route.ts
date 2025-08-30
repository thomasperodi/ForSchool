import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

    const params = new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!, // web client ID
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: '', // essenziale per app mobile
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokens = await response.json();

    if (tokens.error) {
      console.error('Google token error:', tokens.error);
      return NextResponse.json({ error: tokens.error }, { status: 500 });
    }

    if (!tokens.id_token) {
      console.error('id_token non ricevuto da Google:', tokens);
      return NextResponse.json({ error: 'id_token non ricevuto' }, { status: 500 });
    }

    // id_token ricevuto correttamente
    return NextResponse.json(tokens);
  } catch (err) {
    console.error('Exchange code failed:', err);
    return NextResponse.json({ error: 'Token exchange failed' }, { status: 500 });
  }
}
