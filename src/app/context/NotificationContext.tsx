"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { 
  Notification, 
  getUserNotifications, 
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead 
} from '@/services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
  };
  fetchNotifications: (page?: number, append?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  refreshNotifications: () => Promise<void>;
  loadMore: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    hasMore: false
  });
  
  // API çağrılarını takip etmek için ref'ler
  const lastFetchTime = useRef<number>(0);
  const lastUnreadCountFetch = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);
  const unreadCountFetchingRef = useRef<boolean>(false);
  
  // Minimum bekleme süreleri (ms)
  const FETCH_COOLDOWN = 30000; // 30 saniye
  const UNREAD_COUNT_COOLDOWN = 10000; // 10 saniye
  const NOTIFICATIONS_PER_PAGE = 10; // Sayfa başına bildirim sayısı

  // Bildirimleri getir (pagination desteği ile)
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user?.userId || authLoading || fetchingRef.current) {
      return;
    }
    
    const now = Date.now();
    if (!append && now - lastFetchTime.current < FETCH_COOLDOWN) {
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    if (!append) lastFetchTime.current = now;
    
    
    try {
      const response = await getUserNotifications(user.userId, { 
        page, 
        limit: NOTIFICATIONS_PER_PAGE 
      });
      
      if (append) {
        setNotifications(prev => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }
      
      setPagination({
        currentPage: response.pagination.page,
        totalPages: response.pagination.totalPages,
        total: response.pagination.total,
        hasMore: response.pagination.page < response.pagination.totalPages
      });
      
    } catch (err: any) {
      setError(err.message || 'Bildirimler alınamadı');
      console.error('❌ Bildirimler getirme hatası:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.userId, authLoading]);

  // Okunmamış bildirim sayısını getir (cooldown ile)
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.userId || authLoading || unreadCountFetchingRef.current) {
      return;
    }
    
    const now = Date.now();
    if (now - lastUnreadCountFetch.current < UNREAD_COUNT_COOLDOWN) {
      return;
    }
    
    unreadCountFetchingRef.current = true;
    lastUnreadCountFetch.current = now;
    
    
    try {
      const count = await getUnreadNotificationCount(user.userId);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('❌ Okunmamış bildirim sayısı getirme hatası:', err);
    } finally {
      unreadCountFetchingRef.current = false;
    }
  }, [user?.userId, authLoading]);

  // Tek bildirimi okundu işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      
      // Okunmamış sayıyı lokal olarak azalt
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (err: any) {
      setError(err.message || 'Bildirim okundu işaretlenemedi');
      console.error('❌ Bildirim okundu işaretleme hatası:', err);
    }
  }, []);

  // Tüm bildirimleri okundu işaretle
  const markAllAsRead = useCallback(async () => {
    if (!user?.userId) return;
    
    try {
      await markAllNotificationsAsRead(user.userId);
      
      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      
    } catch (err: any) {
      setError(err.message || 'Tüm bildirimler okundu işaretlenemedi');
      console.error('❌ Tüm bildirimleri okundu işaretleme hatası:', err);
    }
  }, [user?.userId]);

  // Yeni bildirim ekle (WebSocket veya server-sent events için)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Daha fazla yükle (infinite scroll için)
  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || loading) return;
    
    await fetchNotifications(pagination.currentPage + 1, true);
  }, [fetchNotifications, pagination.hasMore, pagination.currentPage, loading]);

  // Belirli sayfaya git
  const goToPage = useCallback(async (page: number) => {
    if (page < 1 || page > pagination.totalPages || loading) return;
    
    await fetchNotifications(page, false);
  }, [fetchNotifications, pagination.totalPages, loading]);

  // Bildirimleri yenile (manuel)
  const refreshNotifications = useCallback(async () => {
    // Reset cooldown for manual refresh
    lastFetchTime.current = 0;
    lastUnreadCountFetch.current = 0;
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    await Promise.all([fetchNotifications(1, false), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // İlk yüklemede veri çek (sadece bir kez)
  useEffect(() => {
    if (user?.userId && !authLoading) {
      fetchUnreadCount(); // Sadece okunmamış sayıyı al, bildirimler lazy load
    }
  }, [user?.userId, authLoading, fetchUnreadCount]);

  // Periyodik olarak okunmamış sayıyı güncelle (60 saniyede bir)
  useEffect(() => {
    if (!user?.userId || authLoading) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60 * 1000); // 60 saniye

    return () => {
      clearInterval(interval);
    };
  }, [user?.userId, authLoading, fetchUnreadCount]);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo<NotificationContextType>(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications,
    loadMore,
    goToPage
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications,
    loadMore,
    goToPage
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};