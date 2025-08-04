'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Component mount edildiğinde çalışır
  useEffect(() => {
    setMounted(true);
    
    // Tarayıcı tercihini kontrol et
    if (typeof window !== 'undefined') {
      // Önce localStorage'dan kontrol et
      const savedTheme = localStorage.getItem('theme') as Theme;
      
      if (savedTheme) {
        setThemeState(savedTheme);
      } else {
        // Eğer kaydedilmiş tema yoksa, sistem tercihini kontrol et
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setThemeState(systemPrefersDark ? 'dark' : 'light');
      }
    }
  }, []);

  // Tema değiştiğinde DOM'u güncelle ve localStorage'a kaydet
  useEffect(() => {
    if (!mounted) return;

    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      
      // Önceki tema class'larını temizle
      root.classList.remove('light', 'dark');
      
      // Yeni tema class'ını ekle
      root.classList.add(theme);
      
      // localStorage'a kaydet
      localStorage.setItem('theme', theme);
      
      // Meta theme-color'u güncelle
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#1f2937' : '#ffffff');
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  // Hydration mismatch'i önlemek için ilk render'da tema bilgisini gösterme
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {}, setTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}