import React, { createContext, useContext, useState, useEffect } from "react";

interface Gig {
  id: string;
  title: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  description: string;
  exclusivity_type?: 'non-exclusive' | 'semi-exclusive' | 'exclusive';
}

interface CartContextType {
  cartItems: Gig[];
  addToCart: (gig: Gig, exclusivityType?: 'non-exclusive' | 'semi-exclusive' | 'exclusive') => void;
  removeFromCart: (gigId: string) => void;
  clearCart: () => void;
  isInCart: (gigId: string) => boolean;
  cartCount: number;
  updateExclusivity: (gigId: string, exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive') => void;
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

// Import pricing from centralized config
import { INDUSTRY_PRICING } from '@/config/pricing';

// Determine industry category based on gig title/description (simplified)
const determineIndustryCategory = (gig: Gig): 'low-value' | 'mid-value' | 'high-value' => {
  const searchText = `${gig.title} ${gig.description}`.toLowerCase();
  
  // Check each pricing category for keyword matches
  for (const pricing of INDUSTRY_PRICING) {
    for (const industry of pricing.industries) {
      if (searchText.includes(industry.toLowerCase())) {
        return pricing.category;
      }
    }
  }
  
  // Default to mid-value if no match found
  return 'mid-value';
};

const calculateLeadPrice = (gig: Gig): number => {
  const category = determineIndustryCategory(gig);
  const pricing = INDUSTRY_PRICING.find(p => p.category === category)!;
  const exclusivityType = gig.exclusivity_type || 'non-exclusive';
  
  switch (exclusivityType) {
    case 'non-exclusive':
      return pricing.nonExclusive;
    case 'semi-exclusive':
      return pricing.semiExclusive;
    case 'exclusive':
      return pricing.exclusive24h;
    default:
      return pricing.nonExclusive;
  }
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

  const addToCart = (gig: Gig, exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive' = 'non-exclusive') => {
    setCartItems((prev) => {
      if (prev.some((item) => item.id === gig.id)) {
        return prev;
      }
      return [...prev, { ...gig, exclusivity_type: exclusivityType }];
    });
  };

  const updateExclusivity = (gigId: string, exclusivityType: 'non-exclusive' | 'semi-exclusive' | 'exclusive') => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === gigId ? { ...item, exclusivity_type: exclusivityType } : item
      )
    );
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
        clearCart,
        isInCart,
        cartCount: cartItems.length,
        updateExclusivity,
        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
