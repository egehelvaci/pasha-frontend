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

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSiteSettings();
      if (!isMountedRef.current) return;
      setSettings({
        hideBalance: Boolean(data?.hideBalance),
        hideStock: Boolean(data?.hideStock),
        banners: Array.isArray(data?.banners) ? data.banners : [],
      });
      setIsLoaded(true);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      // Hata durumunda son başarılı ayar korunur, kısa süre sonra tekrar denenir.
      // Hiç başarılı yanıt alınmadıysa varsayılanlarla devam edilir: bu bayraklar
      // erişim yetkisi değil görünürlük tercihidir, servis erişilemezken alanların
      // kalıcı olarak kaybolmaması gerekir.
      setIsLoaded(true);
      setError(err instanceof Error ? err.message : 'Site ayarları alınamadı');
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        fetchSettings();
      }, RETRY_DELAY_MS);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSettings();

    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [fetchSettings]);

  // Servis WebSocket bildirimi göndermiyor; başka oturumlarda yapılan
  // değişiklikler sekmeye geri dönüldüğünde alınır.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      fetchSettings();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchSettings();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
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
