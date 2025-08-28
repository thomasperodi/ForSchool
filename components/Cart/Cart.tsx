"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-lg max-w-md mx-auto mt-20 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.182 1.701.705 1.701H17m0-14a2 2 0 110 4 2 2 0 010-4zm-7 0a2 2 0 110 4 2 2 0 010-4zm-2 15.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-600">
          Il tuo carrello è vuoto
        </h2>
        <p className="mt-2 text-sm text-gray-400">
          Aggiungi un articolo per iniziare.
        </p>
        <div className="mt-6">
          <Link
          href="/merchandising">
            <Button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Vai al Merchandising
          </Button>
          </Link>
          
          </div>
      </div>
    );
  }

  // Calculation of costs
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  // Example of a dynamic fee (e.g., 5% with a minimum of 1€)
  // const siteFee = Math.max(1, subtotal * 0.05);
  const total = subtotal;

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            priceId: item.stripePriceId,
            quantity: item.quantity,
          })),
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Errore nel checkout:", err);
      setLoading(false);
    }
  };

  return (
<div className="p-6 max-w-xl mx-auto bg-white rounded-3xl shadow-xl mt-12 space-y-8">
  <h2 className="text-3xl font-extrabold text-gray-900 text-center">
    Il tuo Carrello
  </h2>

  {/* Lista prodotti */}
  <div className="divide-y divide-gray-100">
    {cartItems.map((item, idx) => (
      <div
        key={idx}
        className="flex flex-col sm:flex-row items-center gap-4 py-4 hover:bg-gray-50 transition rounded-xl p-2"
      >
        <Image
          src={item.imageUrl}
          alt={item.productName}
          width={120}
          height={120}
          className="rounded-2xl object-cover shadow-sm"
          loading="lazy"
        />

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center w-full">
          <div>
            <div className="font-bold text-lg text-gray-800">{item.productName}</div>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
              {item.selectedColor && <span className="px-2 py-0.5 rounded bg-gray-100">{`Colore: ${item.selectedColor}`}</span>}
              {item.selectedSize && <span className="px-2 py-0.5 rounded bg-gray-100">{`Taglia: ${item.selectedSize}`}</span>}
              <span className="px-2 py-0.5 rounded bg-gray-50 font-medium">{`Qty: ${item.quantity}`}</span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
            <span className="font-semibold text-lg text-gray-800">
              €{(item.price * item.quantity).toFixed(2)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:bg-red-100 hover:text-red-500"
              onClick={() =>
                removeFromCart(item.productId, item.selectedColor, item.selectedSize)
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* Totale */}
  <div className="bg-gray-50 rounded-2xl p-6 space-y-3 text-gray-700 shadow-inner">
    <div className="flex justify-between items-center text-sm">
      <span>Subtotale</span>
      <span className="font-medium text-gray-800">€{subtotal.toFixed(2)}</span>
    </div>
    <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center font-bold text-xl text-gray-900">
      <span>Totale</span>
      <span>€{total.toFixed(2)}</span>
    </div>
  </div>

  {/* Azioni */}
  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
    <Button
      variant="outline"
      onClick={clearCart}
      className="w-full sm:w-auto text-gray-600 border-gray-300 hover:bg-gray-100"
    >
      Svuota
    </Button>
    <Button
      disabled={loading}
      onClick={handleCheckout}
      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold"
    >
      {loading ? "Reindirizzamento..." : "Vai al Checkout"}
    </Button>
  </div>

  {/* Bottone ritorno al merch */}
  <div className="text-center mt-6">
    <Link href="/merchandising">
      <Button variant="ghost" className="text-teal-600 hover:text-teal-700">
        ← Continua a comprare
      </Button>
    </Link>
  </div>
</div>

  );
}