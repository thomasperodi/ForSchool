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
      scuola:scuola_id (
        id,
        nome
      )
    `)
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Errore Supabase:", error);
    throw new Error(error.message || "Errore nel recupero dati utente");
  }

  if (!data) {
    throw new Error("Utente non trovato nel database");
  }

  // 🔒 Forza la scuola a essere un oggetto singolo
  const scuola = Array.isArray(data.scuola) ? data.scuola[0] : data.scuola;

  return {
    ...data,
    scuola,
    scuola_nome: scuola?.nome ?? null,
  };
}
