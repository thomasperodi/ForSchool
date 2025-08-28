// components/FloatingCartButton.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { useCart } from "@/context/CartContext";

export default function FloatingCartButton() {
  const { cartItems } = useCart();
  const totalCartItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  return (
    <div className="fixed bottom-4 right-4 z-20 bg-gray-100 rounded-full p-2 shadow-lg">
      <Link href="/merchandising/cart" passHref>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-6 w-6" />
          {totalCartItems > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0 rounded-full text-xs">
              {totalCartItems}
            </Badge>
          )}
        </Button>
      </Link>
    </div>
  );
}