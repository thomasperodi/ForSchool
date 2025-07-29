import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { user_id, email } = await req.json();
    if (!user_id || !email) {
      return NextResponse.json({ error: 'user_id ed email sono obbligatori' }, { status: 400 });
    }

    // 1. Crea account Stripe Express
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });

    // 2. Aggiorna la tabella utenti con stripe_account_id
    const { error: updateError } = await supabase
      .from('utenti')
      .update({ stripe_account_id: account.id })
      .eq('id', user_id);

    if (updateError) {
      console.error('Errore aggiornamento stripe_account_id:', updateError);
      return NextResponse.json(
        { error: 'Errore aggiornamento stripe_account_id nel database' },
        { status: 500 }
      );
    }

    // 3. Crea link onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url:
        `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || 'http://localhost:3000'}/onboarding-refresh`,
      return_url:
        `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin || 'http://localhost:3000'}/onboarding-success`,
      type: 'account_onboarding',
    });

    // 4. Restituisci id e url onboarding
    return NextResponse.json({ accountId: account.id, onboardingUrl: accountLink.url });
  } catch (err) {
    console.error('Errore creazione account Stripe Express:', err);
    return NextResponse.json({ error: 'Errore creazione account Stripe' }, { status: 500 });
  }
}