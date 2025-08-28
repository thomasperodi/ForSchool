// app/(authed)/merchandising/[productId]/page.tsx
"use client";

import { useState, useEffect, useMemo, use } from "react";
import { getProdottoById, ProdottoWithDetails, Colore } from "@/lib/database-functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import ProductLayout from "@/components/ProductLayout";
import { CartItem, useCart } from "@/context/CartContext";
import Link from "next/link";
import FloatingCartButton from "@/components/Cart/FloatingCartButton";

// Interfaccia per il colore disponibile
interface AvailableColor {
  id: number;
  nome: string;
}

// Interfaccia per una variante formattata per il frontend
interface FormattedProductVariant {
  id: string;
  prodotto_id: string;
  variantId: string; // ID della variante specifica
  colorId: number;
  colorName: string;
  sizeName: string;
  sizeId: number;
  stock: number;
  priceOverride: number | null;
  immagine_url: string | null;
  isBaseProduct: boolean; // Indica se è una taglia del prodotto base o di una variante
  stripe_price_id: string; // 👈 nuovo campo
}

// Interfaccia per lo stato del prodotto nel frontend
interface ProdottoDettaglio {
  id: string;
  name: string;
  description: string;
  price: number;
  images: { url: string; color?: string; variantId?: string }[];
  availableColors: AvailableColor[];
  availableSizes: string[];
  variants: FormattedProductVariant[];
  stock: number;
  baseProductColorName?: string | null;
  stripePriceId: string; // 👈 nuovo campo
}
interface ProductDetailPageProps {
  productId: string;
}

export default function ProductDetailPage({ productId }: ProductDetailPageProps) {


  const [product, setProduct] = useState<ProdottoDettaglio | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addToCart, cartItems } = useCart();
  const [selectedColorName, setSelectedColorName] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const [availableColors, setAvailableColors] = useState<AvailableColor[]>([]);
  // Add availableSizes to state
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [variants, setVariants] = useState<FormattedProductVariant[]>([]);
  const [images, setImages] = useState<{ url: string; color?: string; variantId?: string }[]>([]);

  const totalCartItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const handleAddToCart = () => {
    if (!product) return;

    if (quantity <= 0) {
      toast.error("La quantità deve essere almeno 1.");
      return;
    }

    if (!selectedColorName) {
      toast.error("Seleziona un colore.");
      return;
    }

    if (!selectedSize) {
      toast.error("Seleziona una taglia.");
      return;
    }

    // Trova la variante esatta per colore e taglia selezionati
    const selectedVariant = product.variants.find(v =>
      v.colorName === selectedColorName && v.sizeName === selectedSize
    );

    if (!selectedVariant || availableStock < quantity) {
      toast.error(`Quantità richiesta (${quantity}) supera la disponibilità (${availableStock}).`);
      return;
    }

    const itemToAdd: CartItem = {
      productId: product.id,
      productName: product.name,
      selectedColor: selectedVariant.colorName,
      selectedSize: selectedVariant.sizeName,
      quantity: quantity,
      price: selectedVariant.priceOverride ?? product.price,
      imageUrl: filteredImages[currentImageIndex]?.url || "/placeholder.svg",
      stripePriceId: product.stripePriceId, // 👈 essenzial
    };

    addToCart(itemToAdd);
    toast.success(`${quantity} x "${product.name}" (${itemToAdd.selectedColor}/${itemToAdd.selectedSize}) aggiunto al carrello!`);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      const data = await getProdottoById(productId);
      console.log("[DEBUG] Prodotto ricevuto:", data);
      if (!data) {
        setProduct(null);
        setLoading(false);
        toast.error("Prodotto non trovato!");
        return;
      }

      const allColors = new Map<string, AvailableColor>();
      const allSizesSet = new Set<string>(); // Keep this local for initial processing
      const allImages: { url: string; color?: string; variantId?: string }[] = [];
      const mappedVariants: FormattedProductVariant[] = [];

      // Immagini base
      if (data.immagini && data.immagini.length > 0) {
        data.immagini.forEach(img => {
          const colorName = data.colore?.nome;
          allImages.push({
            url: img.url,
            color: colorName,
            variantId: data.id,
          });
        });
      } else if (data.immagine_url) {
        const colorName = data.colore?.nome;
        allImages.push({
          url: data.immagine_url,
          color: colorName,
          variantId: data.id,
        });
      }

      // Colore base
      if (data.colore) {
        allColors.set(data.colore.nome, {
          id: data.colore.id,
          nome: data.colore.nome,
        });
      }

      // Taglie base
      if (data.taglie && data.taglie.length > 0 && data.colore) {
        data.taglie.forEach(taglia => {
          allSizesSet.add(taglia.nome);

          mappedVariants.push({
            id: `base_${data.id}_${taglia.id}`,
            prodotto_id: data.id,
            variantId: data.id, // base product id
            colorId: data.colore!.id,
            colorName: data.colore!.nome,
            sizeName: taglia.nome,
            sizeId: taglia.id,
            stock: taglia.stock,
            priceOverride: null,
            immagine_url: data.immagine_url,
            isBaseProduct: true,
            stripe_price_id: data.stripe_price_id, // 👈 preso da Supabase
          });
        });
      }

      // Varianti colore
      data.varianti.forEach(variante => {
        if (variante.colore) {
          allColors.set(variante.colore.nome, {
            id: variante.colore.id,
            nome: variante.colore.nome,
          });
        }

        // Immagini variante
        if (variante.immagine_url) {
          allImages.push({
            url: variante.immagine_url,
            color: variante.colore?.nome,
            variantId: variante.id,
          });
        }

        variante.immagini?.forEach(img => {
          allImages.push({
            url: img.url,
            color: variante.colore?.nome,
            variantId: variante.id,
          });
        });

        // Taglie variante
        if (variante.taglie && variante.taglie.length > 0 && variante.colore) {
          variante.taglie.forEach(taglia => {
            allSizesSet.add(taglia.nome);

            mappedVariants.push({
              id: `variant_${variante.id}_${taglia.id}`,
              prodotto_id: data.id,
              variantId: variante.id,
              colorId: variante.colore!.id,
              colorName: variante.colore!.nome,
              sizeName: taglia.nome,
              sizeId: taglia.id,
              stock: taglia.stock,
              priceOverride: variante.prezzo_override ?? null,
              immagine_url: variante.immagine_url,
              isBaseProduct: false,
              stripe_price_id: variante.stripe_price_id, // 👈 preso da Supabase
            });
          });
        }
      });

      if (allImages.length === 0) {
        allImages.push({ url: "/placeholder.svg" });
      }

      setProduct({
        id: data.id,
        name: data.nome,
        description: data.descrizione ?? "",
        price: data.prezzo,
        images: allImages,
        availableColors: Array.from(allColors.values()),
        availableSizes: Array.from(allSizesSet), // Set availableSizes state here
        variants: mappedVariants,
        stock: data.stock ?? 0,
        baseProductColorName: data.colore?.nome ?? null,
        stripePriceId: data.stripe_price_id, // 👈 nuovo campo
      });

      setAvailableColors(Array.from(allColors.values()));
      setAvailableSizes(Array.from(allSizesSet)); // Also update the separate state for direct useì
      setVariants(mappedVariants);
      setImages(allImages);

      // Selezione iniziale colore
      const baseColorName = data.colore?.nome;
      const initialSelectedColorName =
        baseColorName || mappedVariants.find(v => v.stock > 0)?.colorName || null;
      setSelectedColorName(initialSelectedColorName);

      setLoading(false);
    };

    fetchProduct();
  }, [productId]);
// Inside your ProductDetailPage component, after the initial useEffect
useEffect(() => {
  console.log("[DEBUG] availableSizes updated:", availableSizes);
}, [availableSizes]); // This useEffect runs whenever availableSizes changes
  // Ogni volta che cambia il colore selezionato, aggiorna taglie e variante


  const availableStock = useMemo(() => {
    if (!product || !selectedColorName || !selectedSize) return 0;

    const matchingVariant = product.variants.find(v =>
      v.colorName === selectedColorName && v.sizeName === selectedSize
    );

    if (matchingVariant) {
      console.log(`[availableStock] Stock trovato: ${matchingVariant.stock} per ${selectedColorName}/${selectedSize}`);
      return matchingVariant.stock;
    }

    console.log(`[availableStock] Nessuna corrispondenza trovata per ${selectedColorName}/${selectedSize}`);
    return 0;
  }, [product, selectedColorName, selectedSize]);

  const filteredImages = useMemo(() => {
    if (!product) return [];
    if (selectedColorName === null) {
      return product.images;
    }

    const imagesToShow = product.images.filter(img =>
      img.color === selectedColorName || img.color === undefined || img.color === null
    );

    return imagesToShow.length > 0 ? imagesToShow : [{ url: "/placeholder.svg" }];
  }, [product, selectedColorName]);

  const goToPreviousImage = () => {
    if (!filteredImages.length) return;
    setCurrentImageIndex((prevIdx) => (prevIdx - 1 + filteredImages.length) % filteredImages.length);
  };

  const goToNextImage = () => {
    if (!filteredImages.length) return;
    setCurrentImageIndex((prevIdx) => (prevIdx + 1) % filteredImages.length);
  };

  if (loading) {
    return (
      <ProductLayout>
        <div className="p-6 text-center text-lg">Caricamento dettagli prodotto...</div>
      </ProductLayout>
    );
  }

  if (!product) {
    return (
      <ProductLayout>
        <div className="p-6 text-center text-lg text-red-500">Prodotto non disponibile.</div>
      </ProductLayout>
    );
  }

  return (
    <>
      <FloatingCartButton/>
      <ProductLayout>
                

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-6 rounded-lg shadow-lg">
          
          {/* Product Images (Carousel) */}
          <div className="relative flex flex-col items-center justify-center min-h-[400px]">
            <Image
              width={600}
              height={600}
              src={filteredImages[currentImageIndex]?.url || "/placeholder.svg"}
              alt={product.name}
              className="object-contain max-h-[500px] w-full rounded-md shadow-sm"
              loading="lazy"
            />
            {filteredImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                  onClick={goToPreviousImage}
                  aria-label="Immagine precedente"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white z-10"
                  onClick={goToNextImage}
                  aria-label="Immagine successiva"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {filteredImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`block h-2 w-2 rounded-full cursor-pointer transition-all duration-200 ${
                    currentImageIndex === idx ? "bg-teal-500 w-6" : "bg-gray-300"
                  }`}
                  onClick={() => setCurrentImageIndex(idx)}
                ></span>
              ))}
            </div>
          </div>

          {/* Product Details and Options */}
          <div className="flex flex-col gap-6">
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            <div className="text-4xl font-extrabold text-teal-600">
              €{(product.price).toFixed(2)}
            </div>

            {/* Debug Info */}
            

            {/* Color Selection */}
            {product.availableColors.length > 0 && (
              <div>
                <label htmlFor="color-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Colore:
                </label>
                <Select
                  value={selectedColorName || ""}
                  onValueChange={(value) => {
                    setSelectedColorName(value);
                    setCurrentImageIndex(0);
                    setSelectedSize(null); // Reset size when color changes
                    console.log(`[Color Selection] Selected: ${value}`);
                  }}
                >
                  <SelectTrigger id="color-select" className="w-full md:w-auto">
                    <SelectValue placeholder="Seleziona un colore" />
                  </SelectTrigger>
                  <SelectContent>
  {product.availableColors.map((color) => (
    <SelectItem key={color.id} value={color.nome}>
      {color.nome.charAt(0).toUpperCase() + color.nome.slice(1)}
    </SelectItem>
  ))}
</SelectContent>

                </Select>
              </div>
            )}

            {/* Size Selection */}
            {/* Use the `availableSizes` state directly here */}
            {availableSizes.length > 0 && (
              <div className="mt-4">
                <label htmlFor="size-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Taglia:
                </label>
                <Select
                  value={selectedSize ?? ""}
                  onValueChange={(value) => {
                    setSelectedSize(value);
                    console.log(`[Size Selection] Selected: ${value}`);
                  }}
                >
                  <SelectTrigger id="size-select" className="w-full md:w-auto">
                    <SelectValue placeholder="Seleziona una taglia" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes
  .slice() // copia per non mutare l'array originale
  .sort((a, b) => {
    const order = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
    return order.indexOf(a) - order.indexOf(b);
  })
  .map((size) => (
    <SelectItem key={size} value={size}>
      {size}
    </SelectItem>
  ))}

                  </SelectContent>
                </Select>
              </div>
            )}

            

            {/* Quantity */}
            <div>
              <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-2">
                Quantità:
              </label>
              <Input
                id="quantity-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  const maxValue = 999;
                  setQuantity(isNaN(value) || value < 1 ? 1 : Math.min(value, maxValue));
                }}
                className="w-24"
              />
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full flex items-center gap-2 mt-4"
              onClick={handleAddToCart}
              disabled={availableStock === 0 || quantity > availableStock || !selectedColorName || !selectedSize}
            >
              <ShoppingCart className="h-5 w-5" />
              {availableStock === 0 ? "Non disponibile" : "Aggiungi al Carrello"}
            </Button>
            <Link
  href="/merchandising"
  className="mt-3 w-full inline-flex justify-center items-center gap-2 rounded-lg border border-teal-600 bg-white px-4 py-2 text-teal-600 font-medium shadow-sm hover:bg-teal-50 transition-colors"
>
  <ChevronLeft className="h-5 w-5" />
  Torna al Merch
</Link>
            
          </div>

          
        </div>
      </ProductLayout>
    </>
  );
}