import { supabase } from "@/lib/supabaseClient";
import type {
  Scuola,
  ProdottoMerch,
  NewProdottoMerch,
  UpdateProdottoMerch,
  ProdottoWithScuola,
  DashboardStats,
  VarianteProdottoMerch,
} from "@/types/database";

type VarianteForm = {
  colore: string;
  stock: string;
  prezzo_override: string;
  immagine: File[] | null;
};

// --- Funzioni di utilità ---

/** Pulisce nome file o stringhe per path */
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\.-]/g, "");
}

async function getOrCreateColorIdByName(nome: string,): Promise<number | null> {
  // Primo tentativo: cerca se esiste
  const { data: existing, error: selectError } = await supabase
    .from("colori")
    .select("id")
    .eq("nome", nome)
    .single();

  if (existing) return existing.id;

  // Se errore, ma non per "nessuna riga", logga
  if (selectError && selectError.code !== "PGRST116") {
    console.error("Errore selezione colore:", selectError);
    return null;
  }

  // Inserimento
  const { data: inserted, error: insertError } = await supabase
    .from("colori")
    .insert({ nome, })
    .select("id")
    .single();

  if (insertError) {
    console.error("Errore inserimento colore:", insertError);
    return null;
  }

  return inserted?.id ?? null;
}





// --- Funzioni Scuole ---

export async function getScuole(): Promise<Scuola[]> {
  const { data, error } = await supabase.from("scuole").select("*").order("nome");

  if (error) {
    console.error("Errore nel recupero delle scuole:", error);
    return [];
  }
  return data || [];
}

export async function createScuola(scuola: Omit<Scuola, "id">): Promise<Scuola | null> {
  const { data, error } = await supabase.from("scuole").insert(scuola).select().single();

  if (error) {
    console.error("Errore nella creazione della scuola:", error);
    return null;
  }
  return data;
}

// --- Funzioni Prodotti ---

export async function getProdotti(scuolaId?: string): Promise<ProdottoWithScuola[]> {
  let query = supabase
    .from("prodotti_merch")
    .select(`
      *,
      scuole (
        id,
        nome,
        citta,
        dominio
      )
    `)
    .order("created_at", { ascending: false });

  if (scuolaId) query = query.eq("scuola_id", scuolaId);

  const { data, error } = await query;

  if (error) {
    console.error("Errore nel recupero dei prodotti:", error);
    return [];
  }
  return data || [];
}

/**
 * Crea un prodotto, carica immagini e varianti associate.
 */
export async function createProdotto(
  prodotto: NewProdottoMerch, // prodotto.colore è nome colore (string | null)
  immagini: File[],
  varianti: VarianteForm[]
): Promise<boolean> {
  // Ottieni l'id colore da nome (se colore è definito)
  let colore_id: number | null = null;
  let coloreNomePulito = "default"; // fallback per path immagini

  if (prodotto.colore) {
    coloreNomePulito = sanitizeFileName(prodotto.colore.toLowerCase());
    colore_id = await getOrCreateColorIdByName(prodotto.colore.toLowerCase());
    if (!colore_id) {
      console.error("Colore non trovato o non creato, abort");
      return false;
    }
  }

  // Costruisci oggetto prodotto per inserimento DB (senza nome colore)
  const { colore, ...prodottoDB } = prodotto; 
  const prodottoDBFinal = { ...prodottoDB, colore_id };

  // Inserisci prodotto nel DB con colore_id
  const { data: prodottoInserito, error: prodottoError } = await supabase
    .from("prodotti_merch")
    .insert(prodottoDBFinal)
    .select()
    .single();

  if (prodottoError || !prodottoInserito) {
    console.error("Errore inserimento prodotto:", prodottoError);
    return false;
  }

  const scuolaId = prodottoInserito.scuola_id;

  // Carica immagini prodotto nella cartella usando il nome colore pulito per path
  for (const img of immagini) {
    const filePath = `merch/${scuolaId}/${prodottoInserito.id}/${coloreNomePulito}/${Date.now()}-${sanitizeFileName(img.name)}`;
    const { error: uploadError } = await supabase.storage.from("skoolly").upload(filePath, img);
    if (uploadError) {
      console.error("Errore upload immagine prodotto:", uploadError);
      continue;
    }
    const { error: refError } = await supabase.from("prodotti_merch_immagini").insert({
      prodotto_id: prodottoInserito.id,
      url: filePath,
    });
    if (refError) console.error("Errore inserimento immagine prodotto DB:", refError);
  }

  // Inserisci varianti
  // Inserisci varianti e immagini multiple
for (const v of varianti) {
  if (!v.colore || !v.stock) {
    console.error("Variante saltata: colore o stock mancante");
    continue;
  }

  const varianteColoreNomePulito = sanitizeFileName(v.colore.toLowerCase());
  const varianteColoreId = await getOrCreateColorIdByName(v.colore.toLowerCase());

  if (!varianteColoreId) {
    console.error(`Colore variante "${v.colore}" non trovato, variante saltata`);
    continue;
  }

  // Inserisci variante senza immagine_url (mettiamo a null)
  const { data: varianteInserita, error: varianteError } = await supabase.from("varianti_prodotto_merch").insert({
    prodotto_id: prodottoInserito.id,
    colore_id: varianteColoreId,
    stock: parseInt(v.stock, 10),
    prezzo_override: v.prezzo_override ? parseFloat(v.prezzo_override) : null,
    immagine_url: null,
  }).select().single();

  if (varianteError || !varianteInserita) {
    console.error("Errore inserimento variante:", varianteError);
    continue;
  }

  // Carica e inserisci immagini multiple per variante
  if (v.immagine && v.immagine.length > 0) {
    let ordine = 0;
    for (const file of v.immagine) {
      const variantePath = `merch/${scuolaId}/${prodottoInserito.id}/${varianteColoreNomePulito}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("skoolly").upload(variantePath, file);
      if (uploadError) {
        console.error("Errore upload immagine variante:", uploadError);
        continue;
      }

      // Inserisci URL immagine variante nella tabella immagini varianti
      const { error: imgInsertError } = await supabase.from("varianti_prodotto_merch_immagini").insert({
        variante_id: varianteInserita.id,
        url: variantePath,
        ordine,
      });

      if (imgInsertError) console.error("Errore inserimento immagine variante DB:", imgInsertError);
      ordine++;
    }
  }
}


  return true;
}




export async function updateProdotto(id: string, prodotto: UpdateProdottoMerch): Promise<ProdottoMerch | null> {
  const { data, error } = await supabase
    .from("prodotti_merch")
    .update({
      ...prodotto,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Errore nell'aggiornamento del prodotto:", error);
    return null;
  }
  return data;
}

export async function deleteProdotto(id: string): Promise<boolean> {
  const { error } = await supabase.from("prodotti_merch").delete().eq("id", id);

  if (error) {
    console.error("Errore nell'eliminazione del prodotto:", error);
    return false;
  }
  return true;
}

// --- Funzioni Statistiche ---

export async function getDashboardStats(): Promise<DashboardStats | null> {
  const { data: prodotti, error: prodottiError } = await supabase
    .from("prodotti_merch")
    .select("nome, prezzo, stock, scuola_id, scuole(nome)");

  const { data: scuole, error: scuoleError } = await supabase.from("scuole").select("id");

  if (prodottiError || scuoleError || !prodotti || !scuole) {
    console.error("Errore nel recupero dati dashboard:", prodottiError || scuoleError);
    return null;
  }

  // Calcolo ricavi totali come somma (prezzo * vendite), considerando vendite = (100 - stock)
  const totalRevenue = prodotti.reduce((sum, p) => sum + p.prezzo * Math.max(0, 100 - p.stock), 0);
  const totalProducts = prodotti.length;
  const totalSchools = scuole.length;
  const lowStockProducts = prodotti.filter((p) => p.stock < 10).length;

  // Mock dati mensili (puoi sostituire con dati reali)
  const monthlyRevenue = [8500, 9200, 10100, 11500, 12800, 13200, 14100, totalRevenue];

  // Top prodotti per vendite
  const topProducts = prodotti
    .sort((a, b) => (100 - b.stock) - (100 - a.stock))
    .slice(0, 5)
    .map((p) => ({
      nome: p.nome || "Prodotto",
      vendite: Math.max(0, 100 - p.stock),
      scuola: p.scuole?.[0]?.nome || "Scuola",
    }));

  // Statistiche per scuola
  const schoolStats = prodotti.reduce(
    (acc, p) => {
      const scuolaNome = p.scuole?.[0]?.nome || "Scuola";
      if (!acc[scuolaNome]) {
        acc[scuolaNome] = { prodotti: 0, fatturato: 0 };
      }
      acc[scuolaNome].prodotti++;
      acc[scuolaNome].fatturato += p.prezzo * Math.max(0, 100 - p.stock);
      return acc;
    },
    {} as Record<string, { prodotti: number; fatturato: number }>
  );

  const topSchools = Object.entries(schoolStats)
    .map(([nome, stats]) => ({ nome, ...stats }))
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, 5);

  return {
    totalRevenue,
    totalProducts,
    totalSchools,
    lowStockProducts,
    monthlyRevenue,
    topProducts,
    topSchools,
  };
}
