"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FaBell, FaCheck, FaCheckDouble, FaTimes, FaBox, FaTruck, FaCheckCircle, FaExclamationTriangle, FaCreditCard } from 'react-icons/fa';
import { NotificationMetadata } from '@/services/api';
import { useNotifications } from '@/app/context/NotificationContext';

interface NotificationDropdownProps {
  userId: string;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  // Bildirim tipine göre ikon getir
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
        return <FaCheckCircle className="text-green-500" />;
      case 'ORDER_SHIPPED':
        return <FaTruck className="text-blue-500" />;
      case 'ORDER_DELIVERED':
        return <FaBox className="text-green-600" />;
      case 'ORDER_CANCELLED':
        return <FaTimes className="text-red-500" />;
      case 'PAYMENT_SUCCESS':
        return <FaCreditCard className="text-green-500" />;
      case 'PAYMENT_FAILED':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'STOCK_ALERT':
        return <FaExclamationTriangle className="text-orange-500" />;
      default:
        return <FaBell className="text-gray-500" />;
    }
  };

  // Bildirim tipine göre renk getir
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ORDER_CONFIRMED':
      case 'ORDER_DELIVERED':
      case 'PAYMENT_SUCCESS':
        return 'border-l-green-500 bg-green-50';
      case 'ORDER_SHIPPED':
        return 'border-l-blue-500 bg-blue-50';
      case 'ORDER_CANCELLED':
      case 'PAYMENT_FAILED':
        return 'border-l-red-500 bg-red-50';
      case 'STOCK_ALERT':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Metadata'yı parse et
  const parseMetadata = (metadata?: string | NotificationMetadata): NotificationMetadata => {
    if (!metadata) return {};
    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  };

  // Tarih formatla
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return `${minutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} gün önce`;
    }
  };

  // Tek bildirimi okundu işaretle
  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    try {
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Bildirim okundu işaretlenemedi:', error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  // Tüm bildirimleri okundu işaretle
  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);
    try {
      await markAllAsRead();
    } catch (error) {
      console.error('Tüm bildirimler okundu işaretlenemedi:', error);
    } finally {
      setMarkingAllAsRead(false);
    }
  };

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dropdown açıldığında bildirimleri getir
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bildirim Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Bildirimler</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  <FaCheckDouble className="w-3 h-3" />
                  {markingAllAsRead ? 'İşleniyor...' : 'Tümünü Okundu İşaretle'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Bildirimler yükleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <FaBell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Henüz bildirim yok</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => {
                  const metadata = parseMetadata(notification.metadata);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                        !notification.isRead ? getNotificationColor(notification.type) : 'border-l-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h4>
                              <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-700' : 'text-gray-500'}`}>
                                {notification.message}
                              </p>
                              {metadata.orderNumber && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Sipariş: {metadata.orderNumber}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markingAsRead === notification.id}
                                className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                title="Okundu İşaretle"
                              >
                                {markingAsRead === notification.id ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                                ) : (
                                  <FaCheck className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button 
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium text-center py-1"
                onClick={() => {
                  setIsOpen(false);
                  // Tüm bildirimleri göster sayfasına yönlendir
                }}
              >
                Tüm Bildirimleri Görüntüle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;