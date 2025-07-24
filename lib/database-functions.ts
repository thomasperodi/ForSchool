import { supabase } from "@/lib/supabaseClient";
import type {
  Scuola,
  ProdottoMerch,
  NewProdottoMerch,
  UpdateProdottoMerch,
  ProdottoWithScuola,
  DashboardStats,
} from "@/types/database"

// Funzioni per le scuole
export async function getScuole(): Promise<Scuola[]> {
  const { data, error } = await supabase.from("scuole").select("*").order("nome")

  if (error) {
    console.error("Errore nel recupero delle scuole:", error)
    return []
  }

  return data || []
}

export async function createScuola(scuola: Omit<Scuola, "id">): Promise<Scuola | null> {
  const { data, error } = await supabase.from("scuole").insert(scuola).select().single()

  if (error) {
    console.error("Errore nella creazione della scuola:", error)
    return null
  }

  return data
}

// Funzioni per i prodotti
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
    .order("created_at", { ascending: false })

  if (scuolaId) {
    query = query.eq("scuola_id", scuolaId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Errore nel recupero dei prodotti:", error)
    return []
  }

  return data || []
}

export async function createProdotto(newProdotto: NewProdottoMerch, file?: File) {
  try {
    function sanitizeFileName(fileName: string): string {
      return fileName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_\.-]/g, "")
    }

    // Creo il prodotto senza immagine per ottenere l'id
    const { data: prodottoCreato, error: insertError } = await supabase
      .from("prodotti_merch")
      .insert({
        scuola_id: newProdotto.scuola_id,
        nome: newProdotto.nome,
        descrizione: newProdotto.descrizione,
        prezzo: newProdotto.prezzo,
        stock: newProdotto.stock,
        immagine_url: null,
        disponibile: newProdotto.disponibile,
      })
      .select()
      .single()

    if (insertError || !prodottoCreato) {
      console.error("Errore inserimento prodotto:", insertError)
      throw insertError || new Error("Errore creazione prodotto")
    }

    let immagineUrl: string | null = null

    if (file) {
      const safeFileName = sanitizeFileName(file.name)
      const path = `merch/${newProdotto.scuola_id}/${prodottoCreato.id}/${safeFileName}`

      console.log("Upload file info:")
      console.log(" - path:", path)
      console.log(" - file type:", file.type)
      console.log(" - file size:", file.size)
      console.log(" - file name originale:", file.name)
      console.log(" - file name sanificato:", safeFileName)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("skoolly")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        console.error("Errore upload file:", uploadError)
        throw uploadError
      }

      console.log("Upload riuscito:", uploadData)

      const { data: publicUrlData } = supabase.storage
        .from("skoolly")
        .getPublicUrl(path)

      immagineUrl = publicUrlData.publicUrl
      console.log("URL pubblico immagine:", immagineUrl)

      const { error: updateError } = await supabase
        .from("prodotti_merch")
        .update({ immagine_url: immagineUrl })
        .eq("id", prodottoCreato.id)

      if (updateError) {
        console.error("Errore aggiornamento prodotto con immagine:", updateError)
        throw updateError
      }
    }

    return {
      ...prodottoCreato,
      immagine_url: immagineUrl,
    }
  } catch (error) {
    console.error("Errore createProdotto:", error)
    return null
  }
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
    .single()

  if (error) {
    console.error("Errore nell'aggiornamento del prodotto:", error)
    return null
  }

  return data
}

export async function deleteProdotto(id: string): Promise<boolean> {
  const { error } = await supabase.from("prodotti_merch").delete().eq("id", id)

  if (error) {
    console.error("Errore nell'eliminazione del prodotto:", error)
    return false
  }

  return true
}

// Funzioni per le statistiche
export async function getDashboardStats(): Promise<DashboardStats | null> {
  // Recupera statistiche aggregate
  const { data: prodotti } = await supabase
  .from("prodotti_merch")
  .select("nome, prezzo, stock, scuola_id, scuole(nome)")


  const { data: scuole } = await supabase.from("scuole").select("id")

  if (!prodotti || !scuole) return null

  const totalRevenue = prodotti.reduce((sum, p) => sum + p.prezzo * Math.max(0, 100 - p.stock), 0)
  const totalProducts = prodotti.length
  const totalSchools = scuole.length
  const lowStockProducts = prodotti.filter((p) => p.stock < 10).length

  // Mock data per il grafico mensile (in un'app reale, questi dati verrebbero dal database)
  const monthlyRevenue = [8500, 9200, 10100, 11500, 12800, 13200, 14100, totalRevenue]

  // Top prodotti (simulato)
  const topProducts = prodotti
  .sort((a, b) => (100 - a.stock) - (100 - b.stock))
  .slice(0, 5)
  .map((p) => ({
    nome: p.nome || "Prodotto",
    vendite: Math.max(0, 100 - p.stock),
    scuola: p.scuole[0]?.nome || "Scuola",
  }))


  // Top scuole per numero di prodotti
  const schoolStats = prodotti.reduce(
    (acc, p) => {
      const scuolaNome = p.scuole[0]?.nome || "Scuola"
      if (!acc[scuolaNome]) {
        acc[scuolaNome] = { prodotti: 0, fatturato: 0 }
      }
      acc[scuolaNome].prodotti++
      acc[scuolaNome].fatturato += p.prezzo * Math.max(0, 100 - p.stock)
      return acc
    },
    {} as Record<string, { prodotti: number; fatturato: number }>,
  )

  const topSchools = Object.entries(schoolStats)
    .map(([nome, stats]) => ({ nome, ...stats }))
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, 5)

  return {
    totalRevenue,
    totalProducts,
    totalSchools,
    lowStockProducts,
    monthlyRevenue,
    topProducts,
    topSchools,
  }
}
