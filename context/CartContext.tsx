"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  selectedColor: string | null;
  selectedSize: string | null;
  quantity: number;
  price: number;
  imageUrl: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, selectedColor: string | null, selectedSize: string | null) => void;
  clearCart: () => void;
}


const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCartItems((prevItems) => {
      // Se l'item esiste già con stesso prodotto+colore+taglia, aumenta la quantità
      const existingIndex = prevItems.findIndex(
        (i) =>
          i.productId === item.productId &&
          i.selectedColor === item.selectedColor &&
          i.selectedSize === item.selectedSize
      );

      if (existingIndex !== -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingIndex].quantity += item.quantity;
        return updatedItems;
      }

      return [...prevItems, item];
    });
  };

function removeFromCart(productId: string, selectedColor: string | null, selectedSize: string | null) {
  setCartItems(prevItems => {
    return prevItems.reduce((acc, item) => {
      if (
        item.productId === productId &&
        item.selectedColor === selectedColor &&
        item.selectedSize === selectedSize
      ) {
        const newQuantity = item.quantity - 1;
        if (newQuantity > 0) {
          acc.push({ ...item, quantity: newQuantity });
        }
        // se newQuantity === 0, non aggiungo l'item (rimosso)
      } else {
        acc.push(item);
      }
      return acc;
    }, [] as CartItem[]);
  });
}



  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
