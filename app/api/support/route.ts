// app/api/support/route.ts
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail'; // se non hai alias: '../../lib/mail'

// (se questa route fosse Edge, forziamo Node.js)
export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { name, email, subject, message } = await req.json();

    const html = `
      <h2>Richiesta di supporto</h2>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Oggetto:</strong> ${subject}</p>
      <p><strong>Messaggio:</strong></p>
      <p>${message}</p>
    `;

// app/api/support/route.ts (ORIGINALE)
// ...
    const msgId = await sendEmail(
      'skoollyapp@gmail.com',
      `📩 Nuova richiesta di supporto: ${subject}`,
      html
    );

    console.log('Email inviata a skoollyapp@gmail.com, messageId:', msgId ?? '(n/d)');
    return NextResponse.json({ ok: true });
// ...

    console.log('Email inviata a skoollyapp@gmail.com, messageId:', msgId ?? '(n/d)');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Errore invio email (Brevo):', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
