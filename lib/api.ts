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

  /*
   * Query con join:
   * - prendo dati da 'utenti'
   * - join con scuola tramite scuola_id
   * - join su 'utente_abbonamenti' filtrando stato = 'attivo'
   * - join su 'abbonamenti' tramite abbonamento_id
   * 
   * Nota: Supabase permette join con la sintassi 'foreign_table!inner(foreign_key)'
   * e relazioni definite sul db, oppure con il formato JSON esplicito.
   */

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
    utente_abbonamenti (
      id,
      data_inizio,
      data_fine,
      stato,
      sconto_applicato,
      ambassador_code,
      abbonamento:abbonamento_id (
        id,
        nome,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        stato,
        data_inizio_periodo,
        data_fine_periodo,
        data_fine_prova,
        data_cancellazione,
        quantita
      )
    )
  `)
  .eq("id", user.id)
  .eq("utente_abbonamenti.stato", "attivo")
  .order("data_inizio", { foreignTable: "utente_abbonamenti", ascending: false }) // <-- qui
  .limit(1)
  .single();


  if (error) {
    console.error("Errore Supabase:", error);
    throw new Error(error.message || "Errore nel recupero dati utente");
  }

  if (!data) {
    throw new Error("Utente non trovato nel database");
  }

  // Forza la scuola a essere un oggetto singolo
  const scuola = Array.isArray(data.scuola) ? data.scuola[0] : data.scuola;

  // Estraggo l'abbonamento attivo (se presente)
  const abbonamentoAttivo = data.utente_abbonamenti && data.utente_abbonamenti.length > 0
    ? {
        ...data.utente_abbonamenti[0],
        abbonamento: data.utente_abbonamenti[0].abbonamento ?? null,
      }
    : null;

  return {
    ...data,
    scuola,
    scuola_nome: scuola?.nome ?? null,
    abbonamento_attivo: abbonamentoAttivo,
  };
}
