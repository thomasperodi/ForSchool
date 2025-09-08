import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import { google, androidpublisher_v3 } from "googleapis";

// Definiamo i tipi specifici per le risposte delle API esterne
interface IosInAppReceipt {
  product_id: string;
  transaction_id: string;
  // Aggiungi altri campi se necessari
}

// Tipo per la ricevuta validata, che può essere una delle due strutture
type ValidatedReceiptData = IosInAppReceipt | androidpublisher_v3.Schema$SubscriptionPurchase;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Inizializza il client di Google APIs in modo corretto
const androidPublisher = google.androidpublisher({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  }),
});

export async function POST(req: NextRequest) {
  try {
    const { userId, productId, platform, receiptData, transactionId } = await req.json();

    if (!userId || !productId || !platform || !receiptData || !transactionId) {
      return NextResponse.json({ error: "Dati mancanti per la validazione." }, { status: 400 });
    }

    let isReceiptValid = false;
    let validatedReceiptData: ValidatedReceiptData | null = null;

    if (platform === "ios") {
      const url = process.env.NODE_ENV === "production" ?
        "https://buy.itunes.apple.com/verifyReceipt" :
        "https://sandbox.itunes.apple.com/verifyReceipt";

      const { data } = await axios.post<{
        status: number;
        receipt: { in_app: IosInAppReceipt[] };
      }>(url, {
        "receipt-data": receiptData,
        password: process.env.APPLE_SHARED_SECRET,
      });

      if (data.status === 0 && data.receipt?.in_app) {
        const sub = data.receipt.in_app.find(item => item.product_id === productId);
        if (sub) {
          isReceiptValid = true;
          validatedReceiptData = sub;
        }
      }
    } else if (platform === "android") {
      const { packageName, purchaseToken } = receiptData;
      
      const res = await androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken,
      });

      if (res.status === 200 && res.data.purchaseType === 0) {
        isReceiptValid = true;
        validatedReceiptData = res.data;
      }
    } else {
      return NextResponse.json({ error: "Piattaforma non valida." }, { status: 400 });
    }

    if (!isReceiptValid || !validatedReceiptData) {
      return NextResponse.json({ error: "La ricevuta non è valida." }, { status: 400 });
    }

    const { data: existingSubscription, error: fetchError } = await supabase
      .from('abbonamenti')
      .select('*')
      .eq('store_transaction_id', transactionId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error("Database fetch error:", fetchError);
      throw fetchError;
    }

    if (existingSubscription) {
      await supabase
        .from('abbonamenti')
        .update({
          stato: 'active',
          updated_at: new Date().toISOString(),
          store_receipt_data: validatedReceiptData,
        })
        .eq('id', existingSubscription.id);
    } else {
      const pianoId = "your_plan_id_here";
      
      await supabase
        .from('abbonamenti')
        .insert({
          utente_id: userId,
          piano_id: pianoId,
          stato: 'active',
          store_platform: platform,
          store_transaction_id: transactionId,
          store_receipt_data: validatedReceiptData,
          data_inizio: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true, message: "Abbonamento attivato con successo." });
    
  } catch (error) {
    console.error("Errore di convalida:", error);
    return NextResponse.json({ error: "Errore interno del server." }, { status: 500 });
  }
}