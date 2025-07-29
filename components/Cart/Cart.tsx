"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";
import { Button } from  "@/components/ui/button";

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useCart();

  if (cartItems.length === 0) {
    return <div className="p-4 text-center text-gray-500">Il carrello è vuoto.</div>;
  }

  const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Carrello</h2>
      <ul className="divide-y divide-gray-200">
        {cartItems.map((item, idx) => (
          <li key={idx} className="flex items-center gap-4 py-2">
            <Image src={item.imageUrl} alt={item.productName} width={60} height={60} className="rounded" />
            <div className="flex-1">
              <div className="font-semibold">{item.productName}</div>
              <div className="text-sm text-gray-600">
                Colore: {item.selectedColor || "Nessuno"}<br />
                Taglia: {item.selectedSize || "Nessuna"}<br />
                Quantità: {item.quantity}
              </div>
            </div>
            <div className="text-right font-semibold">€{(item.price * item.quantity).toFixed(2)}</div>
            <Button
  variant="ghost"
  size="sm"
  onClick={() => removeFromCart(item.productId, item.selectedColor, item.selectedSize)}
>
  ×
</Button>
          </li>
        ))}
      </ul>
      <div className="mt-4 text-right font-bold text-lg">
        Totale: €{total.toFixed(2)}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={clearCart}>Svuota Carrello</Button>
        <Button>Vai al Checkout</Button>
      </div>
    </div>
  );
}
