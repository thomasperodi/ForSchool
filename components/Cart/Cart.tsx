"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);

  if (cartItems.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 bg-white shadow rounded max-w-md mx-auto mt-10">
        🛒 Il carrello è vuoto.
      </div>
    );
  }

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const siteFee = 1 // 5% di commissione, minimo 1€
  const total = subtotal + siteFee;

  const handleCheckout = async () => {
    setLoading(true);
    try {
        const utenteId= await supabase.auth.getUser().then(res => res.data.user?.id);
    
      const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cartItems.map(item => ({
          priceId: item.stripePriceId, // 👈 usiamo Stripe Price
          quantity: item.quantity,
        })),
        userId: utenteId,
      }),
    });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect a Stripe Checkout
      }
    } catch (err) {
      console.error("Errore nel checkout:", err);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-2xl shadow-lg mt-10 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">🛒 Il tuo Carrello</h2>

      <ul className="divide-y divide-gray-200">
        {cartItems.map((item, idx) => (
          <li key={idx} className="flex items-center gap-4 py-3">
            <Image
              src={item.imageUrl}
              alt={item.productName}
              width={70}
              height={70}
              className="rounded-lg object-cover"
              loading="lazy"
            />
            <div className="flex-1">
              <div className="font-semibold text-gray-800">{item.productName}</div>
              <div className="text-sm text-gray-500">
                Colore: {item.selectedColor || "Nessuno"} <br />
                Taglia: {item.selectedSize || "Nessuna"} <br />
                Quantità: {item.quantity}
              </div>
            </div>
            <div className="text-right font-semibold text-gray-800">
              €{(item.price * item.quantity).toFixed(2)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => removeFromCart(item.productId, item.selectedColor, item.selectedSize)}
            >
              ×
            </Button>
          </li>
        ))}
      </ul>

      <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-gray-700">
        <div className="flex justify-between">
          <span>Subtotale</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Commissioni sito</span>
          <span>€{siteFee.toFixed(2)}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold text-lg text-gray-800">
          <span>Totale</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={clearCart}>Svuota</Button>
        <Button disabled={loading} onClick={handleCheckout}>
          {loading ? "Reindirizzamento..." : "Vai al Checkout"}
        </Button>
      </div>
    </div>
  );
}
