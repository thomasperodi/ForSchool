import { supabase } from "@/lib/supabaseClient";
import { OrderItem, OrdineMerchCompleto } from "@/types";
import type {
  ProdottoMerch,
  NewProdottoMerch,
  UpdateProdottoMerch,
  ProdottoWithScuola,
  DashboardStats,
  LocaliWithPromo,
  Discoteca,
  EventoConStatistiche,
  Evento,
} from "@/types/database";


type VarianteForm = {
  colore: string;
  stock: string;
  prezzo_override: string;
  immagine: File[] | null;
  taglie: number[]
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



// --- Funzioni per Ordini ---
export async function updateOrdersStatusAPI(orderIds: string[], newStatus: OrdineMerchCompleto["stato"]) {
  
  const { data, error } = await supabase
    .from("ordini_merch")
    .update({ stato: newStatus })
    .in("id", orderIds)
    .select();

  if (error) {
    console.error("Errore nell'aggiornamento degli ordini:", error);
    return null;
  }

  return data as OrdineMerchCompleto[];
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
export interface Immagine {
  id: string;
  url: string;
  ordine: number;
}

export interface Colore {
  id: number;
  nome: string;
}
export interface TagliaDisponibile {
  id: number;
  nome: string;
  stock: number;
}
export interface Taglia {
  id: number;
  nome: string;
  stock_specifico: number | null;
}
export interface Variante {
  id: string;
  colore: Colore | null;
  // immagine_url è spesso ridondante se ci sono 'immagini' multiple
  // valuta se vuoi mantenerlo o basarti solo su 'immagini'
  immagine_url: string | null; 
  immagini: Immagine[];
  prezzo_override: number | null;
  stock: number;
  taglie?: TagliaDisponibile[]; // Aggiunto per supportare taglie multiple
  stripe_price_id: string; // 👈 Nuovo campo per Stripe
}

export interface Scuola {
  citta: string;
  dominio: string;
  id: string;
  nome: string;
}
interface RawProductTaglia {
  taglie: {
    id: number; // integer
    nome: string; // Es: 'S', 'M', 'L'
  }
  id: string; // uuid
  prodotto_id: string; // uuid
  taglia_id: number; // integer
  stock: number; // integer
  prezzo_override: number | null; // numeric(10, 2)
  immagine_url: string | null;
  // Se la API include anche il nome della taglia direttamente
  nome?: string; // Es: 'S', 'M', 'L'
}

export interface ProdottoWithDetails {
  prodotti_merch_taglie: RawProductTaglia[] | null; // Aggiunto per supportare taglie multiple
  id: string;
  // L'oggetto colore potrebbe essere null se non tutti i prodotti hanno un colore base
  colore: {
    nome: string;
    id: number;
  } | null; // Aggiunto null per maggiore robustezza
  scuola_id: string;
  nome: string;
  descrizione: string | null;
  prezzo: number;
  disponibile: boolean;
  stock: number;
  created_at: string;
  updated_at: string;
  immagine_url: string | null; // Immagine principale se esiste, altrimenti usa immagini[]
  scuole: {
    id: string;
    nome: string;
    citta: string;
    dominio: string;
  } | null;
  // Le immagini del prodotto base, dal relazionale 'prodotti_merch_immagini'
  immagini: Immagine[]; 
  // Le varianti del prodotto, dal relazionale 'varianti_prodotto_merch'
  varianti: Variante[];
  taglie: TagliaDisponibile[]; // ← Nuovo
  stripe_price_id: string; // 👈 Nuovo campo per Stripe
}

type RawProdottoSupabase = Omit<ProdottoWithDetails, 'immagini' | 'varianti' | 'colore' | 'scuole' | 'taglie'> & {
  prodotti_merch_immagini: Immagine[] | null;
  prodotti_merch_taglie: ({ stock: number; taglie: { id: number; nome: string } })[] | null;
  varianti_prodotto_merch: (Omit<Variante, 'colore' | 'immagini' | 'taglie'> & {
    colori: Colore | null;
    varianti_prodotto_merch_immagini: Immagine[] | null;
    varianti_taglie_prodotto: ({ stock: number; taglie: { id: number; nome: string } })[] | null;
  })[] | null;
  colori: Colore | null;
  scuole: Scuola | null;
};

// --- Funzioni Utente ---

export async function getUserSchool(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("utenti")
    .select("scuola_id")
    .eq("id", userId)
    .single<{ scuola_id: string }>();

  if (error) {
    console.error("Errore nel recupero della scuola dell'utente:", error);
    return null;
  }

  return data?.scuola_id ?? null;
}



// --- Funzioni Prodotti ---

export async function getProdottoById(id: string): Promise<ProdottoWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from("prodotti_merch")
      .select(`
        *,
        scuole (
          id,
          nome,
          citta,
          dominio
        ),
        prodotti_merch_immagini (
          id,
          url,
          ordine
        ),
        prodotti_merch_taglie (
          taglie (
            id,
            nome
          )
        ),
        varianti_prodotto_merch (
          id,
          prezzo_override,
          stock,
          immagine_url,
          colori (
            id,
            nome
          ),
          varianti_prodotto_merch_immagini (
            id,
            url,
            ordine
          ),
          varianti_taglie_prodotto (
            taglie (
              id,
              nome
            )
          )
        ),
        colori (
          id,
          nome
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching product by ID:", error);
      return null;
    }

    const rawData = data as RawProdottoSupabase;

    if (!rawData) return null;

    const prodotto: ProdottoWithDetails = {
      ...rawData,
      immagini: (rawData.prodotti_merch_immagini || []).sort((a, b) => (a.ordine || 0) - (b.ordine || 0)),
      taglie: (rawData.prodotti_merch_taglie || []).map(t => ({
        id: t.taglie.id,
        nome: t.taglie.nome,
        stock: t.stock,
      })),
      varianti: (rawData.varianti_prodotto_merch || []).map(v => ({
        id: v.id,
        colore: v.colori,
        immagine_url: v.immagine_url,
        stock: v.stock,
        stripe_price_id: v.stripe_price_id, // Aggiunto per rispettare il tipo Variante
        prezzo_override: v.prezzo_override,
        immagini: (v.varianti_prodotto_merch_immagini || []).sort((a, b) => (a.ordine || 0) - (b.ordine || 0)),
        taglie: (v.varianti_taglie_prodotto || []).map(t => ({
          id: t.taglie.id,
          nome: t.taglie.nome,
          stock: t.stock,
        })),
      })),
      colore: rawData.colori || null,
      scuole: rawData.scuole || null,
    };

    return prodotto;
  } catch (err) {
    console.error("Unexpected error in getProdottoById:", err);
    return null;
  }
}

export async function getProdotti(scuolaId?: string): Promise<ProdottoWithDetails[]> {
  let query = supabase
    .from("prodotti_merch")
    .select(`
      *,
      scuole (
        id,
        nome,
        citta,
        dominio
      ),
      prodotti_merch_immagini (
        id,
        url,
        ordine
      ),
      prodotti_merch_taglie (
        taglie (
          id,
          nome
        )
      ),
      varianti_prodotto_merch (
        id,
        prezzo_override,
        stock,
        immagine_url,
        colori (
          id,
          nome
        ),
        varianti_prodotto_merch_immagini (
          id,
          url,
          ordine
        ),
        varianti_taglie_prodotto (
          taglie (
            id,
            nome
          )
        )
      ),
      colori (
        id,
        nome
      )
    `)
    .order("created_at", { ascending: false });

  if (scuolaId) query = query.eq("scuola_id", scuolaId);

  const { data, error } = await query;

  if (error) {
    console.error("Errore nel recupero dei prodotti:", error);
    return [];
  }

  return (data as RawProdottoSupabase[]).map(prod => ({
    ...prod,
    immagini: (prod.prodotti_merch_immagini || []).sort((a, b) => (a.ordine || 0) - (b.ordine || 0)),
    taglie: (prod.prodotti_merch_taglie || []).map(t => ({
      id: t.taglie.id,
      nome: t.taglie.nome,
      stock: t.stock,
    })),
    varianti: (prod.varianti_prodotto_merch || []).map(v => ({
      id: v.id,
      colore: v.colori,
      immagine_url: v.immagine_url,
      stock: v.stock,
      stripe_price_id: v.stripe_price_id,
      prezzo_override: v.prezzo_override,
      immagini: (v.varianti_prodotto_merch_immagini || []).sort((a, b) => (a.ordine || 0) - (b.ordine || 0)),
      taglie: (v.varianti_taglie_prodotto || []).map(t => ({
        id: t.taglie.id,
        nome: t.taglie.nome,
        stock: t.stock,
      })),
    })),
    colore: prod.colori || null,
    scuole: prod.scuole || null,
  }));
}


/**
 * Crea un prodotto, carica immagini e varianti associate.
 */
export async function createProdotto(
  prodotto: NewProdottoMerch,
  immagini: File[],
  varianti: VarianteForm[],
  taglieProdotto: number[]
): Promise<boolean> {
  let colore_id: number | null = null;
  let coloreNomePulito = "default";

  if (prodotto.colore) {
    coloreNomePulito = sanitizeFileName(prodotto.colore.toLowerCase());
    colore_id = await getOrCreateColorIdByName(prodotto.colore.toLowerCase());
    if (!colore_id) {
      console.error("Colore non trovato o non creato");
      return false;
    }
  }

  const { colore, ...prodottoDB } = prodotto;
  const prodottoDBFinal = { ...prodottoDB, colore_id };



  const { data: prodottoInserito, error: prodottoError } = await supabase
    .from("prodotti_merch")
    .insert({
      ...prodottoDBFinal,
    })
    .select()
    .single();

  if (prodottoError || !prodottoInserito) {
    console.error("Errore inserimento prodotto:", prodottoError);
    return false;
  }

  const scuolaId = prodottoInserito.scuola_id;

  // Taglie prodotto
  if (taglieProdotto.length > 0) {
    const taglieRecords = taglieProdotto.map((tagliaId) => ({
      prodotto_id: prodottoInserito.id,
      taglia_id: tagliaId,
    }));
    const { error: tagliaError } = await supabase.from("prodotti_merch_taglie").insert(taglieRecords);
    if (tagliaError) console.error("Errore inserimento taglie prodotto:", tagliaError);
  }

  // Immagini prodotto
  const immaginePrincipaleUrl: string | null = null;
  const immaginiCaricate: string[] = [];

  for (const [index, img] of immagini.entries()) {
    const filePath = `merch/${scuolaId}/${prodottoInserito.id}/${coloreNomePulito}/${Date.now()}-${sanitizeFileName(img.name)}`;
    
    // Tentativo di upload
    console.log(`Tentativo di upload per il file: ${img.name}`);
    const { error: uploadError } = await supabase.storage.from("skoolly").upload(filePath, img, {
        cacheControl: '3600',
        upsert: false // Imposta su true se vuoi sovrascrivere file esistenti
    });

    if (uploadError) {
      // 🚨 Logga l'errore per capire il problema esatto
      console.error(`Errore durante l'upload dell'immagine ${img.name}:`, uploadError);
      
      // Puoi decidere se interrompere o continuare
      // return false; // Scommenta se un singolo errore deve far fallire tutta l'operazione
      continue; // Continua con le altre immagini
    }

    // Se l'upload ha successo, ottieni l'URL e salva nel DB
    const { data: publicUrlData } = supabase.storage.from("skoolly").getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;
    immaginiCaricate.push(publicUrl);

    const { error: insertError } = await supabase.from("prodotti_merch_immagini").insert({
      prodotto_id: prodottoInserito.id,
      url: publicUrl,
    });
    
    if (insertError) {
        console.error(`Errore salvataggio URL immagine nel DB:`, insertError);
    }
  }
  
  // Salva l'immagine principale solo se ne è stata caricata almeno una
  if (immaginiCaricate.length > 0) {
    await supabase.from("prodotti_merch")
      .update({ immagine_url: immaginiCaricate[0] })
      .eq("id", prodottoInserito.id);
  } else {
      console.error("Nessuna immagine del prodotto è stata caricata con successo.");
  }


  // Varianti
  for (const v of varianti) {
    if (!v.colore || !v.stock) continue;

    const coloreVarianteId = await getOrCreateColorIdByName(v.colore.toLowerCase());
    if (!coloreVarianteId) continue;



     



    const { data: varianteInserita } = await supabase
      .from("varianti_prodotto_merch")
      .insert({
        prodotto_id: prodottoInserito.id,
        colore_id: coloreVarianteId,
        stock: parseInt(v.stock),
        prezzo_override: v.prezzo_override ? parseFloat(v.prezzo_override) : null,
        immagine_url: null,
      })
      .select()
      .single();

    if (!varianteInserita) continue;

    // Immagini variante
    if (v.immagine && v.immagine.length > 0) {
      let ordine = 0;
      for (const file of v.immagine) {
        const path = `merch/${scuolaId}/${prodottoInserito.id}/${sanitizeFileName(v.colore)}/${Date.now()}-${sanitizeFileName(file.name)}`;
        await supabase.storage.from("skoolly").upload(path, file);
        const { data: pubUrl } = supabase.storage.from("skoolly").getPublicUrl(path);

        await supabase.from("varianti_prodotto_merch_immagini").insert({
          variante_id: varianteInserita.id,
          url: pubUrl.publicUrl,
          ordine,
        });
        ordine++;
      }
    }

    // Taglie variante
    if (v.taglie && v.taglie.length > 0) {
      const records = v.taglie.map((tagliaId) => ({
        variante_id: varianteInserita.id,
        taglia_id: tagliaId,
      }));
      await supabase.from("varianti_taglie_prodotto").insert(records);
    }
  }

  return true;
}


export async function getTaglie(): Promise<{ id: number; nome: string }[]> {
  const { data, error } = await supabase
    .from("taglie")
    .select("id, nome")
    .order("nome", { ascending: true });
  if (error) {
    console.error("Errore caricamento taglie:", error);
    return [];
  }
  return data;
}





export async function updateProdotto(id: string, prodotto: UpdateProdottoMerch): Promise<ProdottoMerch | null> {
  console.log("Aggiornamento prodotto:", id, prodotto);

  // Destructure to separate properties that should NOT be part of the update payload.
  // In this case, we're assuming 'id', 'created_at', 'updated_at' are handled separately
  // or are not intended for direct update from the 'prodotto' object.
  const { id: productId, created_at, updated_at, ...updatePayload } = prodotto;

  // The 'payload' object now correctly contains only the columns meant for update.
  const payload = {
    ...updatePayload,
    updated_at: new Date().toISOString(), // Ensure updated_at is always set
  };

  const { data, error } = await supabase
    .from("prodotti_merch")
    .update(payload) // Send the filtered payload
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

  // Fetch order data
  const { data: ordini, error: ordiniError } = await supabase
    .from("ordini_merch") // Replace with your actual orders table name
    .select("id, stato"); // Select relevant columns, e.g., 'id' and 'stato' (status)

  if (prodottiError || scuoleError || ordiniError || !prodotti || !scuole || !ordini) {
    console.error("Errore nel recupero dati dashboard:", prodottiError || scuoleError || ordiniError);
    return null;
  }

  // Calculate existing stats
  const totalRevenue = prodotti.reduce((sum, p) => sum + p.prezzo * Math.max(0, 100 - p.stock), 0);
  const totalProducts = prodotti.length;
  const totalSchools = scuole.length;
  const lowStockProducts = prodotti.filter((p) => p.stock < 10).length;

  // Calculate totalOrders and pendingOrders from fetched data
  const totalOrders = ordini.length;
  const pendingOrders = ordini.filter(order => order.stato === 'pending').length; // Adjust 'stato' and 'pending' to your actual schema

  // Mock dati mensili (you can replace with real data)
  const monthlyRevenue = [8500, 9200, 10100, 11500, 12800, 13200, 14100, totalRevenue];

  // Top prodotti per vendite
  // Top prodotti per vendite
const topProducts = prodotti
  .sort((a, b) => (100 - b.stock) - (100 - a.stock))
  .slice(0, 5)
  .map((p) => ({
    name: p.nome || "Prodotto",                   // ✅ usa 'name'
    sales: Math.max(0, 100 - p.stock),            // ✅ usa 'sales'
    scuola: p.scuole?.[0]?.nome || null,          // ✅ type: string | null
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
  totalOrders,
  totalSchools,
  pendingOrders,
  lowStockProducts,
  monthlyRevenue,
  topProducts,   // ✅ ora compatibile con il tipo
  topSchools,
};

}


// Get Ordini Merch

export async function getOrdiniMerch(): Promise<OrdineMerchCompleto[]> {
  const { data, error } = await supabase
    .from("ordini_merch")
    .select(`
      *,
      utente:utenti!ordini_merch_utente_id_fkey (
        id,
        nome,
        email,
        scuola:scuole!utenti_scuola_id_fkey (
          id,
          nome
        )
      ),
      prodotto:prodotti_merch!ordini_merch_prodotto_id_fkey (
        id,
        nome,
        prezzo,
        immagine_url,
        scuole (
          id,
          nome
        ),
        colore:colori!prodotti_merch_colore_id_fkey (
        id,
        nome
        )
      ),
      variante:varianti_prodotto_merch!ordini_merch_variante_id_fkey (
        id,
        colore_id,
        prezzo_override,
        stock,
        immagine_url
      )
    `)
    .order("timestamp", { ascending: false })

  if (error) {
    console.error("Errore nel recupero degli ordini:", error)
    return []
  }

  return data as OrdineMerchCompleto[]
}


export async function deleteOrdineMerch(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("ordini_merch")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Errore nell'eliminazione dell'ordine:", error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Errore inatteso nell'eliminazione dell'ordine:", error);
    return false;
  }
}



export async function GetLocaliWithPromozioni(): Promise<LocaliWithPromo | null> {
  try {
   const { data: locali, error } = await supabase
  .from("locali")
  .select(`
    *,
    promozioni(*)
  `)
  .order("created_at", { foreignTable: "promozioni", ascending: false })
  .gte("promozioni.valid_until", new Date().toISOString());


    if (error) {
      console.error("Errore nel recupero locali con promozioni:", error.message);
      return null;
    }
    
    if (!locali) return null;

    // Per ogni locale, chiama la tua API per ottenere le immagini
    const localiConImmagini = await Promise.all(
      locali.map(async (locale) => {
        try {
          const res = await fetch(`/api/locali-immagini?locale_id=${locale.id}`);
          if (!res.ok) {
            console.error(`Errore chiamata API immagini per locale ${locale.id}:`, await res.text());
            return { ...locale, immagini_locali: [] };
          }
          const json = await res.json();
          return {
            ...locale,
            immagini_locali: json.images ?? [],
          };
        } catch (err) {
          console.error(`Errore fetch API immagini per locale ${locale.id}:`, err);
          return { ...locale, immagini_locali: [] };
        }
      })
    );

    return localiConImmagini as LocaliWithPromo;
  } catch (error) {
    console.error("Errore inatteso:", error);
    return null;
  }
}


// Funzioni per EVENTI DISCOTECHE


type DiscotecaRow = {
  discoteche: {
    id: string
    nome: string
    indirizzo: string
  }[]
}
type DiscotecaDB = {
  id: string
  nome: string
  indirizzo: string
}


export async function getDiscotecheUtente(utenteId: string): Promise<Discoteca[]> {
  const { data, error } = await supabase
    .from("utenti_discoteche")
    .select(`
      discoteche (
        id,
        nome,
        indirizzo,
        stripe_account_id
      )
    `)
    .eq("utente_id", utenteId)

  if (error) {
    console.error("Errore nel recupero discoteche:", error)
    return []
  }

  if (!data) return []

  return data.flatMap(item => {
    const discoteche = item.discoteche as Discoteca[] | null
    if (!discoteche) return []
    return Array.isArray(discoteche)
      ? discoteche
      : [discoteche]
  })
  
}






// Get general statistics for a nightclub
export async function getStatisticheDiscoteca(discotecaId: string) {
  const { data, error } = await supabase.rpc("get_statistiche_discoteca", {
    discoteca_id: discotecaId,
  })

  if (error) {
    console.error("Errore nel recupero statistiche:", error)
    return {
      totale_eventi: 0,
      totale_biglietti: 0,
      ricavi_totali: 0,
      prezzo_medio_biglietto: 0,
    }
  }

  return (
    data[0] || {
      totale_eventi: 0,
      totale_biglietti: 0,
      ricavi_totali: 0,
      prezzo_medio_biglietto: 0,
    }
  )
}

// Get events with statistics for a nightclub
export async function getEventiConStatistiche(discotecaId: string): Promise<EventoConStatistiche[]> {
  const { data, error } = await supabase
    .from("eventi")
    .select(`
      *,
      biglietti!left(
        id,
        prezzo_pagato,
        stato_pagamento
      )
    `)
    .eq("discoteca_id", discotecaId)
    .order("data", { ascending: false })

  if (error) {
    console.error("Errore nel recupero eventi:", error)
    return []
  }

  // Process events to calculate statistics
  console.log(data)
  return (
    data?.map((evento: Evento & { biglietti?: { id: string; prezzo_pagato: number; stato_pagamento: string }[] }) => {
      const bigliettiPagati = evento.biglietti?.filter((b) => b.stato_pagamento === "pagato") || []
      const partecipanti_count = bigliettiPagati.length
      const ricavi = bigliettiPagati.reduce((sum, b) => sum + (b.prezzo_pagato || 0), 0)
      const tasso_riempimento = evento.max_partecipanti ? (partecipanti_count / evento.max_partecipanti) * 100 : 0

      return {
        ...evento,
        partecipanti_count,
        ricavi,
        tasso_riempimento,
      }
    }) || []
  )
}

// Get monthly data for charts
export async function getDatiMensili(discotecaId: string) {
  const { data, error } = await supabase.rpc("get_dati_mensili", {
    discoteca_id: discotecaId,
  })

  if (error) {
    console.error("Errore nel recupero dati mensili:", error)
    return []
  }

  return data || []
}

// Create a new event
// export async function creaEvento(evento: Omit<Evento, "id">) {
//   const { data, error } = await supabase.from("eventi").insert([evento]).select().single()

//   if (error) {
//     console.error("Errore nella creazione evento:", error)
//     throw error
//   }

//   return data
// }

// Update an event
export async function aggiornaEvento(eventoId: string, aggiornamenti: Partial<Evento>) {
  const { data, error } = await supabase.from("eventi").update(aggiornamenti).eq("id", eventoId).select().single()

  if (error) {
    console.error("Errore nell'aggiornamento evento:", error)
    throw error
  }

  return data
}

// Delete an event
export async function eliminaEvento(eventoId: string) {
  const { error } = await supabase.from("eventi").delete().eq("id", eventoId)

  if (error) {
    console.error("Errore nell'eliminazione evento:", error)
    throw error
  }

  return true
}

// Get top events by participants
export async function getEventiTop(discotecaId: string, limite = 5) {
  const { data, error } = await supabase.rpc("get_eventi_top", {
    discoteca_id: discotecaId,
    limite_risultati: limite,
  })

  if (error) {
    console.error("Errore nel recupero eventi top:", error)
    return []
  }

  return data || []
}