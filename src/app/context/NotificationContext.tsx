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
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  refreshNotifications: () => Promise<void>;
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
  
  // API çağrılarını takip etmek için ref'ler
  const lastFetchTime = useRef<number>(0);
  const lastUnreadCountFetch = useRef<number>(0);
  const fetchingRef = useRef<boolean>(false);
  const unreadCountFetchingRef = useRef<boolean>(false);
  
  // Minimum bekleme süreleri (ms)
  const FETCH_COOLDOWN = 30000; // 30 saniye
  const UNREAD_COUNT_COOLDOWN = 60000; // 1 dakika

  // Bildirimleri getir (cooldown ile)
  const fetchNotifications = useCallback(async () => {
    if (!user?.userId || authLoading || fetchingRef.current) {
      console.log('🔄 fetchNotifications skipped:', { userId: !!user?.userId, authLoading, fetching: fetchingRef.current });
      return;
    }
    
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      console.log('⏰ fetchNotifications cooldown active, remaining:', Math.round((FETCH_COOLDOWN - (now - lastFetchTime.current)) / 1000), 'seconds');
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    lastFetchTime.current = now;
    
    console.log('📥 Fetching notifications...');
    
    try {
      const response = await getUserNotifications(user.userId, { limit: 50 });
      setNotifications(response.data);
      console.log('✅ Notifications fetched:', response.data.length);
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
      console.log('🔄 fetchUnreadCount skipped:', { userId: !!user?.userId, authLoading, fetching: unreadCountFetchingRef.current });
      return;
    }
    
    const now = Date.now();
    if (now - lastUnreadCountFetch.current < UNREAD_COUNT_COOLDOWN) {
      console.log('⏰ fetchUnreadCount cooldown active, remaining:', Math.round((UNREAD_COUNT_COOLDOWN - (now - lastUnreadCountFetch.current)) / 1000), 'seconds');
      return;
    }
    
    unreadCountFetchingRef.current = true;
    lastUnreadCountFetch.current = now;
    
    console.log('🔢 Fetching unread count...');
    
    try {
      const count = await getUnreadNotificationCount(user.userId);
      setUnreadCount(count);
      console.log('✅ Unread count fetched:', count);
    } catch (err: any) {
      console.error('❌ Okunmamış bildirim sayısı getirme hatası:', err);
    } finally {
      unreadCountFetchingRef.current = false;
    }
  }, [user?.userId, authLoading]);

  // Tek bildirimi okundu işaretle
  const markAsRead = useCallback(async (notificationId: string) => {
    console.log('✓ Marking notification as read:', notificationId);
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
      
      console.log('✅ Notification marked as read');
    } catch (err: any) {
      setError(err.message || 'Bildirim okundu işaretlenemedi');
      console.error('❌ Bildirim okundu işaretleme hatası:', err);
    }
  }, []);

  // Tüm bildirimleri okundu işaretle
  const markAllAsRead = useCallback(async () => {
    if (!user?.userId) return;
    
    console.log('✓ Marking all notifications as read');
    try {
      await markAllNotificationsAsRead(user.userId);
      
      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      
      console.log('✅ All notifications marked as read');
    } catch (err: any) {
      setError(err.message || 'Tüm bildirimler okundu işaretlenemedi');
      console.error('❌ Tüm bildirimleri okundu işaretleme hatası:', err);
    }
  }, [user?.userId]);

  // Yeni bildirim ekle (WebSocket veya server-sent events için)
  const addNotification = useCallback((notification: Notification) => {
    console.log('➕ Adding new notification:', notification.title);
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Bildirimleri yenile (manuel)
  const refreshNotifications = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    // Reset cooldown for manual refresh
    lastFetchTime.current = 0;
    lastUnreadCountFetch.current = 0;
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  // İlk yüklemede veri çek (sadece bir kez)
  useEffect(() => {
    if (user?.userId && !authLoading) {
      console.log('🚀 Initial notification setup for user:', user.userId);
      fetchUnreadCount(); // Sadece okunmamış sayıyı al, bildirimler lazy load
    }
  }, [user?.userId, authLoading, fetchUnreadCount]);

  // Periyodik olarak okunmamış sayıyı güncelle (10 dakikada bir, daha seyrek)
  useEffect(() => {
    if (!user?.userId || authLoading) return;

    console.log('⏲️ Setting up periodic unread count check (10 minutes)');
    const interval = setInterval(() => {
      console.log('⏰ Periodic unread count check triggered');
      fetchUnreadCount();
    }, 10 * 60 * 1000); // 10 dakika (daha seyrek)

    return () => {
      console.log('🛑 Clearing periodic unread count check');
      clearInterval(interval);
    };
  }, [user?.userId, authLoading, fetchUnreadCount]);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo<NotificationContextType>(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    refreshNotifications
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