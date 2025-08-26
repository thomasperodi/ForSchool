import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabase } from "@/lib/supabaseClient";
import { sendEmail } from '@/lib/mail';
import { generateInvoicePDF } from '@/lib/invoice';

// Inizializza Stripe con la versione API più recente
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-06-30.basil" });

// Disabilita ISR per le API
export const revalidate = 0;

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  // 1. Verifica la firma della webhook per sicurezza
  try {
    const buf = await req.arrayBuffer();
    const sig = req.headers.get("stripe-signature")!;
    if (!sig) {
      console.error("Manca la firma Stripe.");
      return NextResponse.json({ error: "Firma mancante" }, { status: 400 });
    }
    // Stripe si aspetta un Buffer, non un ArrayBuffer
    const bufNode = Buffer.from(buf);
    event = stripe.webhooks.constructEvent(bufNode, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`❌ Errore nella verifica della firma webhook: ${errorMsg}`);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  // Logga il tipo di evento ricevuto per debug
  console.log(`✅ Evento Stripe ricevuto: ${event.type}`);

  // 2. Gestione degli eventi Stripe
  try {
    switch (event.type) {
      // ✅ Evento principale per pagamenti e abbonamenti iniziali
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`➡️ Gestione checkout.session.completed per sessione ID: ${session.id}`);

        // A. Gestione acquisto merchandising/biglietti (modalità 'payment')
        if (session.mode === "payment") {
          const { userId, items, evento_id, biglietti_id, tipo_acquisto } = session.metadata || {};
          console.log("session metadata:", session.metadata);
          console.log("session" , session);

          switch (tipo_acquisto) {
        case "biglietti":
          console.log(`   - Modalità: PAGAMENTO (biglietti) per utente ID: ${userId}`);

          // Aggiunto controllo per biglietti_id
          if (!userId || !biglietti_id) {
            console.warn(`   - Dati metadata (userId o biglietti_id) mancanti per la sessione ${session.id}. Skippo.`);
            break;
          }

          // Modificato: Parsifica correttamente biglietti_id
          const parsedBigliettiIds = JSON.parse(biglietti_id);
          const bigliettiAggiornati = [];
let applicationFeeAmount: number | null = null;

if (session.payment_intent) {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    session.payment_intent as string
  );
  applicationFeeAmount = paymentIntent.application_fee_amount
    ? paymentIntent.application_fee_amount / 100
    : null;
}
          for (const bigliettoId of parsedBigliettiIds) {
            // Recupera il biglietto
            const { data: biglietto, error: errBiglietto } = await supabase
              .from("biglietti")
              .select("*")
              .eq("id", bigliettoId)
              .single();

            if (errBiglietto || !biglietto) {
              console.error(`   - 🚫 Biglietto ID ${bigliettoId} non trovato:`, errBiglietto);
              continue;
            }
            const prezzoPagato = ((session.amount_total || 0)/100) - (applicationFeeAmount || 0); // in euro
            

            const PrezzoPerBiglietto = prezzoPagato / parsedBigliettiIds.length;
            // Aggiorna lo stato del biglietto come "pagato" e salva l'importo
            const { error: errUpdate } = await supabase
              .from("biglietti")
              .update({
                stato_pagamento: "pagato",
                prezzo_pagato: PrezzoPerBiglietto // in euro
              })
              .eq("id", bigliettoId);

            if (errUpdate) {
              console.error(`   - 🚫 Errore aggiornamento biglietto ID ${bigliettoId}:`, errUpdate);
              continue;
            }

            bigliettiAggiornati.push(bigliettoId);

            
          }
          let paymentMethod = 'altro'; // Metodo di pagamento di default
          // Tenta di mappare il primo metodo di pagamento della sessione
          if (session.payment_method_types && session.payment_method_types.length > 0) {
            const primaryMethod = session.payment_method_types[0];
            if (primaryMethod === 'card') {
              paymentMethod = 'carta';
            } else if (primaryMethod === 'paypal') {
              paymentMethod = 'paypal';
            }
            // Puoi aggiungere altri mapping se necessario (es. 'klarna' a 'altro' o un nuovo valore nello schema)
          }

          const paymentAmount = (session.amount_total || 0) / 100; // Converte da centesimi a valuta
          // Recupera l'application fee se presente, altrimenti null
          

          const paymentIntentId = session.payment_intent;

          const { error: errPaymentInsert } = await supabase
            .from("pagamenti")
            .insert({
              utente_id: userId,
              importo: paymentAmount ,
              metodo: paymentMethod,
              tipo_acquisto: 'biglietto', // Usa 'biglietto' (singolare) per corrispondere allo schema DB
              riferimento_id: evento_id, // ID dell'evento legato all'acquisto del biglietto
              stato: 'pagato',
              stripe_payment_intent_id: paymentIntentId,
              stripe_checkout_session_id: session.id,
              stripe_application_fee_amount: applicationFeeAmount,
              // Puoi popolare altri campi come commissione, stripe_dest_account, ecc.
              // se i dati sono disponibili nella sessione di Stripe e pertinenti per il tuo caso d'uso.
              // Altrimenti, verranno usati i default del database o rimarranno null.
            });

          if (errPaymentInsert) {
            console.error(`   - 🚫 Errore nell'inserimento del pagamento per sessione ID ${session.id}:`, errPaymentInsert);
          } else {
            console.log(`   - ✅ Pagamento registrato nella tabella 'pagamenti' per sessione ID: ${session.id}`);
          }
          console.log(`   - ✅ Biglietti aggiornati:`, bigliettiAggiornati);
          break;

            case "merch":
              console.log(`   - Modalità: PAGAMENTO (merchandising/biglietti) per utente ID: ${userId}`);
          
          if (!userId || !items) {
            console.warn(`   - Dati metadata mancanti per la sessione ${session.id}. Skippo.`);
            break;
          }

          const parsedItems: { priceId: string; quantity: number; varianteId?: string }[] = JSON.parse(items);
          const ordiniInseriti: number[] = [];

          // Cicla su ogni prodotto acquistato e crea un ordine in Supabase
          for (const item of parsedItems) {
            const { data: prodottoData, error: errProdotto } = await supabase
              .from("prodotti_merch")
              .select("id")
              .eq("stripe_price_id", item.priceId)
              .single();

            if (errProdotto) {
              console.error(`   - 🚫 Errore ricerca prodotto per price ID ${item.priceId}:`, errProdotto);
              continue;
            }

            const { data: ordineData, error: errOrdine } = await supabase
              .from("ordini_merch")
              .insert({
                utente_id: userId,
                prodotto_id: prodottoData.id,
                quantita: item.quantity,
                variante_id: item.varianteId || null,
              })
              .select("id")
              .single();

            if (errOrdine) {
              console.error(`   - 🚫 Errore inserimento ordine per utente ${userId}:`, errOrdine);
              continue;
            }
            ordiniInseriti.push(ordineData.id);
          }

          // Inserisci un singolo record nella tabella 'pagamenti' per l'intera transazione
          const { error: errPagamentoMerch } = await supabase.from("pagamenti").insert({
            utente_id: userId,
            importo: (session.amount_total || 0) / 100,
            metodo: "carta",
            tipo_acquisto: "merch",
            riferimento_id: ordiniInseriti.length > 0 ? ordiniInseriti[0] : null, // Collega al primo ordine inserito
            stripe_checkout_session_id: session.id,
            stato: "pagato",
          });

          if (errPagamentoMerch) {
            console.error(`   - 🚫 Errore inserimento pagamento per sessione ${session.id}:`, errPagamentoMerch);
          }

          console.log(`   - ✅ Acquisto merchandising completato. Ordini inseriti:`, ordiniInseriti);
              break;

            default:
              console.warn(`   - Modalità sconosciuta: ${tipo_acquisto}. Skippo.`);
              return NextResponse.json({ error: "Modalità sconosciuta" }, { status: 400 });
          }
          const pdfBuffer = await generateInvoicePDF({
            id: session.id,
            customer_name: session.customer_details?.name ?? 'Cliente',
            total: (session.amount_total || 0) / 100,
            address: session.customer_details?.address?.line1 ?? undefined,
          });
        
          // 2️⃣ Invia email con allegato PDF
          await sendEmail(
            session.customer_details!.email!,
            'La tua fattura Skoolly',
            '<p>Grazie per il tuo acquisto! In allegato trovi la fattura.</p>',
            [
              {
                content: pdfBuffer.toString('base64'),
                filename: `fattura_${session.id}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment',
              },
            ]
          );
          console.log('Invio fattura a:', session.customer_details?.email);
          console.log('Dimensione PDF:', pdfBuffer.length);
        }

        
        // B. Per gli abbonamenti, l'evento più affidabile è 'customer.subscription.created'.
        //    Non facciamo nulla qui per evitare record duplicati.
        else if (session.mode === "subscription") {
          console.log(`   - Modalità: ABBONAMENTO. Evento "customer.subscription.created" gestirà l'inserimento nel DB. Skippo per evitare duplicati.`);
        }
        break;
      }
      case "payment_intent.succeeded": {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`➡️ Gestione payment_intent.succeeded per PaymentIntent ID: ${paymentIntent.id}`);

    console.log("paymentIntent:", paymentIntent);

    // Recupera i metadata se li hai passati dal mobile
    const { userId, tipo_acquisto, items, biglietti_id, evento_id } = paymentIntent.metadata || {};
    console.log("paymentIntent metadata:", paymentIntent.metadata);

    // Mappatura importo e metodo
    const paymentAmount = (paymentIntent.amount || 0) / 100; // da centesimi a euro
    let paymentMethod = "altro";
    if (paymentIntent.payment_method_types && paymentIntent.payment_method_types.length > 0) {
      const method = paymentIntent.payment_method_types[0];
      if (method === "card") paymentMethod = "carta";
      else if (method === "paypal") paymentMethod = "paypal";
    }

    switch (tipo_acquisto) {
      case "biglietti":
        if (!userId || !biglietti_id) {
          console.warn(`   - Metadata mancanti per PaymentIntent ${paymentIntent.id}. Skippo.`);
          break;
        }

        const parsedBigliettiIds = JSON.parse(biglietti_id);
        const bigliettiAggiornati: number[] = [];

        for (const bigliettoId of parsedBigliettiIds) {
          const { data: biglietto, error: errBiglietto } = await supabase
            .from("biglietti")
            .select("*")
            .eq("id", bigliettoId)
            .single();

          if (errBiglietto || !biglietto) continue;

          


          const feeAmount = (paymentIntent.application_fee_amount ?? 0) / 100;
const PrezzoPerBiglietto = (paymentAmount - feeAmount) / parsedBigliettiIds.length;

          console.log(`   - Aggiornamento biglietto ID ${bigliettoId} con prezzo pagato: ${PrezzoPerBiglietto}€`);
          await supabase
            .from("biglietti")
            .update({ stato_pagamento: "pagato", prezzo_pagato: PrezzoPerBiglietto })
            .eq("id", bigliettoId);

          bigliettiAggiornati.push(bigliettoId);
        }

        await supabase.from("pagamenti").insert({
          utente_id: userId,
          importo: paymentAmount,
          metodo: paymentMethod,
          tipo_acquisto: "biglietto",
          riferimento_id: evento_id,
          stato: "pagato",
          stripe_payment_intent_id: paymentIntent.id,
        });

        console.log(`   - ✅ Biglietti aggiornati:`, bigliettiAggiornati);
        break;

      case "merch":
        if (!userId || !items) break;
        const parsedItems: { priceId: string; quantity: number; varianteId?: string }[] = JSON.parse(items);
        const ordiniInseriti: number[] = [];

        for (const item of parsedItems) {
          const { data: prodottoData, error: errProdotto } = await supabase
            .from("prodotti_merch")
            .select("id")
            .eq("stripe_price_id", item.priceId)
            .single();
          if (!prodottoData) continue;

          const { data: ordineData } = await supabase
            .from("ordini_merch")
            .insert({
              utente_id: userId,
              prodotto_id: prodottoData.id,
              quantita: item.quantity,
              variante_id: item.varianteId || null,
            })
            .select("id")
            .single();

          if (ordineData) ordiniInseriti.push(ordineData.id);
        }

        await supabase.from("pagamenti").insert({
          utente_id: userId,
          importo: paymentAmount,
          metodo: paymentMethod,
          tipo_acquisto: "merch",
          riferimento_id: ordiniInseriti[0] || null,
          stripe_payment_intent_id: paymentIntent.id,
          stato: "pagato",
        });

        console.log(`   - ✅ Acquisto merchandising completato. Ordini inseriti:`, ordiniInseriti);
        break;

      default:
        console.warn(`   - Modalità sconosciuta: ${tipo_acquisto}. Skippo.`);
        break;
    }
    break;
  }
      // ✅ Evento per la creazione iniziale di un abbonamento o per i rinnovi
      case "customer.subscription.created": {
        
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Sub:", subscription)
        const userId = subscription.metadata?.userId;
        console.log(`➡️ Gestione customer.subscription.created per abbonamento ID: ${subscription.id}`);

        if (!userId) {
          console.warn(`   - ID utente non trovato nei metadata dell'abbonamento ${subscription.id}. Skippo.`);
          break;
        }

        const subscriptionItem = subscription.items.data[0];
        console.log("item sub", subscriptionItem)
        const priceId = subscriptionItem?.price.id;

        // Trova il piano di abbonamento nel tuo DB
        const { data: piano, error: errPiano } = await supabase
          .from("piani_abbonamento")
          .select("id")
          .eq("stripe_price_id", priceId)
          .single();

        if (errPiano) {
          console.error(`   - 🚫 Errore ricerca piano per price ID ${priceId}:`, errPiano);
          break;
        }
        
        const pianoId = piano?.id || null;
const dataInizio = subscriptionItem?.current_period_start ? new Date(subscriptionItem.current_period_start * 1000).toISOString() : new Date().toISOString();
const dataFine = subscriptionItem?.current_period_end ? new Date(subscriptionItem.current_period_end * 1000).toISOString() : null;
        
const ambassadorCode=  subscription.metadata?.promoCode
        // Inserisci o aggiorna l'abbonamento dell'utente
        const { data: abbonamentoUtente, error: errAbbonamento } = await supabase
  .from("abbonamenti")
  .upsert(
    {
      utente_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id:subscription.customer,
      piano_id: pianoId,
      stato: "active",
      data_inizio: dataInizio,
      data_fine: dataFine,
      ambassador_code: ambassadorCode
    },
    { onConflict: 'stripe_subscription_id' } // Specify the unique column to handle conflicts
  )
  .select("id")
  .single();

if (errAbbonamento) {
  console.error(`   - 🚫 Errore upsert abbonamento per utente ${userId}:`, errAbbonamento);
  break;
}

        

        console.log(`   - ✅ Abbonamento utente salvato/aggiornato. ID: ${abbonamentoUtente?.id}`);
        break;
      }
      
      // ✅ Evento per i rinnovi successivi di un abbonamento
      // ... all'interno del tuo case "invoice.payment_succeeded"
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.parent?.subscription_details?.subscription as string;
        const stripeCustomerId = invoice.customer as string;
      
        if (!subscriptionId) {
          console.log(` - ⚠️ Fattura ${invoice.id} non collegata a un abbonamento. Skippo.`);
          break;
        }
        
        console.log(`➡️ Gestione invoice.payment_succeeded per fattura ID: ${invoice.id}`);
      
        // 1. Recupera l'UUID dell'utente dal tuo DB
        const { data: utente, error: errUtente } = await supabase
          .from("utenti")
          .select("id")
          .eq("stripe_customer_id", stripeCustomerId)
          .single();
      
        if (errUtente || !utente) {
          console.error(` - 🚫 Errore: Utente non trovato per Stripe customer ID ${stripeCustomerId} durante invoice.payment_succeeded. Skippo.`);
          return NextResponse.json({ received: true });
        }
        const userId = utente.id;
      
        // 2. RECUPERA L'UUID DELL'ABBONAMENTO CON RIPROVA
        let abbonamentoId = null;
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
          const { data: abbonamento } = await supabase
            .from("abbonamenti")
            .select("id")
            .eq("stripe_subscription_id", subscriptionId)
            .single();
      
          if (abbonamento) {
            abbonamentoId = abbonamento.id;
            break;
          }
      
          console.log(` - ⏳ Abbonamento non trovato per ID ${subscriptionId}. Riprovo tra 2 secondi... (Tentativo ${i + 1} di ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      
        if (!abbonamentoId) {
          console.error(` - 🚫 Errore: Abbonamento non trovato per Stripe subscription ID ${subscriptionId} dopo ${maxRetries} tentativi. Impossibile salvare il pagamento.`);
          break;
        }
      
        // 3. RECUPERA IL METODO DI PAGAMENTO E L'IMPORTO FINALE
        let metodoPagamento = "altro";
        const amountPaid = (invoice.amount_paid || 0) / 100;
      
        if (!invoice.id) {
          console.error(" - 🚫 Errore: ID fattura mancante.");
          break;
        }
      
        try {
          const expandedInvoice = await stripe.invoices.retrieve(
            invoice.id,
            { expand: ['payments.data.payment'] } 
          );
          console.log("expanded Invoice", expandedInvoice)
          
          const firstPayment = expandedInvoice.payments?.data[0];
      
          if (firstPayment && typeof firstPayment.payment === 'object') {
            const paymentObject = firstPayment.payment as unknown as Stripe.Charge | Stripe.PaymentIntent;
      
            if (paymentObject.object === 'charge') {
              const charge = paymentObject as Stripe.Charge;
              metodoPagamento = charge.payment_method_details?.card?.brand || charge.payment_method_details?.type || "sconosciuto";
            } else if (paymentObject.object === 'payment_intent') {
              const paymentIntent = paymentObject as Stripe.PaymentIntent;
              const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;
              if (paymentMethod && paymentMethod.type === 'card' && paymentMethod.card) {
                metodoPagamento = paymentMethod.card.brand;
              } else if (paymentMethod) {
                metodoPagamento = paymentMethod.type;
              }
            }
          }
        } catch (error) {
          console.error(" - 🚫 Errore nel recupero della fattura espansa o del metodo di pagamento:", error);
        }
      
        // 4. Inserisci il record del pagamento
        const { error: errPagamento } = await supabase.from("pagamenti").insert({
          utente_id: userId,
          importo: amountPaid,
          metodo: metodoPagamento,
          tipo_acquisto: "abbonamento",
          riferimento_id: abbonamentoId,
          stripe_subscription_id: subscriptionId,
          stato: "pagato",
        });
      
        if (errPagamento) {
          console.error(` - 🚫 Errore inserimento pagamento di rinnovo per fattura ${invoice.id}:`, errPagamento);
        } else {
          console.log(` - ✅ Pagamento salvato per utente ${userId}. Metodo: ${metodoPagamento}`);
        }
        break;
      }

      // ✅ Evento per la cancellazione o la scadenza di un abbonamento
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`➡️ Gestione customer.subscription.deleted per abbonamento ID: ${subscription.id}`);
        
        // Cerca e aggiorna lo stato dell'abbonamento nel tuo DB a "cancellato" o "scaduto"
        const { error: errUpdate } = await supabase
          .from("abbonamenti_utente")
          .update({ stato: "cancellato" })
          .eq("stripe_subscription_id", subscription.id);

        if (errUpdate) {
          console.error(`   - 🚫 Errore aggiornamento stato abbonamento per ID ${subscription.id}:`, errUpdate);
        } else {
          console.log(`   - ✅ Abbonamento aggiornato a 'cancellato'.`);
        }
        break;
      }
      
      default:
        console.log(`➡️ Evento non gestito: ${event.type}.`);
    }
  } catch (err) {
    console.error(`❌ Errore interno durante la gestione dell'evento ${event.type}:`, err);
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}