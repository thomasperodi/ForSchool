import { supabase } from "@/lib/supabaseClient";
 export async function getUtenteCompleto() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Utente non autenticato");
  }
  if (!user.id) {
    throw new Error("ID utente non valido");
  }

  // Query con join su scuola e abbonamento attivo più recente con piano associato
  const { data, error } = await supabase
    .from("utenti")
    .select(`
      id,
      nome,
      email,
      classe,
      ruolo,
      notifiche,
      tema,
      stripe_account_id,
      scuola:scuola_id (
        id,
        nome
      ),
      abbonamenti:abbonamenti (
        id,
        data_inizio,
        data_fine,
        stato,
        sconto_applicato,
        ambassador_code,
        piano:piano_id (
          id,
          nome,
          descrizione,
          stripe_price_id,
          prezzo,
          durata_giorni
        )
      )
    `)
    .eq("id", user.id)
    .eq("abbonamenti.stato", "active")
    .order("data_inizio", { foreignTable: "abbonamenti", ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("Errore Supabase:", error);
    throw new Error(error.message || "Errore nel recupero dati utente");
  }
  if (!data) {
    throw new Error("Utente non trovato nel database");
  }

  // Assicuro che scuola sia un oggetto singolo
  const scuola = Array.isArray(data.scuola) ? data.scuola[0] : data.scuola;

  // Estraggo abbonamento attivo (se presente)
  const abbonamentoAttivo = data.abbonamenti && data.abbonamenti.length > 0
    ? {
        ...data.abbonamenti[0],
        piano: data.abbonamenti[0].piano ?? null,
      }
    : null;

  return {
    ...data,
    scuola,
    scuola_nome: scuola?.nome ?? null,
    abbonamento_attivo: abbonamentoAttivo,
  };
}
