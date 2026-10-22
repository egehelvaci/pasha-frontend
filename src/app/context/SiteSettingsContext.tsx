'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getSiteSettings, PublicSiteSettings, SiteBanner } from '../../services/api';

interface SiteSettingsContextType {
  hideBalance: boolean;
  hideStock: boolean;
  banners: SiteBanner[];
  // Ayarlar yüklenmeden bakiye/stok alanları render edilmemeli; aksi halde
  // gizlenmesi gereken alan kısa süreliğine görünür.
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSiteSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: PublicSiteSettings = {
  hideBalance: false,
  hideStock: false,
  banners: [],
};

const RETRY_DELAY_MS = 15000;

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
};

interface SiteSettingsProviderProps {
  children: ReactNode;
}

export const SiteSettingsProvider: React.FC<SiteSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSiteSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const requestRef = useRef<AbortController | null>(null);
  const lastSuccessRef = useRef(0);
  const failuresRef = useRef(0);

  const fetchSettings = useCallback(async (force = true) => {
    if (requestRef.current || (!force && Date.now() - lastSuccessRef.current < 30000)) return;
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setIsLoading(true);
    try {
      const data = await getSiteSettings(controller.signal);
      if (!isMountedRef.current || requestRef.current !== controller) return;
      lastSuccessRef.current = Date.now();
      failuresRef.current = 0;
      setSettings({
        hideBalance: Boolean(data?.hideBalance),
        hideStock: Boolean(data?.hideStock),
        banners: Array.isArray(data?.banners) ? data.banners : [],
      });
      setIsLoaded(true);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current || requestRef.current !== controller) return;
      // Hata durumunda son başarılı ayar korunur, kısa süre sonra tekrar denenir.
      // Hiç başarılı yanıt alınmadıysa varsayılanlarla devam edilir: bu bayraklar
      // erişim yetkisi değil görünürlük tercihidir, servis erişilemezken alanların
      // kalıcı olarak kaybolmaması gerekir.
      setIsLoaded(true);
      setError(err instanceof Error ? err.message : 'Site ayarları alınamadı');
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) fetchSettings();
      }, Math.min(RETRY_DELAY_MS * 2 ** Math.min(failuresRef.current++, 3), 120000));
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (isMountedRef.current) setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSettings();

    return () => {
      isMountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchSettings]);

  // Servis WebSocket bildirimi göndermiyor; başka oturumlarda yapılan
  // değişiklikler sekmeye geri dönüldüğünde alınır.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) fetchSettings(false);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) fetchSettings(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchSettings]);

  return (
    <SiteSettingsContext.Provider
      value={{
        hideBalance: settings.hideBalance,
        hideStock: settings.hideStock,
        banners: settings.banners,
        isLoaded,
        isLoading,
        error,
        refreshSiteSettings: fetchSettings,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
};
