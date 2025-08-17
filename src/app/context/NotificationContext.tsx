"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Bildirimleri getir
  const fetchNotifications = async () => {
    if (!user?.userId || authLoading) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await getUserNotifications(user.userId, { limit: 50 });
      setNotifications(response.data);
    } catch (err: any) {
      setError(err.message || 'Bildirimler alınamadı');
      console.error('Bildirimler getirme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  // Okunmamış bildirim sayısını getir
  const fetchUnreadCount = async () => {
    if (!user?.userId || authLoading) return;
    
    try {
      const count = await getUnreadNotificationCount(user.userId);
      setUnreadCount(count);
    } catch (err: any) {
      console.error('Okunmamış bildirim sayısı getirme hatası:', err);
    }
  };

  // Tek bildirimi okundu işaretle
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Local state'i güncelle
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      
      // Okunmamış sayıyı güncelle
      await fetchUnreadCount();
    } catch (err: any) {
      setError(err.message || 'Bildirim okundu işaretlenemedi');
      console.error('Bildirim okundu işaretleme hatası:', err);
    }
  };

  // Tüm bildirimleri okundu işaretle
  const markAllAsRead = async () => {
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
      console.error('Tüm bildirimleri okundu işaretleme hatası:', err);
    }
  };

  // Yeni bildirim ekle (WebSocket veya server-sent events için)
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Bildirimleri yenile
  const refreshNotifications = async () => {
    await Promise.all([fetchNotifications(), fetchUnreadCount()]);
  };

  // İlk yüklemede veri çek
  useEffect(() => {
    if (user?.userId && !authLoading) {
      fetchUnreadCount(); // Sadece okunmamış sayıyı al, bildirimler lazy load
    }
  }, [user?.userId, authLoading]);

  // Periyodik olarak okunmamış sayıyı güncelle (5 dakikada bir)
  useEffect(() => {
    if (!user?.userId || authLoading) return;

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 5 * 60 * 1000); // 5 dakika

    return () => clearInterval(interval);
  }, [user?.userId, authLoading]);

  const value: NotificationContextType = {
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
  };

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