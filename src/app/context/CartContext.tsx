'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItems: number;
  refreshCart: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const { token, user } = useAuth();

  const fetchCartData = async () => {
    if (!token || !user) {
      setCartItems(0);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/cart`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Ürün çeşidi sayısını göster (toplam adet değil)
          setCartItems(data.data.items?.length || 0);
        } else {
          setCartItems(0);
        }
      } else {
        setCartItems(0);
      }
    } catch (error) {
      console.error('Sepet verisi alınamadı:', error);
      setCartItems(0);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    await fetchCartData();
  };

  // Kullanıcı değiştiğinde sepeti yenile
  useEffect(() => {
    if (user && token) {
      fetchCartData();
    } else {
      setCartItems(0);
    }
  }, [user, token]);

  // Sayfa görünürlüğü değiştiğinde sepeti yenile (kullanıcı başka sekmeden döndüğünde)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && token) {
        fetchCartData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, token]);

  const value: CartContextType = {
    cartItems,
    refreshCart,
    isLoading
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
