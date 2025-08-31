'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type Product = {
  id: number;
  nome: string;
  descrizione: string;
  prezzo: number;
  numero_telefono: string;
  immagini: string[];
  creato_da: string;
};
export default function MarketplaceClient({
    initialProducts,
  }: {
    initialProducts: Product[];
  }) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [openNew, setOpenNew] = useState(false);
    const [openMyAds, setOpenMyAds] = useState(false);
    const [search, setSearch] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const PRODUCTS_PER_PAGE = 6;
    const [currentPage, setCurrentPage] = useState(1);
    const user = useUser();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const router = useRouter()
    const supabase = useSupabaseClient();
    const [hasRedirected, setHasRedirected] = useState(false);
    
    
    
useEffect(() => {
  if (!user) return;

  async function fetchSubscription() {
    const { data, error } = await supabase
      .from('abbonamenti')
      .select('stato')
      .eq('utente_id', user?.id)
      .eq('stato', 'active')
      .single(); // prende solo l'abbonamento attivo più recente
    console.log(data)
    if (error) {
      console.error(error);
      setIsSubscribed(false);
      return;
    }
    if(data){
      setIsSubscribed(true)
    }
    else{
      setIsSubscribed(false)
    }

    // setIsSubscribed(!!data);
  }

  fetchSubscription();
}, [user]);


useEffect(() => {
  if (!isSubscribed && !hasRedirected) {
    toast.error("Non hai l'abbonamento per accedere a questa sezione");
    router.push("/home");
    setHasRedirected(true); // blocca ulteriori toast
  }
}, [isSubscribed, router, hasRedirected]);




  const [form, setForm] = useState({
    nome: '',
    descrizione: '',
    prezzo: '',
    numero_telefono: '',
    immagini: [] as File[],
  });


  // Per tenere traccia dell'immagine mostrata nel carosello per ogni prodotto
  const [carouselIndex, setCarouselIndex] = useState<Record<number, number>>({});

  async function createProduct() {
    if (!user) return toast.error('Devi essere loggato');

    // 1. Inserisci prodotto senza immagini per ottenere l'id
    const { data: insertData, error: insertError } = await supabase
      .from('prodotti')
      .insert({
        nome: form.nome,
        descrizione: form.descrizione,
        prezzo: parseFloat(form.prezzo),
        numero_telefono: form.numero_telefono,
        immagini: [], // ancora vuoto
        creato_da: user.id,
      })
      .select()
      .single();

    if (insertError || !insertData) {
      console.error(insertError);
      toast.error('Errore nella creazione annuncio');
      return;
    }

    const prodottoId = insertData.id;

    // 2. Carica immagini nella cartella marketplace/[prodotto_id] su bucket 'skoolly'
    const imageUrls: string[] = [];
    for (const img of form.immagini) {
      const filePath = `marketplace/${prodottoId}/${Date.now()}-${img.name}`;
      const { data, error } = await supabase.storage
        .from('skoolly')
        .upload(filePath, img);

      if (error) {
        console.error(error);
        toast.error('Errore nel caricamento immagine: ' + img.name);
        continue;
      } else {
        imageUrls.push(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/skoolly/${filePath}`
        );
      }
    }

    // 3. Aggiorna prodotto con gli URL delle immagini
    const { error: updateError } = await supabase
      .from('prodotti')
      .update({
        immagini: imageUrls,
      })
      .eq('id', prodottoId);

    if (updateError) {
      console.error(updateError);
      toast.error("Errore nell'aggiornamento delle immagini");
    } else {
      setProducts([...products, { ...insertData, immagini: imageUrls }]);
      setOpenNew(false);
      setForm({ nome: '', descrizione: '', prezzo: '', numero_telefono: '', immagini: [] });
    }
  }

    const myProducts = products.filter((p) => p.creato_da === user?.id);
    
async function updateProduct(updated: Product) {
  if (!user) return toast.error('Devi essere loggato');
  
  const { error } = await supabase
    .from('prodotti')
    .update({
      nome: updated.nome,
      descrizione: updated.descrizione,
      prezzo: updated.prezzo,
      numero_telefono: updated.numero_telefono,
      // immagini per semplicità non modificate qui
    })
    .eq('id', updated.id);

  if (error) {
    toast.error('Errore nell\'aggiornamento dell\'annuncio');
    console.error(error);
    return;
  }

  setProducts((old) =>
    old.map((p) => (p.id === updated.id ? updated : p))
  );
  setEditingProduct(null);
}

async function deleteProduct(id: number) {
  if (!confirm('Sei sicuro di voler eliminare questo annuncio?')) return;

  const { error } = await supabase
    .from('prodotti')
    .delete()
    .eq('id', id);

  if (error) {
    toast.error('Errore nell\'eliminazione');
    console.error(error);
    return;
  }

  setProducts((old) => old.filter((p) => p.id !== id));
}


  // Filtro prodotti per ricerca
  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);

  // Seleziona solo i prodotti da mostrare nella pagina corrente
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Funzioni per cambiare pagina
  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  function prevImage(productId: number) {
    setCarouselIndex((old) => {
      const current = old[productId] ?? 0;
      const total = products.find((p) => p.id === productId)?.immagini.length ?? 1;
      const newIndex = (current - 1 + total) % total;
      return { ...old, [productId]: newIndex };
    });
  }

  function nextImage(productId: number) {
    setCarouselIndex((old) => {
      const current = old[productId] ?? 0;
      const total = products.find((p) => p.id === productId)?.immagini.length ?? 1;
      const newIndex = (current + 1) % total;
      return { ...old, [productId]: newIndex };
    });
  }

  function whatsappLink(phone: string, productName: string) {
    // Rimuove spazi, + e altri simboli, lascia solo numeri (meglio fare un parsing più robusto in futuro)
    const cleanNumber = phone.replace(/[^\d]/g, '');
    const text = encodeURIComponent(`Ciao! Sono interessato al prodotto "${productName}"`);
    return `https://wa.me/${cleanNumber}?text=${text}`;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Marketplace</h1>

        <Input
          type="search"
          placeholder="Cerca prodotto..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-2">
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>+ Nuovo annuncio</Button>
            </DialogTrigger>
            <DialogContent className="space-y-4 max-w-lg">
              <DialogHeader>
                <DialogTitle>Crea un nuovo annuncio</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Nome prodotto"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
              <Textarea
                placeholder="Descrizione"
                value={form.descrizione}
                onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Prezzo"
                value={form.prezzo}
                onChange={(e) => setForm({ ...form, prezzo: e.target.value })}
              />
              <Input
                type="tel"
                placeholder="Telefono"
                value={form.numero_telefono}
                onChange={(e) => setForm({ ...form, numero_telefono: e.target.value })}
              />
              <Input
  type="file"
  multiple
  accept="image/*"
  onChange={(e) =>
    setForm({ ...form, immagini: Array.from(e.target.files || []) })
  }
/>

              <Button onClick={createProduct}>Pubblica</Button>
            </DialogContent>
          </Dialog>

          <Dialog open={openMyAds} onOpenChange={setOpenMyAds}>
  <DialogTrigger asChild>
    <Button variant="outline">I miei annunci</Button>
  </DialogTrigger>
  <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto space-y-4">
    <DialogHeader>
      <DialogTitle>Gestione annunci</DialogTitle>
    </DialogHeader>
    {myProducts.length === 0 && <p>Nessun annuncio creato.</p>}
    {myProducts.map((p) => {
      const mainImage = p.immagini[0] || null;

      return (
        <div
          key={p.id}
          className="flex gap-4 border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          {/* Immagine principale */}
          <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={p.nome}
                width={96}
                height={96}
                className="object-cover"
                priority
              />
            ) : (
              <span className="text-gray-400 text-xs">Nessuna immagine</span>
            )}
          </div>

          <div className="flex flex-col flex-grow">
            {editingProduct?.id === p.id ? (
              <>
                <Input
                  className="mb-2"
                  value={editingProduct.nome}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nome: e.target.value })
                  }
                  placeholder="Nome prodotto"
                />
                <Textarea
                  className="mb-2"
                  value={editingProduct.descrizione}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descrizione: e.target.value })
                  }
                  placeholder="Descrizione"
                  rows={3}
                />
                <Input
                  className="mb-2"
                  type="number"
                  value={editingProduct.prezzo}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      prezzo: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Prezzo"
                />
                <Input
                  className="mb-4"
                  type="tel"
                  value={editingProduct.numero_telefono}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, numero_telefono: e.target.value })
                  }
                  placeholder="Numero di telefono"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateProduct(editingProduct)}>
                    Salva
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>
                    Annulla
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-lg">{p.nome}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-1">{p.descrizione}</p>
                <div className="flex items-center gap-4 text-gray-700 text-sm mb-3">
                  <span className="font-semibold text-green-700">{p.prezzo.toFixed(2)} €</span>
                  <span className="flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-9 8v-6m0 6l-6-4m6 4l6-4"
                      />
                    </svg>
                    {p.numero_telefono}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setEditingProduct(p)}>
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteProduct(p.id)}
                  >
                    Elimina
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    })}
  </DialogContent>
</Dialog>

        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedProducts.map((prodotto) => {
          const currentIndex = carouselIndex[prodotto.id] ?? 0;
          const immaginiCount = prodotto.immagini.length;

          return (
            <Card key={prodotto.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{prodotto.nome}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                {immaginiCount > 0 ? (
                  <div className="relative w-full h-48 mb-4 rounded-md overflow-hidden select-none">
                    <Image
                      src={prodotto.immagini[currentIndex]}
                      alt={`${prodotto.nome} immagine ${currentIndex + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      priority={currentIndex === 0}
                    />
                    {immaginiCount > 1 && (
                      <>
                        <button
                          onClick={() => prevImage(prodotto.id)}
                          className="absolute top-1/2 -translate-y-1/2 left-1 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition"
                          aria-label="Immagine precedente"
                          type="button"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => nextImage(prodotto.id)}
                          className="absolute top-1/2 -translate-y-1/2 right-1 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75 transition"
                          aria-label="Immagine successiva"
                          type="button"
                        >
                          ›
                        </button>
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-50 text-white text-xs px-2 rounded">
                          {currentIndex + 1} / {immaginiCount}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 mb-4 flex items-center justify-center bg-gray-200 rounded-md text-gray-500 text-sm">
                    Nessuna immagine
                  </div>
                )}

                <p className="text-sm text-gray-600 line-clamp-3 flex-grow">{prodotto.descrizione}</p>
                <p className="font-semibold mt-2">{prodotto.prezzo.toFixed(2)} €</p>

                <Button
                  variant="outline"
                  className="mt-4 bg-green-500 text-white hover:bg-green-600"
                  onClick={() => window.open(whatsappLink(prodotto.numero_telefono, prodotto.nome), '_blank')}
                  aria-label={`Contatta ${prodotto.nome} su WhatsApp`}
                >
                  Contatta su WhatsApp
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
       <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => goToPage(currentPage - 1)}
        >
          Precedente
        </Button>

        {[...Array(totalPages)].map((_, i) => (
          <Button
            key={i}
            variant={currentPage === i + 1 ? 'default' : 'outline'}
            onClick={() => goToPage(i + 1)}
          >
            {i + 1}
          </Button>
        ))}

        <Button
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => goToPage(currentPage + 1)}
        >
          Successiva
        </Button>
      </div>
    </div>
  );
}
