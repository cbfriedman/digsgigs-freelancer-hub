import React, { createContext, useContext, useState, useEffect } from "react";

interface Gig {
  id: string;
  title: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  description: string;
}

interface CartContextType {
  cartItems: Gig[];
  addToCart: (gig: Gig) => void;
  removeFromCart: (gigId: string) => void;
  clearCart: () => void;
  isInCart: (gigId: string) => boolean;
  cartCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

const calculateLeadPrice = (gig: Gig): number => {
  // For lead packages, budget_min already contains the total calculated price
  if (gig.location === "Lead Package") {
    return gig.budget_min || 0;
  }
  // For gig leads, calculate based on budget
  const budgetMin = gig.budget_min;
  if (!budgetMin || budgetMin === 0) return 50;
  return Math.max(50, budgetMin * 0.005);
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

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("gigCart");
  };

  const isInCart = (gigId: string) => {
    return cartItems.some((item) => item.id === gigId);
  };

  const totalPrice = cartItems.reduce((sum, gig) => {
    return sum + calculateLeadPrice(gig);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
