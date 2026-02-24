import React, { createContext, useContext, useState, useEffect } from "react";

interface Gig {
  id: string;
  title: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  description: string;
  /** When set, used for cart total (otherwise 8% of budget midpoint, $3–$49). */
  calculated_price_cents?: number | null;
}

interface CartContextType {
  cartItems: Gig[];
  addToCart: (gig: Gig) => void;
  removeFromCart: (gigId: string) => void;
  /** Remove all cart items that are in the given set of gig IDs (e.g. already purchased). */
  removePurchasedFromCart: (purchasedGigIds: string[]) => void;
  clearCart: () => void;
  isInCart: (gigId: string) => boolean;
  cartCount: number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

import { getLeadPriceDollars } from "@/lib/leadPrice";

const calculateLeadPrice = (gig: Gig): number => {
  return getLeadPriceDollars(gig.budget_min, gig.budget_max, gig.calculated_price_cents);
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<Gig[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("gigCart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("gigCart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (gig: Gig) => {
    setCartItems((prev) => {
      if (prev.some((item) => item.id === gig.id)) {
        return prev;
      }
      return [...prev, gig];
    });
  };

  const removeFromCart = (gigId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== gigId));
  };

  const removePurchasedFromCart = (purchasedGigIds: string[]) => {
    if (purchasedGigIds.length === 0) return;
    const set = new Set(purchasedGigIds);
    setCartItems((prev) => prev.filter((item) => !set.has(item.id)));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("gigCart");
  };

  const isInCart = (gigId: string) => {
    return cartItems.some((item) => item.id === gigId);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, gig) => {
      return sum + calculateLeadPrice(gig);
    }, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        removePurchasedFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
