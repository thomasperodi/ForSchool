// app/api/student/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Estrae l'ID dello studente dai parametri della richiesta.

  // 1. Recupera i dati del profilo utente.
  const { data: user, error: userError } = await supabase
    .from("utenti") // Dalla tabella 'utenti'.
    .select(`
      *,
      scuola:scuole (
        nome
      ),
      codici:codici_ambassador (
      codice
      )
    `)
    .eq("id", id) // Filtra per l'ID dello studente.
    .single(); // Si aspetta un singolo risultato.
 console.log(user.codici[0].codice)
  // Gestisce l'errore se l'utente non viene trovato.
  if (userError || !user) {
    console.error("Errore nel recupero dell'utente:", userError); // Log dell'errore per debugging
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // 2. Recupera gli ordini di merchandising dello studente.
const { data: orders, error: ordersError } = await supabase
  .from("ordini_merch")
  .select(`
    id,
    quantita,
    stato,
    timestamp,
    prodotto_id,
    prodotti_merch!inner (
      nome,
      prezzo
    )
  `)
  .eq("utente_id", id)
  .order("timestamp", { ascending: false });


  if (ordersError) {
    console.error("Errore nel recupero degli ordini merch:", ordersError); // Log dell'errore
    // Continua l'esecuzione anche in caso di errore negli ordini, ma con un array vuoto.
  }
  // Formatta i dati degli ordini per una migliore presentazione.
const formattedOrders = orders?.map(o => {
    type Prod = { nome?: string; prezzo?: number };
    const product = (o as { prodotti_merch?: Prod | Prod[] }).prodotti_merch;

    // Gestisce sia relazione come oggetto singolo che come array
    const extractedName = Array.isArray(product)
        ? product?.[0]?.nome
        : product?.nome;

    const extractedPrice = Array.isArray(product)
        ? product?.[0]?.prezzo
        : product?.prezzo;

    const productName = extractedName ?? "Prodotto Sconosciuto";
    const productPrice = Number(extractedPrice ?? 0);

    return {
        id: o.id,
        item: productName,
        price: productPrice * o.quantita,
        status: o.stato,
        date: o.timestamp
    };
});




  // 3. Recupera le sessioni di tutoraggio prenotate dallo studente (bookedSessions).
  const { data: booked, error: bookedError } = await supabase
    .from("prenotazioni_ripetizioni") // Dalla tabella 'prenotazioni_ripetizioni'.
    .select(`
      id,
      orario_richiesto,
      stato,
      ripetizioni: ripetizioni!inner(
        materia,
        tutor_id,
        utenti!ripetizioni_tutor_id_fkey(nome)
      )
    `)
    .eq("studente_id", id) // Filtra per l'ID dello studente.
    .order("orario_richiesto", { ascending: false }); // Ordina per orario richiesto decrescente.

  if (bookedError) {
    console.error("Errore nel recupero delle sessioni prenotate:", bookedError); // Log dell'errore
  }
  // Formatta le sessioni prenotate.
  const bookedSessions = booked?.map(b => {
    // Supabase restituisce un array di ripetizioni, quindi prendi il primo elemento
    const ripetizione = Array.isArray(b.ripetizioni) ? b.ripetizioni[0] : b.ripetizioni;
    // Anche utenti è un array, quindi prendi il primo elemento
    const tutor = Array.isArray(ripetizione?.utenti) ? ripetizione.utenti[0] : ripetizione?.utenti;

    return {
      id: b.id,
      subject: ripetizione?.materia ?? "Materia Sconosciuta",
      tutor: tutor?.nome ?? "Tutor Sconosciuto", // accedi direttamente a nome
      date: b.orario_richiesto?.split("T")[0],
      time: b.orario_richiesto?.split("T")[1]?.slice(0, 5),
      status: b.stato,
    };
  }) ?? [];



  // 4. Recupera le ripetizioni offerte dallo studente (indipendentemente che siano prenotate o meno)
  const { data: offeredLessons, error: offeredLessonsError } = await supabase
    .from("ripetizioni")
    .select("id, materia, data_pubblicazione, disponibile")
    .eq("tutor_id", id)
    .order("data_pubblicazione", { ascending: false });

  if (offeredLessonsError) {
    console.error("Errore nel recupero delle ripetizioni offerte:", offeredLessonsError);
  }

  const offeredSessions = offeredLessons?.map((r) => ({
    id: r.id,
    subject: r.materia ?? "Materia Sconosciuta",
    student: undefined, // Non associata ad uno studente specifico
    date: r.data_pubblicazione ? String(r.data_pubblicazione).split("T")[0] : "",
    time: r.data_pubblicazione ? String(r.data_pubblicazione).split("T")[1]?.slice(0, 5) : "",
    status: r.disponibile ? "disponibile" : "non_disponibile",
  })) ?? [];


  // 5. Recupera i prodotti del marketplace creati dall'utente.
  const { data: marketplacePosts, error: marketplaceError } = await supabase
    .from("prodotti") // Dalla tabella 'prodotti'.
    .select("id, nome, descrizione, prezzo, immagini, creato_il") // Seleziona i dettagli del prodotto.
    .eq("creato_da", id) // Filtra per l'ID dell'utente che ha creato il prodotto.
    .order("creato_il", { ascending: false }); // Ordina per data di creazione decrescente.

  if (marketplaceError) {
    console.error("Errore nel recupero dei prodotti del marketplace:", marketplaceError); // Log dell'errore
  }

  // Formatta i prodotti del marketplace.
  const formattedMarketplacePosts =
    marketplacePosts?.map((p) => ({
      id: p.id,
      name: p.nome,
      description: p.descrizione,
      price: Number(p.prezzo),
      images: p.immagini,
      dateCreated: p.creato_il,
    })) ?? [];


  // 6. Recupera le statistiche ambassador se l'utente è un ambassador.
  // Definiamo una percentuale di commissione fissa per gli ambassador.
// Puoi modificare questo valore in base alla tua strategia di remunerazione.


let ambassadorStats = null;

// Controlla se l'utente è un ambassador e ha un codice ambassador associato
if (user.is_ambassador && user.codici[0].codice) {
  // 1. Recupera i dettagli del codice ambassador dalla tabella 'codici_ambassador'
  const { count: totalReferralsCount, error: countError } = await supabase
  .from("abbonamenti")
  .select("*", { count: "exact", head: true }) // 'head: true' non ritorna dati, solo il count
  .eq("ambassador_code", user.codici[0].codice);

if (countError) {
  console.error("Errore nel conteggio dei referral totali:", countError);
  return;
}


  // --- Calcolo dei Referral e Guadagni Mensili ---
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  // 2. Recupera gli abbonamenti mensili con il prezzo del piano
  const { data: monthlySubscriptions, error: monthlySubsError } = await supabase
    .from("abbonamenti")
    .select("id, piani_abbonamento(prezzo)")
    .eq("ambassador_code", user.codici[0].codice)
    .gte("data_inizio", startOfMonth)
    .lt("data_inizio", endOfMonth);

  if (monthlySubsError) {
    console.error("Errore nel recupero dei referral mensili:", monthlySubsError);
    return;
  }
 
  const monthlyReferralsCount = monthlySubscriptions?.length ?? 0;



  
  function calculateCommissionFromPrice(prezzo: number) {
    if (prezzo === 4.99) return 1.25; // Plus 
    if (prezzo === 9.99) return 2.50; // Elite 
    return 0; // altri piani o errori
  }
  
  // Calcolo mensile
  const monthlyEarnings = monthlySubscriptions?.reduce((sum, sub) => {
    const piani = sub.piani_abbonamento as { prezzo: number } | { prezzo: number }[] | null;
    console.log(piani)
    if (!piani) return sum;
  
    if (Array.isArray(piani)) {
      return sum + piani.reduce((s, p) => s + calculateCommissionFromPrice(p.prezzo), 0);
    }
  
    return sum + calculateCommissionFromPrice(piani.prezzo);
  }, 0) ?? 0;
  
  // Calcolo totale


  // --- Calcolo dei Referral e Guadagni Totali ---
  
  

  // 3. Recupera tutti gli abbonamenti con il prezzo del piano
  const { data: allSubscriptions, error: allSubsError } = await supabase
    .from("abbonamenti")
    .select("id, piani_abbonamento(prezzo)")
    .eq("ambassador_code", user.codici[0].codice);

  if (allSubsError) {
    console.error("Errore nel recupero di tutti i referral:", allSubsError);
    return;
  }
  const totalEarnings = allSubscriptions?.reduce((sum, sub) => {
    const piani = sub.piani_abbonamento as { prezzo: number } | { prezzo: number }[] | null;
    if (!piani) return sum;
  
    if (Array.isArray(piani)) {
      return sum + piani.reduce((s, p) => s + calculateCommissionFromPrice(p.prezzo), 0);
    }
  
    return sum + calculateCommissionFromPrice(piani.prezzo);
  }, 0) ?? 0;




  // 4. Popola l'oggetto ambassadorStats con tutti i dati calcolati
  ambassadorStats = {
    promoCode: user.codici[0].codice,
    totalReferrals: totalReferralsCount,
    monthlyReferrals: monthlyReferralsCount,
    totalEarnings,
    monthlyEarnings,
    conversionRate: 0, // se vuoi calcolare il tasso di conversione puoi farlo qui
  };
}


// Ora l'oggetto 'ambassadorStats' contiene tutti i dati aggiornati e calcolati.
// Puoi usarlo come preferisci nella tua applicazione.

  // 7. Costruisce la risposta finale.
  const result = {
    profile: {
      name: user.nome, // Nome dell'utente.
      email: user.email, // Email dell'utente.
      Scuola: user.scuola?.nome ?? "N/A", // Università o "N/A".
      course: user.classe ?? "N/A", // Corso o "N/A".
      avatar: "/diverse-student-profiles.png", // Immagine avatar di default.
    },
    orders: formattedOrders, // Ordini di merchandising formattati.
    marketplacePosts: formattedMarketplacePosts, // Post del marketplace creati dall'utente.
    bookedSessions, // Sessioni di tutoraggio prenotate.
    offeredSessions, // Sessioni di tutoraggio offerte (se l'utente è un tutor).
    ambassadorStats, // Statistiche ambassador.
  };

  // Restituisce la risposta JSON.
  return NextResponse.json(result);
}