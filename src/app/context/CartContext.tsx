'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  const userId = user?.userId;
  const requestRef = useRef<AbortController | null>(null);

  const fetchCartData = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (!token || !userId) {
      setCartItems(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/cart`, {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (controller.signal.aborted) return;
      if (response.ok) {
        const data = await response.json();
        if (controller.signal.aborted) return;
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
      if (controller.signal.aborted) return;
      console.error('Sepet verisi alınamadı:', error);
      setCartItems(0);
    } finally {
      if (requestRef.current === controller) setIsLoading(false);
    }
  }, [token, userId]);

  const refreshCart = fetchCartData;

  // Kullanıcı değiştiğinde sepeti yenile
  useEffect(() => {
    fetchCartData();
    return () => requestRef.current?.abort();
  }, [fetchCartData]);

  // Sayfa görünürlüğü değiştiğinde sepeti yenile (kullanıcı başka sekmeden döndüğünde)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine && userId && token) {
        fetchCartData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, token, fetchCartData]);

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
