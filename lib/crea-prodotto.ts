// Assicurati di importare supabaseAdmin qui
import { supabaseAdmin as supabase } from "@/lib/supabaseClientAdmin"; // Ora usa supabaseAdmin
// Assumi che queste funzioni esistano e siano correttamente importate
import { NewProdottoMerch } from "@/types/database";


type VarianteForm = {
  colore: string;
  stock: string;
  prezzo_override: string;
  immagine: File[] | null;
  taglie: number[]
};
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
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\.-]/g, "");
}
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

  // 1. Inserisci il prodotto nel DB per ottenere l'ID
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

  // --- Sezione Immagini Prodotto ---
  // Ora l'upload delle immagini avviene QUI, DOPO aver ottenuto prodottoInserito.id
  const immaginePrincipaleUrl: string | null = null;
  const immaginiCaricate: string[] = [];

  for (const [index, img] of immagini.entries()) {
    // Il percorso ora è corretto perché prodottoInserito.id è disponibile
    const filePath = `merch/${scuolaId}/${prodottoInserito.id}/${coloreNomePulito}/${Date.now()}-${sanitizeFileName(img.name)}`;
    
    // Tentativo di upload
    console.log(`Tentativo di upload per il file: ${img.name} al percorso: ${filePath}`);
    
    // Converti File in Buffer se necessario per l'ambiente Node.js,
    // altrimenti supabase.storage.upload accetta direttamente File.
    // Per un ambiente Next.js API route (Node.js), la conversione in Buffer è spesso preferibile.
    const arrayBuffer = await img.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("skoolly")
      .upload(filePath, buffer, { 
          contentType: img.type,
          cacheControl: '3600',
          upsert: false // Imposta su true se vuoi sovrascrivere file esistenti
      });

    if (uploadError) {
      // 🚨 Logga l'errore per capire il problema esatto
      console.error(`Errore durante l'upload dell'immagine ${img.name}:`, uploadError);
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
    const { error: updateProductError } = await supabase.from("prodotti_merch")
      .update({ immagine_url: immaginiCaricate[0] })
      .eq("id", prodottoInserito.id);
    
    if (updateProductError) {
        console.error("Errore aggiornamento URL immagine principale prodotto:", updateProductError);
    }
  } else {
      console.warn("Nessuna immagine del prodotto è stata caricata con successo.");
  }
  
  // --- Sezione Varianti ---
  for (const v of varianti) {
    if (!v.colore || !v.stock) continue;

    const coloreVarianteId = await getOrCreateColorIdByName(v.colore.toLowerCase());
    if (!coloreVarianteId) continue;

    const { data: varianteInserita, error: varianteInsertError } = await supabase
      .from("varianti_prodotto_merch")
      .insert({
        prodotto_id: prodottoInserito.id,
        colore_id: coloreVarianteId,
        stock: parseInt(v.stock),
        prezzo_override: v.prezzo_override ? parseFloat(v.prezzo_override) : null,
        immagine_url: null, // Immagine variante sarà gestita separatamente
      })
      .select()
      .single();

    if (varianteInsertError || !varianteInserita) {
        console.error("Errore inserimento variante:", varianteInsertError);
        continue;
    }

    // Immagini variante
    if (v.immagine && v.immagine.length > 0) {
      let ordine = 0;
      for (const file of v.immagine) {
        const path = `merch/${scuolaId}/${prodottoInserito.id}/varianti/${varianteInserita.id}/${sanitizeFileName(v.colore)}/${Date.now()}-${sanitizeFileName(file.name)}`;
        
        const variantArrayBuffer = await file.arrayBuffer();
        const variantBuffer = Buffer.from(variantArrayBuffer);

        const { error: variantUploadError } = await supabase.storage.from("skoolly").upload(path, variantBuffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
        });
        
        if (variantUploadError) {
            console.error(`Errore upload immagine variante ${file.name}:`, variantUploadError);
            continue;
        }

        const { data: pubUrl } = supabase.storage.from("skoolly").getPublicUrl(path);

        const { error: variantImageInsertError } = await supabase.from("varianti_prodotto_merch_immagini").insert({
          variante_id: varianteInserita.id,
          url: pubUrl.publicUrl,
          ordine,
        });

        if (variantImageInsertError) {
            console.error(`Errore salvataggio URL immagine variante nel DB:`, variantImageInsertError);
        }
        ordine++;
      }
    }

    // Taglie variante
    if (v.taglie && v.taglie.length > 0) {
      const records = v.taglie.map((tagliaId) => ({
        variante_id: varianteInserita.id,
        taglia_id: tagliaId,
      }));
      const { error: variantTaglieError } = await supabase.from("varianti_taglie_prodotto").insert(records);
      if (variantTaglieError) {
          console.error("Errore inserimento taglie variante:", variantTaglieError);
      }
    }
  }

  return true;
}
