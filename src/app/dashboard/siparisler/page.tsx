'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '@/app/hooks/useToken';
import { StoreType, storeTypeLabels } from '@/components/StoreTypeSelector';
import { bulkConfirmOrders, BulkConfirmOrdersResponse, getStores, Store, adminCancelOrder, cancelOrder, getAdminOrdersV2, getAdminOrdersLegacy, getAdminOrderStatusCounts, AdminOrderStatusV2 } from '@/services/api';
import CargoReceipt from '@/app/components/CargoReceipt';
import QRLabel from '@/app/components/QRLabel';
import QRCode from 'qrcode';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

// Currency display helper function
const getCurrencyDisplay = (order: Order, userCurrency: string) => {
  // Sipariş kendi currency'sini belirtmişse onu kullan
  if (order.order_currency) {
    return CURRENCY_SYMBOLS[order.order_currency as keyof typeof CURRENCY_SYMBOLS] || order.order_currency;
  }
  // Yoksa user'ın currency'sini kullan
  return CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency;
};

// Amount display helper function (converted amount varsa onu, yoksa original'i göster)
const getDisplayAmount = (order: Order, amount: string) => {
  if (order.converted_amount && parseFloat(order.converted_amount) > 0) {
    return parseFloat(order.converted_amount);
  }
  return parseFloat(amount);
};

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  has_fringe: boolean;
  width: string;
  height: string;
  cut_type: string;
  notes?: string;
  product: {
    productId: string;
    name: string;
    productImage: string;
    productCode: string;
    collection: {
      collectionId: string;
      name: string;
    };
  };
}

interface User {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  Store: {
    store_id: string;
    kurum_adi: string;
    vergi_numarasi: string;
    vergi_dairesi: string;
    telefon: string;
    eposta: string;
    adres: string;
    acik_hesap_tutari: string;
    limitsiz_acik_hesap: boolean;
    store_type: StoreType;
  };
}

interface Order {
  id: string;
  user_id: string;
  cart_id: number;
  total_price: string;
  status: string;
  delivery_address: string;
  store_name: string;
  store_tax_number: string;
  store_tax_office: string;
  store_phone: string;
  store_email: string;
  store_fax: string;
  // store_type User.Store içinde geliyor
  notes?: string;
  created_at: string;
  updated_at: string;
  receipt_printed?: boolean;
  receipt_printed_at?: string;
  order_currency?: string;        // 🆕 Sipariş para birimi
  payment_currency?: string;      // 🆕 Ödeme para birimi
  exchange_rate?: string;         // 🆕 Döviz kuru
  original_amount?: string;       // 🆕 Orijinal tutar
  converted_amount?: string;      // 🆕 Dönüştürülmüş tutar
  address?: {
    id: string;
    store_id: string;
    title: string;
    address: string;
    city: string;
    district: string;
    postal_code: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  user?: User;
  items: OrderItem[];
  cart: {
    id: number;
    created_at: string;
    updated_at: string;
  };
  qr_codes?: {
    id: string;
    order_id: string;
    order_item_id: string;
    product_id: string;
    barcode: string;
    barcode_type: string;
    barcode_image_url: string;
    is_scanned: boolean;
    scanned_at?: string;
    scanned_by?: string;
    created_at: string;
    quantity: number;
    qr_code?: string;
    qrCodeImageUrl?: string;
    scan_count?: number;
    required_scans?: number;
    last_scan_at?: string;
    first_scan_employee_id?: string;
    first_scan_at?: string;
    second_scan_at?: string;
    order_item: {
      id: string;
      order_id: string;
      product_id: string;
      quantity: number;
      unit_price: string;
      total_price: string;
      has_fringe: boolean;
      width: string;
      height: string;
      cut_type: string;
      product: {
        productId: string;
        name: string;
        productImage: string;
        collectionId: string;
        createdAt: string;
        updatedAt: string;
        rule_id: number;
      };
    };
    product: {
      productId: string;
      name: string;
      productImage: string;
      collectionId: string;
      createdAt: string;
      updatedAt: string;
      rule_id: number;
    };
  }[];
  barcodes?: {
    id: string;
    order_id: string;
    order_item_id: string;
    product_id: string;
    barcode: string;
    barcode_type: string;
    barcode_image_url: string;
    is_scanned: boolean;
    scanned_at?: string;
    scanned_by?: string;
    created_at: string;
    quantity: number;
    order_item: {
      id: string;
      order_id: string;
      product_id: string;
      quantity: number;
      unit_price: string;
      total_price: string;
      has_fringe: boolean;
      width: string;
      height: string;
      cut_type: string;
      product: {
        productId: string;
        name: string;
        productImage: string;
        collectionId: string;
        createdAt: string;
        updatedAt: string;
        rule_id: number;
      };
    };
    product: {
      productId: string;
      name: string;
      productImage: string;
      collectionId: string;
      createdAt: string;
      updatedAt: string;
      rule_id: number;
    };
  }[];
  order_summary?: {
    total_items: number;
    total_area_m2: number;
    items_with_fringe: number;
    unique_products: number;
  };
  qr_stats?: {
    total: number;
    scanned: number;
    pending: number;
    scanned_percentage: number;
  };
  customer_info?: {
    name: string;
    email: string;
    phone: string;
    store_name: string;
    store_tax_number: string;
    store_address: string;
  };
  financial_info?: {
    total_price: number;
    store_balance: number;
    unlimited_account: boolean;
  };
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    search?: string;
    userId?: string | null;
  };
}

interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  ready: number;
  shipped: number;
  delivered: number;
  canceled: number;
}

const PAGE_LIMIT = 20;
const ADMIN_ORDER_STATUSES: AdminOrderStatusV2[] = [
  'PENDING',
  'CONFIRMED',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELED',
];

interface CancelOrderModal {
  isOpen: boolean;
  orderId: string;
  orderNumber?: string;
  reason: string;
  isLoading: boolean;
  isRefund?: boolean; // İade işlemi mi, iptal işlemi mi
}

const statusLabels: { [key: string]: string } = {
  'PENDING': 'Beklemede',
  'CONFIRMED': 'Onaylandı',
  'READY': 'Hazır',
  'SHIPPED': 'Gönderildi',
  'DELIVERED': 'Teslim Edildi',
  'CANCELED': 'İptal Edildi'
};

const statusColors: { [key: string]: string } = {
  'PENDING': 'bg-amber-50 text-amber-800/90 border border-amber-200/70',
  'CONFIRMED': 'bg-slate-100 text-slate-700 border border-slate-200/80',
  'READY': 'bg-stone-100 text-stone-700 border border-stone-200/80',
  'SHIPPED': 'bg-sky-50 text-sky-800/80 border border-sky-200/60',
  'DELIVERED': 'bg-emerald-50 text-emerald-800/80 border border-emerald-200/60',
  'CANCELED': 'bg-rose-50 text-rose-800/80 border border-rose-200/60'
};

// Kesim türlerini Türkçe'ye çeviren fonksiyon
const translateCutType = (cutType: string): string => {
  const translations: { [key: string]: string } = {
    'custom': 'Normal Kesim',
    'rectangle': 'Normal Kesim',
    'standart': 'Normal Kesim',
    'oval': 'Oval Kesim',
    'round': 'Daire Kesim',
    'daire': 'Daire Kesim',
    'post kesim': 'Post Kesim'
  };
  
  return translations[cutType.toLowerCase()] || (cutType.charAt(0).toUpperCase() + cutType.slice(1) + ' Kesim');
};

const Siparisler = () => {
  const { user, isAdmin, isAdminOrEditor, isLoading: authLoading } = useAuth();
  const token = useToken();
  const router = useRouter();
  const [ordersData, setOrdersData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const ordersAbortRef = useRef<AbortController | null>(null);
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number>(0);
  const [fixedStats, setFixedStats] = useState<OrderStats | null>(null);
  
  // Filtreleme ve sayfalama
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false); // Toplam / tüm siparişler
  const [storeFilter, setStoreFilter] = useState(''); // Mağaza ID'si ile filtreleme
  const [receiptFilter, setReceiptFilter] = useState(''); // '', 'printed', 'not_printed'
  
  // Mağaza listesi
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // Custom dropdown state'leri
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isReceiptDropdownOpen, setIsReceiptDropdownOpen] = useState(false);
  
  // Refs
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const receiptDropdownRef = useRef<HTMLDivElement>(null);
  
  // Cancel order modal
  const [cancelOrderModal, setCancelOrderModal] = useState<CancelOrderModal>({
    isOpen: false,
    orderId: '',
    reason: '',
    isLoading: false,
    isRefund: false
  });

  // Cargo receipt modal
  const [cargoReceiptVisible, setCargoReceiptVisible] = useState(false);
  const [selectedOrderForCargo, setSelectedOrderForCargo] = useState<Order | null>(null);

  // QR Label modal
  const [qrLabelVisible, setQrLabelVisible] = useState(false);
  const [selectedOrderItemForQR, setSelectedOrderItemForQR] = useState<{
    order: Order;
    item: OrderItem;
  } | null>(null);

  // Toplu onaylama için state'ler
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkConfirmModal, setBulkConfirmModal] = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [bulkConfirmResult, setBulkConfirmResult] = useState<BulkConfirmOrdersResponse | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Currency bilgisini localStorage'dan al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Currency bilgisini al
        const rememberMe = localStorage.getItem("rememberMe") === "true";
        let storedCurrency;
        
        if (rememberMe) {
          storedCurrency = localStorage.getItem("currency");
        } else {
          storedCurrency = sessionStorage.getItem("currency");
        }
        
        if (storedCurrency) {
          setUserCurrency(storedCurrency);
        } else {
          // User'ın store bilgisinden currency'yi al
          if (user?.store?.currency) {
            setUserCurrency(user.store.currency);
          }
        }
      } catch (error) {
        console.error('Currency okuma hatası:', error);
      }
    }
  }, [user]);

  // Modal açıkken body scroll'unu engelle
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedOrder]);

  // Statü adetlerini statuses endpoint'inden al (admin/editor)
  const fetchOrderStatusCounts = useCallback(async () => {
    if (authLoading || !isAdminOrEditor) {
      return;
    }

    try {
      const counts = await getAdminOrderStatusCounts();
      const byStatus = Object.fromEntries(counts.map((item) => [item.status, item.count])) as Record<string, number>;
      const stats: OrderStats = {
        pending: byStatus.PENDING ?? 0,
        confirmed: byStatus.CONFIRMED ?? 0,
        ready: byStatus.READY ?? 0,
        shipped: byStatus.SHIPPED ?? 0,
        delivered: byStatus.DELIVERED ?? 0,
        canceled: byStatus.CANCELED ?? 0,
        total: counts.reduce((sum, item) => sum + (item.count || 0), 0),
      };
      setFixedStats(stats);
      setOrderStats(stats);
      setTotalOrdersCount(stats.total);
    } catch (error) {
      console.error('Statü adetleri alınırken hata:', error);
    }
  }, [authLoading, isAdminOrEditor]);

  // Mağaza listesini getir (sadece admin/editor için)
  const fetchStores = useCallback(async () => {
    if (!isAdminOrEditor) return; // Sadece admin ve editörler tüm mağazaları görebilir
    
    try {
      setLoadingStores(true);
      const storeList = await getStores();
      setStores(storeList);
    } catch (error) {
      console.error('Mağazalar yüklenirken hata:', error);
    } finally {
      setLoadingStores(false);
    }
  }, [isAdminOrEditor]);

  // Siparişleri getir
  const fetchOrders = useCallback(async (
    page: number = 1,
    status: string = '',
    receiptPrinted: string = '',
    storeId: string = '',
    loadAll: boolean = false,
  ) => {
    // AuthContext yüklemesi tamamlanmadıysa fetch yapma
    if (authLoading) {
      return;
    }

    const authToken = token;
    if (!authToken) {
      router.push('/');
      return;
    }

    // Admin/editor: statü, toplam veya mağaza yoksa liste çağrılmaz
    if (isAdminOrEditor && !status && !loadAll && !storeId) {
      ordersAbortRef.current?.abort();
      setOrdersData(null);
      setLoading(false);
      setError('');
      return;
    }

    ordersAbortRef.current?.abort();
    const controller = new AbortController();
    ordersAbortRef.current = controller;

    try {
      setLoading(true);
      setError('');

      if (isAdminOrEditor) {
        const receiptPrintedBool =
          receiptPrinted === 'printed' ? true :
          receiptPrinted === 'not_printed' ? false :
          undefined;

        const useV2 = Boolean(status) && ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatusV2) && !storeId;

        if (useV2) {
          const data = await getAdminOrdersV2({
            status: status as AdminOrderStatusV2,
            page,
            limit: PAGE_LIMIT,
            signal: controller.signal,
          });

          let filteredOrders = data.orders;
          if (receiptPrinted === 'printed') {
            filteredOrders = data.orders.filter((order: any) => order.receipt_printed === true);
          } else if (receiptPrinted === 'not_printed') {
            filteredOrders = data.orders.filter((order: any) =>
              order.status === 'DELIVERED' &&
              order.receipt_printed === false
            );
          }

          setOrdersData({
            orders: filteredOrders,
            filters: {
              status: data.filters?.status,
              userId: data.filters?.userId ?? null,
            },
            pagination: {
              page: data.pagination.page,
              limit: data.pagination.limit,
              total: data.pagination.totalCount,
              totalPages: data.pagination.totalPages,
              hasNext: data.pagination.hasNext,
              hasPrev: data.pagination.hasPrev,
            },
          });
        } else {
          // Toplam, mağaza filtresi veya mağaza+statü: eski endpoint (status zorunlu değil)
          const data = await getAdminOrdersLegacy({
            page,
            limit: PAGE_LIMIT,
            status: status && ADMIN_ORDER_STATUSES.includes(status as AdminOrderStatusV2) ? status : undefined,
            storeId: storeId || undefined,
            receiptPrinted: receiptPrintedBool,
            signal: controller.signal,
          });

          let filteredOrders = data.orders;

          // Backend storeId desteklemiyorsa istemci tarafında daralt
          if (storeId) {
            filteredOrders = filteredOrders.filter((order: any) =>
              order.user?.Store?.store_id === storeId ||
              order.store_info?.store_id === storeId ||
              order.store_info?.id === storeId ||
              order.store_id === storeId
            );
          }

          if (receiptPrinted === 'printed') {
            filteredOrders = filteredOrders.filter((order: any) => order.receipt_printed === true);
          } else if (receiptPrinted === 'not_printed') {
            filteredOrders = filteredOrders.filter((order: any) =>
              order.status === 'DELIVERED' &&
              order.receipt_printed === false
            );
          }

          setOrdersData({
            orders: filteredOrders,
            filters: {
              status: status || undefined,
            },
            pagination: data.pagination,
          });
        }
      } else {
        // Admin değilse my-orders endpoint'ini kullan
        const queryParams = new URLSearchParams();
        if (status) queryParams.append('status', status);

        const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/my-orders?${queryParams.toString()}`;

        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Siparişler alınamadı');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Siparişler alınamadı');
        }

        setOrdersData(result.data);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      setError('Siparişler alınamadı. Lütfen tekrar deneyiniz.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [router, isAdminOrEditor, authLoading, token]);

  useEffect(() => {
    // AuthContext yüklemesi tamamlanana kadar bekle
    if (authLoading) {
      return;
    }

    if (isAdminOrEditor && !statusFilter && !showAllOrders && !storeFilter) {
      setOrdersData(null);
      setLoading(false);
      return;
    }

    fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
  }, [currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders, authLoading, isAdminOrEditor, fetchOrders]);

  // Mağaza listesini yükle
  useEffect(() => {
    if (!authLoading && isAdminOrEditor) {
      fetchStores();
    }
  }, [authLoading, isAdminOrEditor, fetchStores]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (receiptDropdownRef.current && !receiptDropdownRef.current.contains(event.target as Node)) {
        setIsReceiptDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Frontend'de mağaza filtreleme
  const filteredOrders = useMemo(() => {
    if (!ordersData || !ordersData.orders) {
      return { orders: [], totalPages: 0, currentPage: 1, totalOrders: 0 };
    }

    let filtered = ordersData.orders;

    // Mağaza filtresi uygula (sadece admin/editor için)
    if (storeFilter && isAdminOrEditor) {
      filtered = filtered.filter(order => 
        order.user?.Store?.store_id === storeFilter ||
        (order as any).store_info?.store_id === storeFilter ||
        (order as any).store_info?.id === storeFilter
      );
    }

    return {
      ...ordersData,
      orders: filtered,
      totalOrders: filtered.length
    };
  }, [ordersData, storeFilter, isAdminOrEditor]);

  // Mağaza arama filtresi
  const filteredStores = useMemo(() => {
    if (!storeSearchQuery.trim()) {
      return stores;
    }
    return stores.filter(store => 
      store.kurum_adi.toLowerCase().includes(storeSearchQuery.toLowerCase())
    );
  }, [stores, storeSearchQuery]);

  // Statü adetlerini yükle
  useEffect(() => {
    if (!authLoading && isAdminOrEditor) {
      fetchOrderStatusCounts();
    }
  }, [authLoading, isAdminOrEditor, fetchOrderStatusCounts]);

  useEffect(() => {
    return () => {
      ordersAbortRef.current?.abort();
    };
  }, []);

  // Toplu onaylama fonksiyonları
  const handleSelectOrder = (orderId: string, isChecked: boolean) => {
    setSelectedOrderIds(prev => {
      if (isChecked) {
        return [...prev, orderId];
      } else {
        return prev.filter(id => id !== orderId);
      }
    });
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (!filteredOrders?.orders) return;
    
    const pendingOrders = filteredOrders.orders.filter(order => order.status === 'PENDING');
    if (isChecked) {
      setSelectedOrderIds(pendingOrders.map(order => order.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedOrderIds.length === 0) return;
    
    // Sadece PENDING durumundaki siparişleri filtrele
    const pendingOrderIds = selectedOrderIds.filter(orderId => {
      const order = filteredOrders?.orders.find(o => o.id === orderId);
      return order && order.status === 'PENDING';
    });
    
    if (pendingOrderIds.length === 0) {
      alert('Seçilen siparişler arasında onaylanabilecek (PENDING) sipariş bulunmamaktadır!');
      return;
    }
    
    setBulkConfirming(true);
    const results = {
      success: [] as any[],
      failed: [] as any[]
    };
    
    try {
      // Her PENDING siparişi tek tek onayla
      for (const orderId of pendingOrderIds) {
        try {
          // 1. Siparişi onayla
          const authToken = token;
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'CONFIRMED' })
          });

          if (!statusResponse.ok) {
            throw new Error('Sipariş durumu güncellenemedi');
          }

          const statusData = await statusResponse.json();
          
          if (statusData.success) {
            // 2. QR kodlarını oluştur
            try {
              const qrResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}/generate-qr-images`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${authToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (!qrResponse.ok) {
                console.error(`QR kod oluşturulamadı: ${orderId}`);
              }
              
              results.success.push({
                orderId: orderId,
                orderNumber: orderId.slice(0, 8).toUpperCase()
              });
            } catch (qrError) {
              // QR hatası siparişin onaylanmasını engellemez
              console.error(`QR kod hatası: ${orderId}`, qrError);
              results.success.push({
                orderId: orderId,
                orderNumber: orderId.slice(0, 8).toUpperCase(),
                warning: 'QR kodları oluşturulamadı'
              });
            }
          } else {
            throw new Error(statusData.message || 'Sipariş onaylanamadı');
          }
        } catch (error: any) {
          results.failed.push({
            orderId: orderId,
            orderNumber: orderId.slice(0, 8).toUpperCase(),
            error: error.message || 'Bilinmeyen hata'
          });
        }
      }
      
      // Sonuçları göster
      setBulkConfirmResult({
        success: true,
        message: `${results.success.length} sipariş başarıyla onaylandı${results.failed.length > 0 ? `, ${results.failed.length} sipariş başarısız` : ''}`,
        data: results
      } as any);
      setBulkConfirmModal(true);
      
      // Başarılı olan siparişleri seçimden çıkar
      if (results.success.length > 0) {
        const successfulIds = results.success.map(order => order.orderId);
        setSelectedOrderIds(prev => prev.filter(id => !successfulIds.includes(id)));
        
        // Siparişleri ve statü adetlerini yeniden yükle
        await fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
        await fetchOrderStatusCounts();
      }
    } catch (error) {
      console.error('Toplu onaylama hatası:', error);
      alert('Toplu onaylama işlemi başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setBulkConfirming(false);
    }
  };

  // Sipariş detayını getir
  const handleViewOrderDetail = async (orderId: string) => {
    try {
      const authToken = token;
      let endpoint: string;
      
      // Admin veya Editor ise admin/orders endpoint'ini kullan
      if (isAdminOrEditor) {
                  endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}`;

      } else {
        // Admin/Editor değilse normal orders endpoint'ini kullan
                  endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/${orderId}`;

        
        // Güvenlik kontrolü: Admin/Editor olmayan kullanıcılar asla admin endpoint'i kullanmamalı
        if (endpoint.includes('/admin/')) {
          throw new Error('Yetkisiz erişim: Admin endpoint\'i kullanılamaz');
        }
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Sipariş detayı alınamadı');
      }

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.data);
      } else {
        throw new Error(data.message || 'Sipariş detayı alınamadı');
      }
    } catch (error: any) {

      alert('Sipariş detayı alınamadı. Lütfen tekrar deneyiniz.');
    }
  };

  // QR kod oluşturma fonksiyonu
  const generateQRCodes = async (orderId: string) => {
    try {
      const authToken = token;
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}/generate-qr-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('QR kodları oluşturulamadı');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'QR kodları oluşturulamadı');
      }

      return data.data;
    } catch (error: any) {
      console.error('QR kod oluşturma hatası:', error);
      throw error;
    }
  };

  // Mağaza türüne göre QR kod şablonları - Backend'den gelen store_type değerine göre
  const getQRTemplateByStoreType = (storeType: StoreType | null | undefined) => {
    // KARGO ve AMBAR mağazaları için: adres + telefon + ürün bilgileri
    if (storeType && (storeType === 'KARGO' || storeType === 'AMBAR')) {
      return {
        title: 'Teslimat Bilgileri',
        showAddress: true,
        showPhone: true,
        showProductDetails: true,
        showCustomerName: false,
        showDimensions: true,
        showCutType: true,
        headerColor: '#dc2626', // Kırmızı (KARGO/AMBAR için)
        headerText: storeType === 'KARGO' ? 'KARGO TESLİMATI' : 'AMBAR TESLİMATI'
      };
    }
    
    // SERVIS ve KENDI_ALAN mağazaları için: sadece müşteri adı + ürün bilgileri (adres ve telefon YOK)
    if (storeType && (storeType === 'SERVIS' || storeType === 'KENDI_ALAN')) {
      return {
        title: 'Üretim Bilgileri',
        showAddress: false,
        showPhone: false,
        showProductDetails: true,
        showCustomerName: true,
        showDimensions: true,
        showCutType: true,
        headerColor: '#059669', // Yeşil (SERVIS/KENDI_ALAN için)
        headerText: storeType === 'SERVIS' ? 'SERVİS TESLİM' : 'KENDİ ALAN TESLİM'
      };
    }
    
    // Varsayılan şablon (mağaza türü belirtilmemişse)
    return {
      title: 'Sipariş Bilgileri',
      showAddress: true,
      showPhone: true,
      showProductDetails: true,
      showCustomerName: true,
      showDimensions: true,
      showCutType: true,
      headerColor: '#1f2937',
      headerText: 'SİPARİŞ BİLGİLERİ'
    };
  };

  // Sipariş bazlı QR kodları yazdırma fonksiyonu
  const printOrderQRCodes = (order: Order) => {
    if (!order.qr_codes || order.qr_codes.length === 0) {
      alert('Bu sipariş için QR kod bulunamadı!');
      return;
    }

    // Zaten yazdırma işlemi devam ediyorsa çık
    if (document.querySelector('iframe[data-printing="true"]')) {
      return;
    }

    // Gizli iframe oluştur
    const iframe = document.createElement('iframe');
    iframe.setAttribute('data-printing', 'true');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // iframe içeriğini yaz
    iframe.contentDocument?.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title style="color: black;">Sipariş QR Kodları - ${order.id.slice(0, 8)}</title>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              line-height: 1.2; 
              color: #000; 
              background: white;
              padding: 5mm;
              margin: 0;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(2, 1fr);
              gap: 3mm;
              width: 100%;
              height: 100%;
            }
            .qr-item {
              width: 60mm;
              height: 85mm;
              border: 1px solid #000;
              padding: 2mm;
              text-align: center;
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-sizing: border-box;
              overflow: hidden;
            }
            .qr-header {
              font-size: 6pt;
              font-weight: bold;
              margin-bottom: 1mm;
              color: white;
              text-align: center;
              line-height: 1.1;
            }
            .qr-image {
              width: 35mm;
              height: 35mm;
              margin: 0 auto;
              border: 1px solid #000;
            }
            .product-info {
              font-size: 6pt;
              text-align: left;
              margin-top: 1mm;
            }
            .product-info p {
              margin: 0.5mm 0;
              line-height: 1.1;
            }
            .product-info strong {
              font-weight: bold;
            }
            .store-info {
              font-size: 6pt;
              text-align: center;
              margin-top: 1mm;
              padding-top: 1mm;
              border-top: 1px solid #000;
              line-height: 1.2;
            }
            @media print {
              body { 
                padding: 0; 
                margin: 0;
              }
              .qr-grid {
                gap: 2mm;
                height: 280mm;
                width: 200mm;
                page-break-inside: avoid;
              }
              .qr-item { 
                page-break-inside: avoid;
                border: 0.5mm solid #000;
                break-inside: avoid;
              }
              @page { 
                margin: 5mm;
                size: A4 portrait;
              }
            }
          </style>
        </head>
        <body>
          ${(() => {
            // Tüm QR kodları tek bir dizi haline getir
            const allQrItems: string[] = [];
            order.qr_codes.forEach((qrCode, index) => {
              for (let i = 0; i < qrCode.order_item.quantity; i++) {
                allQrItems.push(`
                  <div class="qr-item">
                    ${(() => {
                      // Backend'den gelen store_type değerini User.Store içinden al
                      const storeType = order.user?.Store?.store_type;
                      const template = getQRTemplateByStoreType(storeType);
                      const customerName = order.user ? `${order.user.name} ${order.user.surname}` : '';
                      
                      
                      return `
                    <div class="qr-header" style="background-color: ${template.headerColor}; color: white; padding: 1mm; margin: -2mm -2mm 1mm -2mm;">
                      ${template.headerText}<br/>
                      SİPARİŞ: ${order.id.slice(0, 8).toUpperCase()}
                    </div>
                    
                    <img src="${qrCode.qrCodeImageUrl}" alt="QR Kod" class="qr-image" />
                    
                    <div class="product-info">
                      ${template.showCustomerName && customerName ? `<p><strong>MÜŞTERİ: ${customerName}</strong></p>` : ''}
                      <p><strong>${qrCode.product.name}</strong></p>
                      ${template.showDimensions ? `<p>Boyut: ${qrCode.order_item.width}×${qrCode.order_item.height} cm</p>` : ''}
                      <p>${qrCode.order_item.has_fringe ? 'Saçaklı' : 'Saçaksız'}${template.showCutType ? ` • ${translateCutType(qrCode.order_item.cut_type)}` : ''}</p>
                      <p>Adet: ${i + 1}/${qrCode.order_item.quantity}</p>
                    </div>
                    
                    <div class="store-info">
                      <strong>${order.store_name}</strong><br/>
                      ${template.showPhone ? `<strong>Tel:</strong> ${order.store_phone}<br/>` : ''}
                      ${template.showAddress ? (
                        order.address ? `
                          <strong>TESLIMAT ADRESI:</strong><br/>
                          ${(order.address as any).address}<br/>
                          ${(order.address as any).district} / ${(order.address as any).city}
                          ${(order.address as any).postal_code ? `<br/>Posta Kodu: ${(order.address as any).postal_code}` : ''}
                        ` : order.delivery_address ? `
                          <strong>TESLIMAT ADRESI:</strong><br/>
                          ${order.delivery_address}
                        ` : ''
                      ) : (
                        !template.showAddress && !template.showPhone ? '<br/><em>Mağaza üretim bilgileri</em>' : ''
                      )}
                    </div>
                      `;
                    })()}
                  </div>
                `);
              }
            });
            
            // 6'şar gruplara böl ve sayfalar oluştur
            const pages = [];
            for (let i = 0; i < allQrItems.length; i += 6) {
              const pageItems = allQrItems.slice(i, i + 6);
              pages.push(`
                <div class="qr-grid" ${i > 0 ? 'style="page-break-before: always;"' : ''}>
                  ${pageItems.join('')}
                </div>
              `);
            }
            
            return pages.join('');
          })()}
        </body>
      </html>
    `);
    iframe.contentDocument?.close();

    // iframe yüklendiğinde yazdırma dialogunu tetikle
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          // Yazdırma dialogunu tetikle
          iframe.contentWindow.print();
          
          // Yazdırma tamamlandıktan sonra iframe'i kaldır
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 1000);
    };

    // iframe yüklenemezse de temizle
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  };

  // QR Label açma fonksiyonu - tüm sipariş için
  const openQRLabel = (order: Order) => {
    setSelectedOrderItemForQR({ 
      order, 
      item: order.items[0] // Dummy item, artık kullanılmayacak
    });
    setQrLabelVisible(true);
  };

  // Kesim türü çeviri fonksiyonu
  const translateCutType = (cutType: string) => {
    const translations: { [key: string]: string } = {
      'oval': 'Oval Kesim',
      'daire': 'Daire Kesim', 
      'round': 'Daire Kesim',
      'post kesim': 'Post Kesim',
      'standart': 'Normal Kesim',
      'normal': 'Normal Kesim',
      'custom': 'Özel Kesim',
      'rectangle': 'Dikdörtgen Kesim'
    };
    
    return translations[cutType?.toLowerCase()] || cutType || 'Normal Kesim';
  };

  // Kesim türüne göre işaret çizme fonksiyonu
  const drawCutTypeIcon = (ctx: CanvasRenderingContext2D, cutType: string, x: number, y: number, size: number) => {
    const normalizedCutType = cutType?.toLowerCase() || 'standart';
    
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;
    
    switch (normalizedCutType) {
      case 'oval':
        // Oval işaret
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.6, size * 0.3, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'daire':
      case 'round':
        // Daire işaret
        ctx.beginPath();
        ctx.arc(x, y, size * 0.4, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'post kesim':
        // Post kesim işareti (dikdörtgen)
        ctx.beginPath();
        ctx.rect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.6);
        ctx.stroke();
        break;
        
      case 'standart':
      case 'normal':
      case 'custom':
      case 'rectangle':
      default:
        // Standart kesim işareti (kare)
        ctx.beginPath();
        ctx.rect(x - size * 0.3, y - size * 0.3, size * 0.6, size * 0.6);
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  };

  // Saçak durumuna göre işaret çizme fonksiyonu
  const drawFringeIcon = (ctx: CanvasRenderingContext2D, hasFringe: boolean, x: number, y: number, size: number) => {
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;
    
    if (hasFringe) {
      // Saçaklı - tırtıklı işaret (zigzag çizgi)
      ctx.beginPath();
      const zigzagWidth = size * 0.8;
      const zigzagHeight = size * 0.3;
      const startX = x - zigzagWidth / 2;
      const startY = y - zigzagHeight / 2;
      
      ctx.moveTo(startX, startY);
      for (let i = 0; i < 5; i++) {
        const xPos = startX + (zigzagWidth / 4) * i;
        const yPos = startY + (i % 2 === 0 ? zigzagHeight : 0);
        ctx.lineTo(xPos, yPos);
      }
      ctx.stroke();
    } else {
      // Saçaksız - düz çizgi
      ctx.beginPath();
      const lineWidth = size * 0.8;
      const lineHeight = size * 0.1;
      ctx.rect(x - lineWidth / 2, y - lineHeight / 2, lineWidth, lineHeight);
      ctx.fill();
    }
    
    ctx.restore();
  };

  // Store type çevirme fonksiyonu (toplu yazdırma)
  const translateStoreType = (storeType: string): string => {
    const translations: { [key: string]: string } = {
      'kargo': 'Kargo',
      'servis': 'Servis',
      'kendi alan': 'Kendi Alan', 
      'ambar': 'Ambar'
    };
    
    return translations[storeType?.toLowerCase()] || storeType || 'Kargo';
  };

  // Store type'a göre işaret çizme fonksiyonu (toplu yazdırma)
  const drawStoreTypeIcon = (ctx: CanvasRenderingContext2D, storeType: string, x: number, y: number, size: number) => {
    const normalizedStoreType = storeType?.toLowerCase() || 'kargo';
    
    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2;
    
    switch (normalizedStoreType) {
      case 'kargo':
        // Kargo işareti (kamyon - FontAwesome benzeri)
        ctx.beginPath();
        // Kamyon kasası
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.5, size * 0.4);
        ctx.stroke();
        // Kamyon kabini
        ctx.beginPath();
        ctx.rect(x + size * 0.1, y - size * 0.2, size * 0.3, size * 0.3);
        ctx.stroke();
        // Tekerlekler
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'servis':
        // Servis işareti (kamyon - FontAwesome benzeri)
        ctx.beginPath();
        // Kamyon kasası
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.5, size * 0.4);
        ctx.stroke();
        // Kamyon kabini
        ctx.beginPath();
        ctx.rect(x + size * 0.1, y - size * 0.2, size * 0.3, size * 0.3);
        ctx.stroke();
        // Tekerlekler
        ctx.beginPath();
        ctx.arc(x - size * 0.2, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + size * 0.25, y + size * 0.3, size * 0.1, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'kendi alan':
        // Kendi alan işareti (warehouse - FontAwesome benzeri)
        ctx.beginPath();
        // Ana bina gövdesi
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.8, size * 0.4);
        ctx.stroke();
        // Üçgen çatı
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y - size * 0.2);
        ctx.lineTo(x, y - size * 0.4);
        ctx.lineTo(x + size * 0.4, y - size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Kapı
        ctx.beginPath();
        ctx.rect(x - size * 0.1, y, size * 0.2, size * 0.2);
        ctx.stroke();
        // Pencereler
        ctx.beginPath();
        ctx.rect(x - size * 0.25, y - size * 0.1, size * 0.1, size * 0.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(x + size * 0.15, y - size * 0.1, size * 0.1, size * 0.1);
        ctx.stroke();
        break;
        
      case 'ambar':
        // Ambar işareti (warehouse - FontAwesome benzeri)
        ctx.beginPath();
        // Ana bina gövdesi
        ctx.rect(x - size * 0.4, y - size * 0.2, size * 0.8, size * 0.4);
        ctx.stroke();
        // Üçgen çatı
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, y - size * 0.2);
        ctx.lineTo(x, y - size * 0.4);
        ctx.lineTo(x + size * 0.4, y - size * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Büyük yükleme kapısı
        ctx.beginPath();
        ctx.rect(x - size * 0.2, y - size * 0.05, size * 0.4, size * 0.25);
        ctx.stroke();
        // Küçük kapı
        ctx.beginPath();
        ctx.rect(x + size * 0.25, y, size * 0.1, size * 0.2);
        ctx.stroke();
        break;
        
      default:
        // Varsayılan işaret (kargo)
        ctx.beginPath();
        ctx.rect(x - size * 0.4, y - size * 0.3, size * 0.8, size * 0.6);
        ctx.stroke();
        break;
    }
    
    ctx.restore();
  };

  // Toplu QR etiket yazdırma fonksiyonu
  const printBulkQRLabels = async (orderIds: string[]) => {
    if (orderIds.length === 0) {
      alert('Yazdırılacak QR etiket bulunamadı!');
      return;
    }

    try {
      // Siparişleri yükle
      const ordersWithQR = [];
      for (const orderId of orderIds) {
        try {
          const authToken = token;
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.items && data.data.items.length > 0) {
              ordersWithQR.push(data.data);
            }
          }
        } catch (error) {
          console.error(`Sipariş yüklenemedi: ${orderId}`, error);
        }
      }

      if (ordersWithQR.length === 0) {
        alert('Sipariş bilgileri yüklenemedi!');
        return;
      }

      // QR codes ve barcodes'ları eşleştir ve yazdırılacak etiketleri oluştur
      const allLabelsData = [];
      const allLabels: string[] = [];
      
      for (const order of ordersWithQR) {
        // Her QR code için ilgili barcode'u bul ve eşleştir
        if (order.qr_codes && order.qr_codes.length > 0) {
          for (const qrCodeData of order.qr_codes) {
            // Bu QR'ın order_item_id'sine göre ilgili barcode'u bul
            const relatedBarcode = order.barcodes?.find((bc: any) => bc.order_item_id === qrCodeData.order_item_id);
            
            // QR için required_scans kadar etiket oluştur
            const qrCount = qrCodeData.required_scans || 1;
            for (let i = 0; i < qrCount; i++) {
              allLabelsData.push({
                order: order,
                qrCode: qrCodeData,
                barcode: relatedBarcode,
                _labelIndex: i + 1,
                _totalLabels: qrCount
              });
            }
          }
        }
      }
      
      // Canvas etiketlerini oluştur
      for (const labelData of allLabelsData) {
        const qrCodeData = labelData.qrCode;
            const item = qrCodeData.order_item;
            
            try {
              // Her etiket için canvas oluştur - QRLabel ile aynı boyutlar
              const canvas = document.createElement('canvas');
              canvas.width = 639; // LABEL_W_PX (80mm @ 203 DPI)
              canvas.height = 799; // LABEL_H_PX (100mm @ 203 DPI)
              const ctx = canvas.getContext('2d');
              if (!ctx) continue;

              // Arka planı beyaz yap
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Backend QR kod string'ini kullanarak QR kod oluştur - QRLabel ile aynı ayarlar
              const qrSize = Math.round(639 * 0.7); // Yazıcı DPI'ında QR boyutu (0.65'ten 0.7'ye ayarlandı)
              const qrCodeDataURL = await QRCode.toDataURL(qrCodeData.qr_code, {
                width: qrSize,
                margin: 2,
                errorCorrectionLevel: 'M',
                type: 'image/png',
                color: {
                  dark: '#000000',
                  light: '#FFFFFF'
                }
              });

              // QR kod görselini yükle
              await new Promise((resolve) => {
                const qrImage = new (window as any).Image();
                qrImage.onload = () => {
                  // Netlik için image smoothing'i kapat
                  ctx.imageSmoothingEnabled = false;
                  
                  // YENİ LAYOUT: QR kodu büyütülmüş ve sağ köşede (toplu yazdırma)
                  const qrDisplaySize = Math.round(639 * 0.35);   // genişliğin %35'i (0.32'den 0.35'e ayarlandı)
                  const qrX = canvas.width - qrDisplaySize - Math.round((3 / 25.4) * 203);   // sağdan 3mm boşluk
                  const qrY = 10 + Math.round((3 / 25.4) * 203);                             // üstten 10px + 3mm boşluk
                  ctx.drawImage(qrImage, qrX, qrY, qrDisplaySize, qrDisplaySize);

                  // Metin bilgilerini sol tarafta ekle
                  ctx.fillStyle = '#000000';
                  ctx.textAlign = 'left';  // Sola hizalı

                  // Ürün adı - QR kodunun yanında (sol tarafta) (toplu yazdırma) - daha aşağı konumlandırıldı
                  let textY = qrY + Math.round((5 / 25.4) * 203); // QR kodunun hizasından başla
                  const productFont = Math.round(799 * 0.055);   // Orta boyut
                  ctx.font = `bold ${productFont}px Arial`;
                  const productName = item.product.name.toUpperCase();
                  const lineHeight = Math.round((6 / 25.4) * 203); // Satır aralığı artırıldı
                  
                  // Sol taraf için alan hesaplama (QR kodunun yanı)
                  const leftAreaWidth = qrX - Math.round((6 / 25.4) * 203); // QR kodunun solundaki alan (3mm margin)
                  const words = productName.split(' ');
                  const lines: string[] = [];
                  let currentLine = '';
                  
                  for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth <= leftAreaWidth) {
                      currentLine = testLine;
                    } else {
                      if (currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                      } else {
                        // Tek kelime çok uzunsa zorla böl
                        lines.push(word);
                      }
                    }
                  }
                  
                  if (currentLine) {
                    lines.push(currentLine);
                  }
                  
                  // Maksimum 2 satır göster (kompakt tasarım)
                  const maxLines = 2;
                  const displayLines = lines.slice(0, maxLines);
                  
                  // Eğer 2 satırdan fazla varsa son satırı "..." ile bitir
                  if (lines.length > maxLines) {
                    displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -3) + '...';
                  }
                  
                  // Ürün adı satırlarını çiz
                  for (const line of displayLines) {
                    ctx.fillText(line, Math.round((3 / 25.4) * 203), textY);
                    textY += lineHeight;
                  }
                  
                  textY += Math.round((2 / 25.4) * 203); // Ekstra boşluk

                  // Ürün bilgileri - Kompakt tasarım (toplu yazdırma)
                  const infoFont = Math.round(799 * 0.045);   // Küçük font
                  ctx.font = `bold ${infoFont}px Arial`;
                  const infoLineHeight = Math.round((5 / 25.4) * 203); // Ürün bilgileri için ayrı satır aralığı
                  
                  // Boyut bilgisi
                  ctx.fillText(`${item.width} x ${item.height}`, Math.round((3 / 25.4) * 203), textY);
                  textY += infoLineHeight;
                  
                   // Kesim türü - kompakt + işaret çizimi
                   drawCutTypeIcon(ctx, item.cut_type, Math.round((3 / 25.4) * 203), textY - Math.round((1.5 / 25.4) * 203), Math.round((3 / 25.4) * 203));
                   const cutTypeText = `    ${translateCutType(item.cut_type)}`;
                   ctx.fillText(cutTypeText, Math.round((3 / 25.4) * 203), textY);
                   textY += infoLineHeight;
                   
                   // Saçak durumu - kompakt + işaret çizimi
                   drawFringeIcon(ctx, item.has_fringe, Math.round((3 / 25.4) * 203), textY - Math.round((1.5 / 25.4) * 203), Math.round((3 / 25.4) * 203));
                   const fringeText = `    ${item.has_fringe ? 'Saçaklı' : 'Saçaksız'}`;
                   ctx.fillText(fringeText, Math.round((3 / 25.4) * 203), textY);
                   textY += infoLineHeight;
                   
                   // Store type bilgisi - işaret ile (toplu yazdırma)
                   const storeType = labelData.order.store_info?.store_type || labelData.order.user?.Store?.store_type || labelData.order.store_type || 'KARGO';
                   
                   drawStoreTypeIcon(ctx, storeType, Math.round((3 / 25.4) * 203), textY - Math.round((1.5 / 25.4) * 203), Math.round((3 / 25.4) * 203));
                   const storeTypeText = `    ${translateStoreType(storeType)}`;
                   ctx.fillText(storeTypeText, Math.round((3 / 25.4) * 203), textY);
                   textY += Math.round((6 / 25.4) * 203);

                  // Ürün notu varsa ekle (kompakt) - satır bölme ile (toplu yazdırma)
                  if (item.notes && item.notes.trim()) {
                    // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
                    const cleanedNotes = item.notes.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    const noteText = `Not: ${cleanedNotes}`;
                    const noteMaxWidth = leftAreaWidth; // QR kodunun yanındaki alanı kullan
                    const noteWords = noteText.split(' ');
                    const noteLines: string[] = [];
                    let currentNoteLine = '';
                    
                    for (const word of noteWords) {
                      const testLine = currentNoteLine ? `${currentNoteLine} ${word}` : word;
                      const testWidth = ctx.measureText(testLine).width;
                      
                      if (testWidth <= noteMaxWidth) {
                        currentNoteLine = testLine;
                      } else {
                        if (currentNoteLine) {
                          noteLines.push(currentNoteLine);
                          currentNoteLine = word;
                        } else {
                          // Tek kelime çok uzunsa zorla böl
                          noteLines.push(word);
                        }
                      }
                    }
                    
                    if (currentNoteLine) {
                      noteLines.push(currentNoteLine);
                    }
                    
                    // Maksimum 3 satır not göster (2'den 3'e çıkarıldı)
                    const maxNoteLines = 3;
                    const displayNoteLines = noteLines.slice(0, maxNoteLines);
                    
                    if (noteLines.length > maxNoteLines) {
                      displayNoteLines[maxNoteLines - 1] = displayNoteLines[maxNoteLines - 1].slice(0, -3) + '...';
                    }
                    
                    // Not satırlarını çiz (toplu yazdırma)
                    for (const line of displayNoteLines) {
                      ctx.fillText(line, Math.round((3 / 25.4) * 203), textY);
                      textY += Math.round((4 / 25.4) * 203); // Not satır aralığı (toplu yazdırma)
                    }
                  }

                  // FIRMA BİLGİLERİ VE ADRES - En alt kısımda (toplu yazdırma)
                  ctx.textAlign = 'center';
                  
                  // Firma adı - kalın ve belirgin
                  const firmFont = Math.round(799 * 0.05);   
                  ctx.font = `bold ${firmFont}px Arial`;
                  
                  // Alt kısımdan barcode için yer ayırarak yukarı konumlandır - daha yukarıya alındı
                  const CONTENT_BOTTOM_LIMIT = 799 - Math.round((20 / 25.4) * 203); // 641px
                  let firmY = CONTENT_BOTTOM_LIMIT - Math.round((25 / 25.4) * 203); // Barcode'dan 25mm yukarı
                  
                  // Firma adını satır satır böl eğer çok uzunsa (toplu yazdırma)
                  const firmMaxWidth = canvas.width - Math.round((6 / 25.4) * 203); // 3mm margin her yandan
                  const firmWords = labelData.order.store_name.split(' ');
                  const firmLines: string[] = [];
                  let currentFirmLine = '';
                  
                  for (const word of firmWords) {
                    const testLine = currentFirmLine ? `${currentFirmLine} ${word}` : word;
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth <= firmMaxWidth) {
                      currentFirmLine = testLine;
                    } else {
                      if (currentFirmLine) {
                        firmLines.push(currentFirmLine);
                        currentFirmLine = word;
                      } else {
                        // Tek kelime çok uzunsa zorla böl
                        firmLines.push(word);
                      }
                    }
                  }
                  
                  if (currentFirmLine) {
                    firmLines.push(currentFirmLine);
                  }
                  
                  // Maksimum 3 satır firma adı göster (2'den 3'e çıkarıldı)
                  const maxFirmLines = 3;
                  const displayFirmLines = firmLines.slice(0, maxFirmLines);
                  
                  if (firmLines.length > maxFirmLines) {
                    displayFirmLines[maxFirmLines - 1] = displayFirmLines[maxFirmLines - 1].slice(0, -3) + '...';
                  }
                  
                  // Firma adı satırlarını çiz (toplu yazdırma)
                  for (const line of displayFirmLines) {
                    ctx.fillText(line, canvas.width / 2, firmY);
                    firmY += Math.round((4 / 25.4) * 203); // Firma adı satır aralığı (toplu yazdırma)
                  }
                  
                  // Firma adı ile title arası boşluk (toplu yazdırma)
                  firmY += Math.round((4 / 25.4) * 203);
                  
                  // Title alanını ekle (firma adının altında) (toplu yazdırma)
                  if (labelData.order.address?.title) {
                    const titleFont = Math.round(799 * 0.038);
                    ctx.font = `bold ${titleFont}px Arial`;
                    ctx.fillText(labelData.order.address.title.toUpperCase(), canvas.width / 2, firmY);
                    firmY += Math.round((4 / 25.4) * 203); // Title ile adres arası boşluk
                  }
                  
                  // Adres bilgisi - boyut artırıldı ve kalın yapıldı
                  const addressFont = Math.round(799 * 0.042);
                  ctx.font = `bold ${addressFont}px Arial`;
                  
                  // Adres bilgisini şehir ve ilçe ile birlikte hazırla
                  let addressText = labelData.order.address?.address || 'ANTARES AVM.AYVALI MAH.AFRA CAD.NO:1-238 ETLİK';
                  
                  // \n karakterlerini boşlukla değiştir ve fazla boşlukları temizle
                  addressText = addressText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                  
                  if (labelData.order.address?.district || labelData.order.address?.city) {
                    const locationParts = [];
                    if (labelData.order.address?.district) locationParts.push(labelData.order.address.district);
                    if (labelData.order.address?.city) locationParts.push(labelData.order.address.city);
                    if (locationParts.length > 0) {
                      addressText += ` - ${locationParts.join(' / ')}`;
                    }
                  } else {
                    // Varsayılan adres için şehir/ilçe ekle
                    addressText += ' - KEÇİÖREN / ANKARA';
                  }
                  const addressMaxWidth = canvas.width - Math.round((6 / 25.4) * 203); // 3mm margin her yandan
                  const addressWords = addressText.split(' ');
                  const addressLines: string[] = [];
                  let currentAddressLine = '';
                  
                  for (const word of addressWords) {
                    const testLine = currentAddressLine ? `${currentAddressLine} ${word}` : word;
                    const testWidth = ctx.measureText(testLine).width;
                    
                    if (testWidth <= addressMaxWidth) {
                      currentAddressLine = testLine;
                    } else {
                      if (currentAddressLine) {
                        addressLines.push(currentAddressLine);
                        currentAddressLine = word;
                      } else {
                        addressLines.push(word);
                      }
                    }
                  }
                  
                  if (currentAddressLine) {
                    addressLines.push(currentAddressLine);
                  }
                  
                  // Maksimum 4 satır adres göster (3'ten 4'e çıkarıldı)
                  const maxAddressLines = 4;
                  const displayAddressLines = addressLines.slice(0, maxAddressLines);
                  
                  if (addressLines.length > maxAddressLines) {
                    displayAddressLines[maxAddressLines - 1] = displayAddressLines[maxAddressLines - 1].slice(0, -3) + '...';
                  }
                  
                  // Adres satırlarını çiz - satır aralığı artırıldı (toplu yazdırma)
                  for (const line of displayAddressLines) {
                    ctx.fillText(line, canvas.width / 2, firmY);
                    firmY += Math.round((5 / 25.4) * 203); // Satır aralığı 3'ten 5'e çıkarıldı
                  }
                  
                  // Telefon numarası adresin altına ekle - boşluk azaltıldı (toplu yazdırma)
                  if (labelData.order.user?.phone || labelData.order.store_phone) {
                    const phoneText = labelData.order.user?.phone || labelData.order.store_phone || '';
                    if (phoneText) {
                      firmY += Math.round((3 / 25.4) * 203); // Boşluk azaltıldı (6'dan 3'e)
                      
                      // Telefon için daha küçük font (toplu yazdırma)
                      const phoneFont = Math.round(799 * 0.035);
                      ctx.font = `bold ${phoneFont}px Arial`;
                      
                      ctx.fillText(`Tel: ${phoneText}`, canvas.width / 2, firmY);
                      firmY += Math.round((3 / 25.4) * 203); // Alt boşluk azaltıldı
                    }
                  }
                  
                  // PAŞA HOME yazısı kaldırıldı (toplu yazdırma)
                  
                  // QR kodunun üstündeki yazılar kaldırıldı

                  // Canvas'ta sadece QR kodu ve ürün bilgileri, barcode HTML'de gösterilecek
                  allLabels.push(canvas.toDataURL('image/png'));
                  resolve(true);
                };
                qrImage.onerror = () => {
                  console.error('QR kod görsel yükleme hatası');
                  resolve(false);
                };
                qrImage.src = qrCodeDataURL;
              });
            } catch (error) {
              console.error('QR kod etiketi oluşturma hatası:', error);
            }
      }

      // Tüm etiketleri yazdır
      if (allLabels.length > 0) {
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          // Etiketleri HTML olarak oluştur
          const labelsHtml = allLabelsData.map((labelData, index) => {
            const labelDataURL = allLabels[index];
            const barcodeImageUrl = labelData.barcode?.barcode_image_url;
            const barcodeText = labelData.barcode?.barcode;
            
            // Barcode bilgisi var mı kontrolü
            const hasBarcode = !!(labelData.barcode && barcodeImageUrl);
            
            // Template için değişkenleri hazırla
            const safeImageUrl = barcodeImageUrl || '';
            const safeBarcodeText = barcodeText || '';
            
            return `
              <div class="sheet">
                <div class="label-page">
                  <div class="qr-section">
                    <img src="${labelDataURL}" alt="QR Kod Etiketi ${index + 1}" class="label-image">
                  </div>
                  <div class="barcode-section">
                    ${hasBarcode ? `
                      <img src="${safeImageUrl}" alt="Barcode ${safeBarcodeText}" class="barcode-image">
                    ` : `
                      <div class="barcode-text">${safeBarcodeText || ''}</div>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('');

          const htmlContent = `
        <!DOCTYPE html>
            <html lang="tr">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Toplu QR Kod Etiketleri</title>
            <style>
                @page { 
                  size: 80mm 100mm; 
                  margin: 0; 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                
              /* ŞABLONU SAYFA MERKEZİNE KİLİTLE */
              html, body { 
                width: 80mm;
                height: 100mm;
                margin: 0; 
                padding: 0; 
                font-family: Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .sheet {
                width: 80mm;
                height: 100mm;
                display: flex;
                align-items: center;     /* dikey merkez */
                justify-content: center; /* yatay merkez */
                page-break-after: always;
              }
              
              /* Etiket kutusu - artık .sheet içinde ortalanmış */
              .label-page {
                width: 80mm; 
                height: 100mm;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                  justify-content: space-between;
                  background: white;
                  page-break-inside: avoid;
                  border: 1px solid #ccc;
                }
                
                .qr-section { 
                  height: 80mm; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  width: 100%;
                  padding: 2mm;
                  overflow: hidden;
                }
                
                /* Canvas'tan gelen PNG'nin tam oturması için - Barcode yazıcı optimizasyonu */
                .label-image { 
                  width: 80mm; 
                  height: 80mm; 
                  object-fit: contain;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: crisp-edges;
                  image-rendering: pixelated;
                  -ms-interpolation-mode: nearest-neighbor;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  max-width: 80mm !important;
                  max-height: 80mm !important;
                }

                .barcode-section { 
                  height: 20mm; 
                  width: 100%;
                  padding: 2mm;
                  text-align: center;
                  background: #f9f9f9;
                  border-top: 1px solid #ddd;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                  overflow: hidden;
                }

                .barcode-image { 
                  max-width: 78mm; 
                  max-height: 18mm;
                  object-fit: contain;
                  margin-bottom: 1mm;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: crisp-edges;
                  image-rendering: pixelated;
                  -ms-interpolation-mode: nearest-neighbor;
                  margin-bottom: 5px;
                }
                
                .barcode-text {
                  font-family: 'Courier New', monospace;
                  font-size: 10px;
                  font-weight: 900;
                  color: #000000;
                  letter-spacing: 1px;
                  text-shadow: 0.5px 0.5px 0px #ffffff;
                  -webkit-text-stroke: 0.3px #000000;
                }
                
                @media print {
                  /* Barcode yazıcı optimizasyonları + Tek sayfa zorlaması */
                  body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    color-adjust: exact;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  .label-page { 
                    border: none !important;
                    background: white !important;
                    page-break-inside: avoid !important;
                    page-break-before: always !important;
                    page-break-after: always !important;
                    break-inside: avoid !important;
                    break-before: always !important;
                    break-after: always !important;
                    position: relative !important;
                    overflow: hidden !important;
                    box-sizing: border-box !important;
                  }
                  
                  .qr-section {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                  }
                  
                  .barcode-section {
                    background: white !important;
                    border-top: 1px solid #000 !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    overflow: hidden !important;
                  }
                  
                  .barcode-text {
                    color: #000000 !important;
                    font-weight: 900 !important;
                    font-size: 10px !important;
                    text-shadow: none !important;
                    -webkit-text-stroke: 0.5px #000000 !important;
                    letter-spacing: 1.2px !important;
                  }
                  
                  /* QR ve Barcode görsellerinin net çıkması için */
                  .label-image, .barcode-image {
                    -webkit-filter: contrast(1.3) brightness(1.0) saturate(1.2);
                    filter: contrast(1.3) brightness(1.0) saturate(1.2);
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  
                  /* Barcode metinlerinin daha net çıkması için ek filtreler */
                  .barcode-section {
                    -webkit-filter: contrast(1.2) brightness(0.95);
                    filter: contrast(1.2) brightness(0.95);
                  }
                  
                  /* Sayfa içeriğinin taşmasını engelle */
                  * {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                }
              </style>
            </head>
            <body>
              ${labelsHtml}
            </body>
            </html>
          `;

          printWindow.document.write(htmlContent);
          printWindow.document.close();
          
          printWindow.onload = () => {
            
            // Yazdırma ayarları uyarısı kaldırıldı
            
            // Yazdırma sayfasını başlat
            setTimeout(() => {
              try {
                printWindow.focus();
                printWindow.print();
              } catch (error) {
                console.error('❌ Yazdırma hatası:', error);
                alert('Yazdırma hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
              }
              
              // Pencereyi 5 saniye sonra kapat (kullanıcı yazdırma dialog'unu görebilsin)
              setTimeout(() => {
                try {
                  printWindow.close();
                } catch (error) {
                  console.error('❌ Pencere kapatma hatası:', error);
                }
              }, 5000);
            }, 1000);
          };
        }
      }
    } catch (error) {
      console.error('Toplu QR etiket yazdırma hatası:', error);
      alert('QR etiketleri yazdırılırken bir hata oluştu.');
    }
  };

  // Belirli siparişler için toplu QR etiket yazdırma (10x15 cm format)
  const printBulkQRCodesForOrders = async (orderIds: string[]) => {
    if (orderIds.length === 0) {
      alert('Yazdırılacak QR etiket bulunamadı!');
      return;
    }

    // printBulkQRLabels fonksiyonunu kullan
    await printBulkQRLabels(orderIds);
  };

  // Toplu QR kod yazdırma fonksiyonu (seçilen siparişler için)
  const printBulkQRCodes = async () => {
    if (selectedOrderIds.length === 0) {
      alert('Lütfen QR kod yazdırmak için siparişler seçin!');
      return;
    }

    // printBulkQRLabels fonksiyonunu kullan
    await printBulkQRLabels(selectedOrderIds);
  };


  // Sipariş iptal etme fonksiyonu (kullanıcılar için)
  const handleCancelOrder = async (orderId: string, reason?: string) => {
    try {
      setCancelOrderModal(prev => ({ ...prev, isLoading: true }));
      const authToken = token;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/${orderId}/cancel`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: reason ? JSON.stringify({ reason }) : undefined
        }
      );

      if (!response.ok) {
        throw new Error('Sipariş iptal edilemedi');
      }

      const data = await response.json();
      if (data.success) {
        let message = data.message || 'Sipariş başarıyla iptal edildi.';
        
        // Currency kontrolü ve canSeePrice kontrolü
        if (!user?.canSeePrice) {
          message = message
            .replace(/bakiye.*?iade.*?\./gi, '')
            .replace(/iade.*?bakiye.*?\./gi, '')
            .replace(/\d+([.,]\d+)?\s*(₺|TL|USD|\$|EUR|€|lira)/gi, '')
            .replace(/tutarı.*?iade.*?\./gi, '')
            .replace(/\.\s*\./g, '.')
            .trim();
        } else {
          // Currency sembolünü dinamik olarak güncelle
          const order = filteredOrders?.orders.find(o => o.id === orderId);
          if (order) {
            const correctCurrency = getCurrencyDisplay(order, userCurrency);
            // TL sembollerini doğru currency ile değiştir
            message = message.replace(/(₺|TL)/g, correctCurrency);
          }
        }
        
        alert(message);
        
        // Siparişleri yeniden yükle
        await fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
        if (isAdminOrEditor) {
          await fetchOrderStatusCounts();
        }
        
        // Modal'ı kapat
        setCancelOrderModal({
          isOpen: false,
          orderId: '',
          reason: '',
          isLoading: false
        });
        
        // Eğer açık olan sipariş detayı iptal edilen siparişse, modal'ı kapat
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        throw new Error(data.message || 'Sipariş iptal edilemedi');
      }
    } catch (error: any) {
      console.error('Sipariş iptal hatası:', error);
      alert(error.message || 'Sipariş iptal edilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setCancelOrderModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Admin için sipariş iade etme (normal cancel endpoint'ini kullanır)
  const handleRefundOrder = async (orderId: string, reason?: string) => {
    if (!isAdmin) return;
    
    try {
      setCancelOrderModal(prev => ({ ...prev, isLoading: true }));
      
      const response = await cancelOrder(orderId, reason || 'Admin iadesi - Teslim edilmiş sipariş');
      
      if (response.success) {
        let message = response.message || 'Sipariş başarıyla iade edildi.';
        
        // Currency sembolünü dinamik olarak güncelle
        const order = filteredOrders?.orders.find(o => o.id === orderId);
        if (order) {
          const correctCurrency = getCurrencyDisplay(order, userCurrency);
          // TL sembollerini doğru currency ile değiştir
          message = message.replace(/(₺|TL)/g, correctCurrency);
        }
        
        alert(message);
        
        // Siparişleri yeniden yükle
        await fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
        if (isAdminOrEditor) {
          await fetchOrderStatusCounts();
        }
        
        // Modal'ı kapat
        setCancelOrderModal({
          isOpen: false,
          orderId: '',
          reason: '',
          isLoading: false,
          isRefund: false
        });
        
        // Eğer açık olan sipariş detayı iade edilen siparişse, modal'ı kapat
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
      } else {
        throw new Error(response.message || 'Sipariş iade edilemedi');
      }
    } catch (error: any) {
      console.error('Sipariş iade hatası:', error);
      alert(error.message || 'Sipariş iade edilirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setCancelOrderModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Admin/Editor için sipariş durumu güncelleme
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!isAdminOrEditor) return;
    
    setUpdatingStatus(true);
    try {
      const authToken = token;
      
      // İlk olarak sipariş durumunu güncelle
              const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Sipariş durumu güncellenemedi');
      }

      const data = await response.json();
      if (data.success) {
        // Eğer sipariş CONFIRMED durumuna geçiyorsa QR kodları oluştur
        if (newStatus === 'CONFIRMED') {
          try {
            await generateQRCodes(orderId);
            // QR kodları oluşturulduktan sonra alert mesajını güncelle
            alert('Sipariş durumu güncellendi ve QR kodları oluşturuldu!');
          } catch (qrError: any) {
            // QR kod hatası sipariş güncellemeyi engellemez, sadece uyarı verelim
            alert('Sipariş durumu güncellendi ancak QR kodları oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
          }
        } else {
          // Diğer durumlarda normal alert mesajı
          alert('Sipariş durumu başarıyla güncellendi!');
        }

        // Siparişleri yeniden yükle
        await fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
        if (isAdminOrEditor) {
          await fetchOrderStatusCounts();
        }
        // Modal'daki sipariş detayını da güncelle
        if (selectedOrder && selectedOrder.id === orderId) {
          await handleViewOrderDetail(orderId);
        }
      } else {
        throw new Error(data.message || 'Sipariş durumu güncellenemedi');
      }
    } catch (error: any) {
      console.error('Sipariş durumu güncellenirken hata:', error);
      alert('Sipariş durumu güncellenirken bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtreleme fonksiyonları
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setShowAllOrders(!status); // '' = Tüm Durumlar → eski API ile tümü
    setIsStatusDropdownOpen(false);
    setCurrentPage(1);
  };

  const handleShowAllOrders = () => {
    setStatusFilter('');
    setShowAllOrders(true);
    setCurrentPage(1);
  };

  const handleStoreFilter = (storeId: string) => {
    setStoreFilter(storeId);
    setIsStoreDropdownOpen(false);
    setCurrentPage(1);
    // Arama metnini temizle; aksi halde dropdown yalnızca seçili mağazayı gösterir
    setStoreSearchQuery('');
  };
  
  // Fiş filtresi
  const handleReceiptFilter = (filter: string) => {
    setReceiptFilter(filter);
    setIsReceiptDropdownOpen(false);
    setCurrentPage(1);
  };

  // Sayfa değiştirme
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // API'den sipariş fişi alma fonksiyonu
  const getOrderReceiptFromAPI = async (orderId: string): Promise<any> => {
    try {
      const authToken = token;
      // Hem admin hem kullanıcı için aynı endpoint
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/${orderId}/receipt`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fiş bilgileri alınamadı');
      }

      const data = await response.json();
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Fiş bilgileri alınamadı');
      }
    } catch (error: any) {
      console.error('Fiş alma hatası:', error);
      throw error;
    }
  };

  // Fiş yazdırıldı olarak işaretleme fonksiyonu (sadece admin)
  const markReceiptAsPrinted = async (orderId: string): Promise<void> => {
    try {
      const authToken = token;
      const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/orders/${orderId}/mark-printed`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fiş durumu güncellenemedi');
      }

      const result = await response.json();
    } catch (error: any) {
      console.error('Fiş durumu güncelleme API hatası:', error);
      throw error;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Başlık */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              {isAdminOrEditor ? 'Tüm Siparişler' : 'Siparişlerim'}
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 max-w-xl text-sm text-slate-500">
              {isAdminOrEditor
                ? 'Sistemdeki tüm siparişleri görüntüleyin ve yönetin.'
                : 'Vermiş olduğunuz siparişlerin listesi.'}
            </p>
          </div>
        </div>

        {/* Admin/Editor Statü Rozetleri — tıklanınca ilgili siparişler yüklenir */}
        {isAdminOrEditor && fixedStats && (
          <div className="mb-6 grid grid-cols-2 gap-2.5 sm:mb-8 sm:gap-3 md:grid-cols-3 lg:grid-cols-7">
            <button
              type="button"
              onClick={handleShowAllOrders}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.99] sm:p-4 ${
                showAllOrders && !statusFilter
                  ? 'border-slate-300/90 bg-stone-100/90'
                  : 'border-slate-200/80 bg-white hover:bg-stone-50/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-slate-900 sm:text-2xl">{totalOrdersCount}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Toplam</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('PENDING')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/30 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'PENDING'
                  ? 'border-amber-300/70 bg-amber-50'
                  : 'border-amber-200/50 bg-amber-50/40 hover:bg-amber-50/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-amber-900/80 sm:text-2xl">{fixedStats.pending}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700/70">Beklemede</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('CONFIRMED')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/30 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'CONFIRMED'
                  ? 'border-slate-300/80 bg-slate-100'
                  : 'border-slate-200/70 bg-slate-50/60 hover:bg-slate-100/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-slate-800 sm:text-2xl">{fixedStats.confirmed}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">Onaylandı</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('READY')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/30 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'READY'
                  ? 'border-stone-300/80 bg-stone-100'
                  : 'border-stone-200/70 bg-stone-50/70 hover:bg-stone-100/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-stone-800 sm:text-2xl">{fixedStats.ready}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">Hazır</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('SHIPPED')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/30 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'SHIPPED'
                  ? 'border-sky-300/70 bg-sky-50'
                  : 'border-sky-200/50 bg-sky-50/40 hover:bg-sky-50/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-sky-900/80 sm:text-2xl">{fixedStats.shipped}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-sky-700/70">Gönderildi</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('DELIVERED')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/25 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'DELIVERED'
                  ? 'border-emerald-300/60 bg-emerald-50'
                  : 'border-emerald-200/50 bg-emerald-50/40 hover:bg-emerald-50/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-emerald-900/80 sm:text-2xl">{fixedStats.delivered}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-emerald-700/70">Teslim</div>
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter('CANCELED')}
              className={`rounded-xl border p-3.5 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/25 active:scale-[0.99] sm:p-4 ${
                statusFilter === 'CANCELED'
                  ? 'border-rose-300/60 bg-rose-50'
                  : 'border-rose-200/50 bg-rose-50/40 hover:bg-rose-50/80'
              }`}
            >
              <div className="text-xl font-semibold tabular-nums text-rose-900/80 sm:text-2xl">{fixedStats.canceled}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wide text-rose-700/70">İptal</div>
            </button>
          </div>
        )}

        {/* Filtreleme ve Arama */}
        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Filtreler</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {isAdminOrEditor
                ? 'Liste için önce bir durum seçin; ardından mağaza ve fiş ile daraltabilirsiniz.'
                : 'Siparişleri mağaza, durum ve fiş bilgisine göre daraltın'}
            </p>
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Mağaza Filtresi (Sadece Admin/Editor için) */}
            {isAdminOrEditor && (
              <div className="flex-1" ref={storeDropdownRef}>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Mağaza Seç
                </label>
                <div className="relative">
                  <div
                    className="w-full cursor-pointer rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 transition-all duration-200 ease-out hover:border-slate-300 focus-within:border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00365a]/15"
                    onClick={() => {
                      if (!isStoreDropdownOpen) {
                        setStoreSearchQuery('');
                      }
                      setIsStoreDropdownOpen(!isStoreDropdownOpen);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={
                          isStoreDropdownOpen
                            ? storeSearchQuery
                            : (storeFilter
                                ? (stores.find((s) => s.store_id === storeFilter)?.kurum_adi || '')
                                : storeSearchQuery)
                        }
                        onChange={(e) => {
                          setStoreSearchQuery(e.target.value);
                          setIsStoreDropdownOpen(true);
                        }}
                        onFocus={() => {
                          setStoreSearchQuery('');
                          setIsStoreDropdownOpen(true);
                        }}
                        placeholder="Mağaza ara..."
                        className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        disabled={loadingStores}
                      />
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStoreDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {isStoreDropdownOpen && (
                    <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm">
                      <div
                        className="cursor-pointer border-b border-slate-100 px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50"
                        onClick={() => handleStoreFilter('')}
                      >
                        <span className="text-slate-500">Tüm Mağazalar</span>
                      </div>
                      {filteredStores.length > 0 ? (
                        filteredStores.map((store) => (
                          <div
                            key={store.store_id}
                            className={`cursor-pointer px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                              storeFilter === store.store_id ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                            }`}
                            onClick={() => handleStoreFilter(store.store_id)}
                          >
                            <div className="font-medium">{store.kurum_adi}</div>
                            <div className="text-xs text-slate-400">{store.telefon}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-center text-sm text-slate-400">
                          Mağaza bulunamadı
                        </div>
                      )}
                    </div>
                  )}
                  
                  {loadingStores && (
                    <div className="absolute right-10 top-2.5 text-slate-400">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m12 2a10 10 0 0 1 10 10h-4a6 6 0 0 0-6-6z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Durum Filtresi */}
            <div className="md:w-64" ref={statusDropdownRef}>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Sipariş Durumu
              </label>
              <div className="relative">
                <div
                  className="w-full cursor-pointer rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 transition-all duration-200 ease-out hover:border-slate-300 focus-within:border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00365a]/15"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-900">
                      {statusFilter ? statusLabels[statusFilter] : 'Tüm Durumlar'}
                    </span>
                    <svg
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {isStatusDropdownOpen && (
                  <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm">
                    <div
                      className="cursor-pointer border-b border-slate-100 px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50"
                      onClick={() => handleStatusFilter('')}
                    >
                      <span className="text-slate-500">Tüm Durumlar</span>
                    </div>
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <div
                        key={status}
                        className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          statusFilter === status ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                        }`}
                        onClick={() => handleStatusFilter(status)}
                      >
                        <span>{label}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          status === 'PENDING' ? 'bg-amber-400/80' :
                          status === 'CONFIRMED' ? 'bg-slate-400' :
                          status === 'READY' ? 'bg-stone-400' :
                          status === 'SHIPPED' ? 'bg-sky-400/80' :
                          status === 'DELIVERED' ? 'bg-emerald-400/80' :
                          status === 'CANCELED' ? 'bg-rose-400/80' : 'bg-slate-300'
                        }`}></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fiş Durumu Filtresi - Sadece Admin/Editor için */}
            {isAdminOrEditor && (
              <div className="md:w-64" ref={receiptDropdownRef}>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Fiş Durumu
                </label>
                <div className="relative">
                  <div
                    className="w-full cursor-pointer rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 transition-all duration-200 ease-out hover:border-slate-300 focus-within:border-slate-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00365a]/15"
                    onClick={() => setIsReceiptDropdownOpen(!isReceiptDropdownOpen)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-900">
                        {receiptFilter === 'printed' ? 'Yazdırılan Fişler' : 
                         receiptFilter === 'not_printed' ? 'Yazdırılmayan Fişler' : 
                         'Tüm Fişler'}
                      </span>
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isReceiptDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  
                  {isReceiptDropdownOpen && (
                    <div className="absolute z-50 mt-1.5 w-full rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm">
                      <div
                        className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          receiptFilter === '' ? 'bg-stone-100 text-slate-900' : 'text-slate-500'
                        }`}
                        onClick={() => handleReceiptFilter('')}
                      >
                        <span>Tüm Fişler</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                      </div>
                      <div
                        className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          receiptFilter === 'printed' ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                        }`}
                        onClick={() => handleReceiptFilter('printed')}
                      >
                        <span>Yazdırılan Fişler</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80"></span>
                      </div>
                      <div
                        className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          receiptFilter === 'not_printed' ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                        }`}
                        onClick={() => handleReceiptFilter('not_printed')}
                      >
                        <span>Yazdırılmayan Fişler</span>
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70"></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Aktif Filtreler */}
          {(statusFilter || storeFilter || receiptFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {statusFilter && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-stone-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Durum: {statusLabels[statusFilter]}
                  <button
                    onClick={() => handleStatusFilter('')}
                    className="ml-0.5 text-slate-400 transition-colors duration-150 hover:text-slate-700 focus-visible:outline-none"
                    aria-label="Durum filtresini temizle"
                  >
                    ×
                  </button>
                </div>
              )}
              {receiptFilter && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-stone-200/80 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700">
                  Fiş: {receiptFilter === 'printed' ? 'Yazdırılan' : 'Yazdırılmayan'}
                  <button
                    onClick={() => handleReceiptFilter('')}
                    className="ml-0.5 text-stone-400 transition-colors duration-150 hover:text-stone-700 focus-visible:outline-none"
                    aria-label="Fiş filtresini temizle"
                  >
                    ×
                  </button>
                </div>
              )}
              {storeFilter && (
                <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200/60 bg-emerald-50/70 px-2.5 py-1 text-xs font-medium text-emerald-800/80">
                  Mağaza: {stores.find(store => store.store_id === storeFilter)?.kurum_adi || storeFilter}
                  <button
                    onClick={() => handleStoreFilter('')}
                    className="ml-0.5 text-emerald-600/70 transition-colors duration-150 hover:text-emerald-800 focus-visible:outline-none"
                    aria-label="Mağaza filtresini temizle"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toplu İşlemler - Sadece Admin/Editor için ve PENDING siparişler varsa */}
        {isAdminOrEditor && ordersData?.orders.some(order => order.status === 'PENDING') && (
          <div className="mb-6 rounded-xl border border-slate-200/80 bg-stone-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      ordersData?.orders.filter(order => order.status === 'PENDING').length > 0 &&
                      ordersData?.orders.filter(order => order.status === 'PENDING').every(order => selectedOrderIds.includes(order.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/30"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Tüm beklemedeki siparişleri seç
                  </span>
                </label>
                <span className="text-sm text-slate-500">
                  ({selectedOrderIds.length} seçili)
                </span>
              </div>
              
              {selectedOrderIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleBulkConfirm}
                    disabled={bulkConfirming}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700/90 px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 active:scale-[0.98]"
                  >
                      {bulkConfirming ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Onaylanıyor...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {selectedOrderIds.length} Siparişi Onayla
                        </>
                      )}
                    </button>
                  
                  {(statusFilter === 'CONFIRMED' || statusFilter === 'READY') && (
                    <button
                      onClick={printBulkQRCodes}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      {selectedOrderIds.length} Sipariş QR Yazdır
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200/60 bg-rose-50/70 px-4 py-3 text-sm text-rose-700/90">
            {error}
            <button
              type="button"
              onClick={() => fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders)}
              className="ml-3 font-medium underline underline-offset-2"
            >
              Tekrar dene
            </button>
          </div>
        )}

        {loading && (
          <div className="mb-6 flex h-40 items-center justify-center rounded-xl border border-slate-200/80 bg-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]/70" />
          </div>
        )}

        {/* Siparişler Listesi */}
        {!loading && (!filteredOrders || filteredOrders.orders.length === 0) ? (
          <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-slate-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              {isAdminOrEditor && !statusFilter && !showAllOrders && !storeFilter
                ? 'Sipariş durumu veya mağaza seçin'
                : statusFilter || storeFilter || receiptFilter || showAllOrders
                  ? 'Filtreye uygun sipariş bulunamadı'
                  : 'Henüz sipariş yok'}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {isAdminOrEditor && !statusFilter && !showAllOrders && !storeFilter
                ? 'Toplam / bir statü butonuna veya mağaza filtresine tıklayarak siparişleri görüntüleyin.'
                : statusFilter || storeFilter || receiptFilter || showAllOrders
                  ? 'Farklı filtreler deneyin veya filtreleri temizleyin.'
                  : isAdminOrEditor
                    ? 'Henüz sisteme hiç sipariş girilmemiş.'
                    : 'Henüz bir sipariş vermemişsiniz.'}
            </p>
            {!isAdminOrEditor && !statusFilter && !storeFilter && !receiptFilter && (
              <Link
                href="/dashboard/sepetim"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
              >
                Alışverişe Başla
              </Link>
            )}
          </div>
        ) : !loading ? (
          <div className="space-y-3">
            {filteredOrders.orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-slate-200/80 bg-white p-4 transition-all duration-200 ease-out hover:border-slate-300/90 hover:bg-stone-50/40 sm:p-5"
              >
                <div className="flex gap-3 sm:gap-4">
                  {/* Checkbox - Sadece Admin/Editor için ve PENDING siparişlerde */}
                  {isAdminOrEditor && order.status === 'PENDING' && (
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={(e) => handleSelectOrder(order.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/30"
                      />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    {/* Üst: Mağaza + Sipariş durumu */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <h3 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900">
                        {order.store_name}
                      </h3>
                      <span className={`inline-flex w-fit shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>

                    {/* Sipariş Bilgileri + Ürünler */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                      <div>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sipariş Bilgileri
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-wrap gap-x-2">
                            <span className="text-slate-500">Tarih:</span>
                            <span className="text-slate-800">
                              {new Date(order.created_at).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>

                          {isAdminOrEditor && order.user && (
                            <>
                              <div className="flex flex-wrap gap-x-2">
                                <span className="text-slate-500">Müşteri:</span>
                                <span className="text-slate-800">{order.user.name} {order.user.surname}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-2">
                                <span className="text-slate-500">E-posta:</span>
                                <span className="break-all text-slate-800">{order.user.email}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-2">
                                <span className="text-slate-500">Telefon:</span>
                                <span className="text-slate-800">{order.user.phone}</span>
                              </div>
                            </>
                          )}

                          {user?.canSeePrice && (
                            <div className="flex flex-wrap gap-x-2">
                              <span className="text-slate-500">Toplam Tutar:</span>
                              <span className="font-semibold tabular-nums text-[#00365a]">
                                {getDisplayAmount(order, order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencyDisplay(order, userCurrency)}
                              </span>
                            </div>
                          )}

                          {order.notes && (
                            <div className="mt-1 rounded-lg border border-amber-200/60 bg-amber-50/70 p-2.5">
                              <span className="text-sm text-amber-900/80">
                                <strong className="font-medium">Not:</strong> {order.notes}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Ürünler
                          <span className="ml-1.5 font-normal normal-case tracking-normal text-slate-400">
                            ({order.items.reduce((total, item) => total + item.quantity, 0)} adet)
                          </span>
                        </h4>
                        <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="rounded-lg border border-slate-200/60 bg-stone-50/60 px-3 py-2"
                            >
                              <div className="truncate text-sm font-medium text-slate-800">
                                {item.product.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                                <span>{item.width}×{item.height} cm</span>
                                <span>·</span>
                                <span>{item.quantity} adet</span>
                                {item.cut_type && (
                                  <>
                                    <span>·</span>
                                    <span>{translateCutType(item.cut_type)}</span>
                                  </>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Aksiyonlar: üstte işlem butonları, alt sağda Detayları Gör */}
                    <div className="mt-4 flex flex-col items-stretch gap-2 border-t border-slate-100 pt-4 sm:items-end">
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                    {/* İptal Butonu - Sadece PENDING durumunda ve admin/editör değilse */}
                    {!isAdminOrEditor && order.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setCancelOrderModal({
                            isOpen: true,
                            orderId: order.id,
                            reason: '',
                            isLoading: false
                          });
                        }}
                        className="rounded-lg border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800/90 transition-all duration-200 ease-out hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 active:scale-[0.98]"
                      >
                        İptal Et
                      </button>
                    )}

                    {/* QR Kodları Yazdır Butonu - CANCELLED hariç, CONFIRMED veya READY durumunda ve QR kodları varsa */}
                    {order.status !== 'CANCELLED' && (order.status === 'CONFIRMED' || order.status === 'READY') && order.qr_codes && order.qr_codes.length > 0 && (
                      <button
                        onClick={() => openQRLabel(order)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#00365a] px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                        title="QR Etiketleri Yazdır (10x15 cm)"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        QR Yazdır
                      </button>
                    )}

                    {/* Fiş durumu göstergesi - Sadece DELIVERED durumunda */}
                    {order.status === 'DELIVERED' && (
                      <div className="flex items-center gap-2 sm:justify-end">
                        {order.receipt_printed ? (
                          <div className="inline-flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800/80">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Fiş Yazdırıldı
                            {order.receipt_printed_at && (
                              <span className="ml-1 text-xs text-emerald-700/70">
                                ({new Date(order.receipt_printed_at).toLocaleDateString('tr-TR')})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 rounded-md border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800/80">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Fiş Yazdırılmadı
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin/Editor için fiş yazdır butonu - sadece DELIVERED durumunda, yazdırılmamış fişler için ve canSeePrice=true olanlar için */}
                    {isAdminOrEditor && order.status === 'DELIVERED' && !order.receipt_printed && user?.canSeePrice === true && (
                      <button
                        onClick={async () => {
                          try {
                            const receiptData = await getOrderReceiptFromAPI(order.id);
                            
                            // Detaylı fiş sayfasını yeni sekmede aç ve otomatik yazdır
                            const receiptWindow = window.open('', '_blank', 'width=800,height=600');
                            if (receiptWindow) {
                              receiptWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Sipariş Fişi - ${order.id.slice(0, 8)}</title>
                                    <meta charset="utf-8">
                                    <style>
                                      * { margin: 0; padding: 0; box-sizing: border-box; }
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        line-height: 1.4; 
                                        color: #333; 
                                        max-width: 800px; 
                                        margin: 0 auto; 
                                        padding: 20px;
                                        background: white;
                                      }
                                      .header { 
                                        text-align: center; 
                                        border-bottom: 2px solid #000; 
                                        padding-bottom: 20px; 
                                        margin-bottom: 30px; 
                                      }
                                      .header h1 { 
                                        font-size: 24px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                      }
                                      .section { 
                                        margin-bottom: 25px; 
                                        padding: 15px; 
                                        border: 1px solid #000; 
                                        border-radius: 0; 
                                      }
                                      .section h3 { 
                                        font-size: 16px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                        border-bottom: 1px solid #000; 
                                        padding-bottom: 5px; 
                                      }
                                      .info-grid { 
                                        display: grid; 
                                        grid-template-columns: 1fr 1fr; 
                                        gap: 15px; 
                                        margin-bottom: 15px; 
                                      }
                                      .info-item { 
                                        display: flex; 
                                        justify-content: space-between; 
                                      }
                                      .info-item strong { 
                                        color: #000; 
                                      }
                                      table { 
                                        width: 100%; 
                                        border-collapse: collapse; 
                                        margin-top: 10px; 
                                      }
                                      th, td { 
                                        border: 1px solid #000; 
                                        padding: 8px; 
                                        text-align: left; 
                                      }
                                      th { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }
                                      .total-row { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }
                                      .footer { 
                                        margin-top: 30px; 
                                        text-align: center; 
                                        font-size: 12px; 
                                        color: #000; 
                                        border-top: 1px solid #000; 
                                        padding-top: 15px; 
                                      }
                                      @media print {
                                        body { font-size: 12px; }
                                        .section { break-inside: avoid; }
                                        @page { margin: 0; }
                                        * { -webkit-print-color-adjust: exact; }
                                      }
                                      @page { margin: 0; size: auto; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h1>PAŞA HOME</h1>
                                      <h2>SİPARİŞ FİŞİ</h2>
                                      <p>Fiş No: <strong>${receiptData.fis?.fisNumarasi || 'N/A'}</strong></p>
                                      <p>Sipariş No: <strong>${receiptData.siparis?.id || order.id}</strong></p>
                                      <p>Tarih: <strong>${receiptData.siparis?.olusturmaTarihi ? new Date(receiptData.siparis.olusturmaTarihi).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : new Date(order.created_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</strong></p>
                                      <p>Durum: <strong style="color: #000;">${statusLabels[receiptData.siparis?.durum || order.status] || (receiptData.siparis?.durum || order.status)}</strong></p>
                                    </div>

                                    <!-- Temel Bilgiler -->
                                    <div class="section">
                                      <h3>Sipariş Bilgileri</h3>
                                      <div class="info-grid">
                                        <div class="info-item">
                                          <span><strong>Mağaza:</strong></span>
                                          <span>${receiptData.magaza?.kurumAdi || order.store_name || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Müşteri:</strong></span>
                                          <span>${receiptData.musteri?.ad || order.user?.name || 'N/A'} ${receiptData.musteri?.soyad || order.user?.surname || ''}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Telefon:</strong></span>
                                          <span>${receiptData.musteri?.telefon || order.user?.phone || order.store_phone || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Adres:</strong></span>
                                          <span>${receiptData.musteri?.adres || order.delivery_address || (order.address ? order.address.address + ', ' + order.address.district + ' / ' + order.address.city : 'N/A')}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Tarihi:</strong></span>
                                          <span>${receiptData.siparis?.olusturmaTarihi ? new Date(receiptData.siparis.olusturmaTarihi).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : new Date(order.created_at).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Son Güncelleme:</strong></span>
                                          <span>${receiptData.siparis?.guncellemeTarihi ? new Date(receiptData.siparis.guncellemeTarihi).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : new Date(order.updated_at).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <!-- Sipariş Edilen Ürünler -->
                                    <div class="section">
                                      <h3>Sipariş Edilen Ürünler</h3>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Ürün Adı</th>
                                            <th>Boyut (cm)</th>
                                            <th>Adet</th>
                                            <th>Birim Fiyat</th>
                                            <th>Toplam</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${receiptData.urunler && receiptData.urunler.length > 0 ? receiptData.urunler.map((urun: any) => `
                                            <tr>
                                              <td>
                                                ${urun.urunAdi || 'N/A'}
                                                ${urun.aciklama ? '<br><small>' + urun.aciklama + '</small>' : ''}
                                              </td>
                                              <td>${urun.olculer?.en || 'N/A'} × ${urun.olculer?.boy || 'N/A'}</td>
                                              <td>${urun.miktar || 0}</td>
                                              <td>${(urun.birimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                              <td>${(urun.toplamFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                            </tr>
                                          `).join('') : order.items.map(item => `
                                            <tr>
                                              <td>${item.product.name}</td>
                                              <td>${item.width} × ${item.height}</td>
                                              <td>${item.quantity}</td>
                                              <td>${parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(order, userCurrency)}</td>
                                              <td>${parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(order, userCurrency)}</td>
                                            </tr>
                                          `).join('')}
                                          <tr class="total-row">
                                            <td colspan="4"><strong>GENEL TOPLAM</strong></td>
                                            <td><strong>${getDisplayAmount(order, order.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(order, userCurrency)}</strong></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>

                                    <!-- Bakiye Bilgileri - sadece admin görebilir -->
                                    ${isAdmin && receiptData.bakiye ? `
                                    <div class="section">
                                      <h3>Bakiye Bilgileri</h3>
                                      <div class="info-grid">
                                        <div class="info-item">
                                          <span><strong>Sipariş Öncesi Bakiye:</strong></span>
                                          <span>${receiptData.bakiye.siparisOncesi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Sonrası Bakiye:</strong></span>
                                          <span>${receiptData.bakiye.siparisSonrasi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Kesinti Tutarı:</strong></span>
                                          <span>${receiptData.bakiye.siparisKesintisi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Bakiye Güncelleme Tarihi:</strong></span>
                                          <span>${new Date(receiptData.bakiye.tarih).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                      </div>
                                    </div>
                                    ` : ''}

                                    ${order.notes ? `
                                      <!-- Notlar -->
                                      <div class="section">
                                        <h3>Sipariş Notları</h3>
                                        <p>${order.notes}</p>
                                      </div>
                                    ` : ''}

                                    <!-- Footer -->
                                    <div class="footer">
                                      <p>Bu fiş ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
                                      <p>Sipariş takibi için lütfen sipariş numaranızı saklayınız.</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              receiptWindow.document.close();
                              
                              // Otomatik yazdırma
                              receiptWindow.onload = () => {
                                setTimeout(() => {
                                  receiptWindow.print();
                                  
                                  // Yazdırma işleminden sonra fiş durumunu güncelle
                                  setTimeout(async () => {
                                    try {
                                      await markReceiptAsPrinted(order.id);
                                      // Siparişleri yenile
                                      await fetchOrders(currentPage, statusFilter, receiptFilter, storeFilter, showAllOrders);
                                      if (isAdminOrEditor) {
                                        await fetchOrderStatusCounts();
                                      }
                                    } catch (error) {
                                      console.error('Fiş durumu güncelleme hatası:', error);
                                    }
                                  }, 1000); // Yazdırma dialogu kapandıktan sonra
                                }, 500);
                              };
                            }
                          } catch (error: any) {
                            console.error('Fiş alma hatası:', error);
                            alert('Fiş bilgileri alınamadı: ' + (error.message || 'Bilinmeyen hata'));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-700/85 px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        📄 Fiş Yazdır
                      </button>
                    )}

                    {/* Kargo Fişi Butonu - Sadece admin/editor için ve DELIVERED durumunda */}
                    {isAdminOrEditor && order.status === 'DELIVERED' && (
                      <button
                        onClick={() => {
                          setSelectedOrderForCargo(order);
                          setCargoReceiptVisible(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-700/90 px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/30 active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        📦 Kargo Fişi
                      </button>
                    )}

                    {/* İade Butonu - Sadece admin için ve DELIVERED durumunda */}
                    {isAdmin && order.status === 'DELIVERED' && (
                      <button
                        onClick={() => {
                          setCancelOrderModal({
                            isOpen: true,
                            orderId: order.id,
                            orderNumber: order.id.slice(0, 8),
                            isLoading: false,
                            reason: '',
                            isRefund: true
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200/70 bg-amber-700/85 px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/30 active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        🔄 İade Et
                      </button>
                    )}

                    {/* Admin/Editor için durum güncelleme butonları */}
                    {isAdminOrEditor && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        {order.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'CONFIRMED')}
                              disabled={updatingStatus}
                              className="rounded-lg bg-[#00365a] px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => {
                                setCancelOrderModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  orderNumber: order.id.slice(0, 8),
                                  isLoading: false,
                                  reason: ''
                                });
                              }}
                              disabled={updatingStatus}
                              className="rounded-lg border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800/90 transition-all duration-200 ease-out hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              İptal Et
                            </button>
                          </>
                        )}

                        {order.status === 'CONFIRMED' && (
                          <button
                            onClick={() => {
                              setCancelOrderModal({
                                isOpen: true,
                                orderId: order.id,
                                orderNumber: order.id.slice(0, 8),
                                isLoading: false,
                                reason: ''
                              });
                            }}
                            disabled={updatingStatus}
                            className="rounded-lg border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800/90 transition-all duration-200 ease-out hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            İptal Et
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <>
                            <button
                              onClick={() => {
                                setCancelOrderModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  orderNumber: order.id.slice(0, 8),
                                  isLoading: false,
                                  reason: ''
                                });
                              }}
                              disabled={updatingStatus}
                              className="rounded-lg border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800/90 transition-all duration-200 ease-out hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              İptal Et
                            </button>
                          </>
                        )}
                      </div>
                    )}
                      </div>

                      <button
                        onClick={() => handleViewOrderDetail(order.id)}
                        className="w-full rounded-lg border border-slate-200/80 bg-stone-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] sm:w-auto"
                      >
                        Detayları Gör
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Sayfalama - Mağaza filtresi aktif değilken göster */}
        {!loading && ordersData && ordersData.pagination && ordersData.pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center sm:mt-8">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(ordersData.pagination.page - 1)}
                disabled={!ordersData.pagination.hasPrev}
                className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const totalPages = ordersData.pagination.totalPages;
                  const current = ordersData.pagination.page;
                  const windowSize = 5;
                  let start = Math.max(1, current - Math.floor(windowSize / 2));
                  let end = Math.min(totalPages, start + windowSize - 1);
                  start = Math.max(1, end - windowSize + 1);
                  return Array.from({ length: end - start + 1 }, (_, i) => {
                    const page = start + i;
                    const isActive = page === current;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`min-w-[2.25rem] rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] ${
                          isActive
                            ? 'bg-[#00365a] text-white'
                            : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-stone-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => handlePageChange(ordersData.pagination.page + 1)}
                disabled={!ordersData.pagination.hasNext}
                className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}

        {/* Sipariş Detay Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              {/* Modal Header */}
              <div className="shrink-0 border-b border-slate-200/80 bg-stone-50/90 px-4 py-3.5 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex flex-wrap items-center gap-2.5">
                    <h3 className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
                      {selectedOrder.store_name}
                    </h3>
                    <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusColors[selectedOrder.status]}`}>
                      {statusLabels[selectedOrder.status]}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-all duration-200 ease-out hover:bg-stone-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                    aria-label="Kapat"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="overflow-y-auto p-4 sm:p-5 max-h-[calc(92vh-8rem)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                  {/* Sol taraf - Özet bilgiler */}
                  <div className="space-y-4">
                    <section>
                      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Sipariş Bilgileri
                      </h4>
                      <div className="rounded-lg border border-slate-200/80 bg-stone-50/50 divide-y divide-slate-100">
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                          <span className="text-sm text-slate-500">Tarih</span>
                          <span className="text-right text-sm text-slate-800">
                            {new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {selectedOrder.status === 'DELIVERED' && (
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <span className="text-sm text-slate-500">Fiş</span>
                            {selectedOrder.receipt_printed ? (
                              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800/80">
                                Yazdırıldı
                                {selectedOrder.receipt_printed_at && (
                                  <span className="text-emerald-700/70">
                                    ({new Date(selectedOrder.receipt_printed_at).toLocaleDateString('tr-TR')})
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md border border-amber-200/60 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800/80">
                                Yazdırılmadı
                              </span>
                            )}
                          </div>
                        )}

                        {user?.canSeePrice && (
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <span className="text-sm text-slate-500">Toplam</span>
                            <span className="text-sm font-semibold tabular-nums text-[#00365a]">
                              {getDisplayAmount(selectedOrder, selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencyDisplay(selectedOrder, userCurrency)}
                            </span>
                          </div>
                        )}
                      </div>
                    </section>

                    {isAdminOrEditor && selectedOrder.user && (
                      <section>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Müşteri
                        </h4>
                        <div className="rounded-lg border border-slate-200/80 bg-stone-50/50 divide-y divide-slate-100">
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <span className="text-sm text-slate-500">Ad Soyad</span>
                            <span className="text-sm text-slate-800">{selectedOrder.user.name} {selectedOrder.user.surname}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <span className="text-sm text-slate-500">E-posta</span>
                            <span className="break-all text-right text-sm text-slate-800">{selectedOrder.user.email}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                            <span className="text-sm text-slate-500">Telefon</span>
                            <span className="text-sm text-slate-800">{selectedOrder.user.phone}</span>
                          </div>
                        </div>
                      </section>
                    )}

                    <section>
                      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mağaza & Teslimat
                      </h4>
                      <div className="rounded-lg border border-slate-200/80 bg-stone-50/50 divide-y divide-slate-100">
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                          <span className="text-sm text-slate-500">Mağaza</span>
                          <span className="text-right text-sm font-medium text-slate-800">{selectedOrder.store_name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                          <span className="text-sm text-slate-500">Vergi No</span>
                          <span className="font-mono text-sm text-slate-800">{selectedOrder.store_tax_number}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                          <span className="text-sm text-slate-500">Telefon</span>
                          <span className="text-sm text-slate-800">{selectedOrder.store_phone}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                          <span className="text-sm text-slate-500">E-posta</span>
                          <span className="break-all text-right text-sm text-slate-800">{selectedOrder.store_email}</span>
                        </div>
                        <div className="px-3.5 py-2.5">
                          <span className="mb-1.5 block text-sm text-slate-500">Teslimat Adresi</span>
                          {selectedOrder.address ? (
                            <div className="text-sm text-slate-800">
                              {selectedOrder.address.title && (
                                <div className="font-medium">{selectedOrder.address.title}</div>
                              )}
                              <p className="mt-0.5 text-slate-600">{selectedOrder.address.address}</p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {selectedOrder.address.district && selectedOrder.address.district + ', '}
                                {selectedOrder.address.city}
                                {selectedOrder.address.postal_code && ' - ' + selectedOrder.address.postal_code}
                              </p>
                              {selectedOrder.address.is_default && (
                                <span className="mt-2 inline-block rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800/80">
                                  Varsayılan Adres
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-800">{selectedOrder.delivery_address || '—'}</span>
                          )}
                        </div>
                      </div>
                    </section>

                    {selectedOrder.notes && (
                      <section>
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sipariş Notu
                        </h4>
                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/70 px-3.5 py-2.5 text-sm text-amber-900/80">
                          {selectedOrder.notes}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Sağ taraf - Ürünler */}
                  <div>
                    <div className="mb-3 flex items-baseline justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ürünler
                      </h4>
                      <p className="text-xs text-slate-400">
                        {selectedOrder.items.reduce((total, item) => total + item.quantity, 0)} adet
                      </p>
                    </div>
                    <div className="space-y-2.5">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="rounded-lg border border-slate-200/80 bg-white p-3">
                          <div className="flex gap-3">
                            <Image
                              src={item.product.productImage || '/placeholder-product.jpg'}
                              alt={item.product.name}
                              width={56}
                              height={56}
                              className="h-14 w-14 shrink-0 rounded-md object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-product.jpg';
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <h5 className="truncate text-sm font-medium text-slate-900">{item.product.name}</h5>
                              {item.product.collection && (
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {item.product.collection.name}
                                </p>
                              )}
                              <div className="mt-1 text-xs text-slate-500">
                                {item.width}×{item.height} cm
                                {item.has_fringe ? ' · Saçaklı' : ' · Saçaksız'}
                                {item.cut_type && ` · ${translateCutType(item.cut_type)}`}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span className="text-sm text-slate-600">
                                  {item.quantity} adet{user?.canSeePrice ? ` × ${parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(selectedOrder, userCurrency)}` : ''}
                                </span>
                                {user?.canSeePrice && (
                                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                                    {parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {getCurrencyDisplay(selectedOrder, userCurrency)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Ürün Notu */}
                              {item.notes && (
                                <div className="mt-2 rounded-md border border-amber-200/60 bg-amber-50/70 px-2.5 py-1.5 text-xs text-amber-900/80">
                                  <span className="font-medium">Not:</span> {item.notes}
                                </div>
                              )}
                              
                              {/* Barcode bilgileri */}
                              {((selectedOrder.qr_codes && selectedOrder.qr_codes.filter(qr => qr.order_item_id === item.id).length > 0) ||
                                (selectedOrder.barcodes && selectedOrder.barcodes.filter(bc => bc.order_item_id === item.id).length > 0)) && (
                                <div className="mt-2 border-t border-slate-100 pt-2">
                                  <div className="mb-1.5 text-xs text-slate-500">Barkodlar</div>
                                  <div className="space-y-1">
                                    {/* QR codes'daki barkodlar */}
                                    {selectedOrder.qr_codes && selectedOrder.qr_codes
                                      .filter(qr => qr.order_item_id === item.id && qr.barcode)
                                      .map((qr, qrIndex) => (
                                        <div key={qr.id} className="flex items-center justify-between rounded-md bg-stone-50 px-2 py-1">
                                          <span className="font-mono text-xs text-slate-600">
                                            {qr.barcode}
                                          </span>
                                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                            qr.is_scanned 
                                              ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-800/80' 
                                              : 'border border-amber-200/60 bg-amber-50 text-amber-800/80'
                                          }`}>
                                            {qr.is_scanned ? 'Tarandı' : 'Bekliyor'}
                                          </span>
                                        </div>
                                      ))
                                    }
                                    {/* Barcodes array'indeki barkodlar */}
                                    {selectedOrder.barcodes && selectedOrder.barcodes
                                      .filter(bc => bc.order_item_id === item.id)
                                      .map((bc, bcIndex) => (
                                        <div key={bc.id} className="flex items-center justify-between rounded-md bg-stone-50 px-2 py-1">
                                          <span className="font-mono text-xs text-slate-600">
                                            {bc.barcode}
                                          </span>
                                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                            bc.is_scanned 
                                              ? 'border border-emerald-200/60 bg-emerald-50 text-emerald-800/80' 
                                              : 'border border-amber-200/60 bg-amber-50 text-amber-800/80'
                                          }`}>
                                            {bc.is_scanned ? 'Tarandı' : 'Bekliyor'}
                                          </span>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* QR Kodları Bölümü - CANCELLED durumunda gösterme */}
                    {selectedOrder.status !== 'CANCELLED' && selectedOrder.qr_codes && selectedOrder.qr_codes.length > 0 && (
                      <div className="mt-5">
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">QR Kodları</h4>
                          <button
                            onClick={() => openQRLabel(selectedOrder)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00365a] px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                            title="QR Etiketleri Yazdır (10x15 cm)"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            QR Yazdır
                          </button>
                        </div>
                        <div className="rounded-lg border border-slate-200/80 bg-stone-50/80 p-3.5">
                          {/* QR İstatistikleri */}
                          <div className="mb-3">
                            <div className="mb-2.5 grid grid-cols-3 gap-2">
                              <div className="rounded-md bg-white px-2 py-2 text-center border border-slate-200/60">
                                <div className="text-lg font-semibold tabular-nums text-[#00365a]">
                                  {selectedOrder.items.reduce((total, item) => total + item.quantity, 0)}
                                </div>
                                <div className="text-[11px] text-slate-500">QR Kod</div>
                              </div>
                              <div className="rounded-md bg-white px-2 py-2 text-center border border-slate-200/60">
                                <div className="text-lg font-semibold tabular-nums text-amber-800/80">
                                  {selectedOrder.qr_codes
                                    .filter(qr => qr.first_scan_at && !qr.second_scan_at)
                                    .reduce((total, qr) => {
                                      const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                      return total + (item ? item.quantity : 0);
                                    }, 0)}
                                </div>
                                <div className="text-[11px] text-slate-500">Hazır</div>
                              </div>
                              <div className="rounded-md bg-white px-2 py-2 text-center border border-slate-200/60">
                                <div className="text-lg font-semibold tabular-nums text-emerald-700/90">
                                  {selectedOrder.qr_codes
                                    .filter(qr => qr.second_scan_at)
                                    .reduce((total, qr) => {
                                      const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                      return total + (item ? item.quantity : 0);
                                    }, 0)}
                                </div>
                                <div className="text-[11px] text-slate-500">Tamamlandı</div>
                              </div>
                            </div>
                            
                            {/* Genel İlerleme Çubuğu */}
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                              <div className="h-3 flex">
                                {/* Tamamlanmış kısım - yeşil */}
                                <div 
                                  className="bg-emerald-600/80 transition-all duration-300" 
                                  style={{
                                    width: `${(() => {
                                      const totalQuantity = selectedOrder.items.reduce((total, item) => total + item.quantity, 0);
                                      const completedQuantity = selectedOrder.qr_codes
                                        .filter(qr => qr.second_scan_at)
                                        .reduce((total, qr) => {
                                          const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                          return total + (item ? item.quantity : 0);
                                        }, 0);
                                      return totalQuantity > 0 ? (completedQuantity / totalQuantity) * 100 : 0;
                                    })()}%`
                                  }}
                                ></div>
                                {/* Hazır kısım - turuncu */}
                                <div 
                                  className="bg-amber-500/80 transition-all duration-300" 
                                  style={{
                                    width: `${(() => {
                                      const totalQuantity = selectedOrder.items.reduce((total, item) => total + item.quantity, 0);
                                      const readyQuantity = selectedOrder.qr_codes
                                        .filter(qr => qr.first_scan_at && !qr.second_scan_at)
                                        .reduce((total, qr) => {
                                          const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                          return total + (item ? item.quantity : 0);
                                        }, 0);
                                      return totalQuantity > 0 ? (readyQuantity / totalQuantity) * 100 : 0;
                                    })()}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-center text-sm text-slate-600 mt-1">
                              {(() => {
                                const totalQuantity = selectedOrder.items.reduce((total, item) => total + item.quantity, 0);
                                const completedQuantity = selectedOrder.qr_codes
                                  .filter(qr => qr.second_scan_at)
                                  .reduce((total, qr) => {
                                    const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                    return total + (item ? item.quantity : 0);
                                  }, 0);
                                const readyQuantity = selectedOrder.qr_codes
                                  .filter(qr => qr.first_scan_at && !qr.second_scan_at)
                                  .reduce((total, qr) => {
                                    const item = selectedOrder.items.find(i => i.id === qr.order_item_id);
                                    return total + (item ? item.quantity : 0);
                                  }, 0);
                                const completedPercentage = totalQuantity > 0 ? Math.round((completedQuantity / totalQuantity) * 100) : 0;
                                const readyPercentage = totalQuantity > 0 ? Math.round((readyQuantity / totalQuantity) * 100) : 0;
                                
                                return (
                                  <>
                                    {completedPercentage}% Tamamlandı
                                    {readyPercentage > 0 && ` • ${readyPercentage}% Hazır`}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          
                          {/* QR Kod Detayları */}
                          <div className="space-y-3">
                            {selectedOrder.qr_codes.map((qrCode, index) => (
                              <div 
                                key={qrCode.id}
                                className={`flex items-center justify-between p-3 rounded ${
                                  qrCode.is_scanned ? 'border border-emerald-200/60 bg-emerald-50/70' : 'border border-slate-200/80 bg-white'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <Image
                                      src={qrCode.product.productImage || '/placeholder-product.jpg'}
                                      alt={qrCode.product.name}
                                      width={48}
                                      height={48}
                                      className="w-12 h-12 object-cover rounded"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-product.jpg';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">
                                      {qrCode.product.name}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {qrCode.order_item.width}×{qrCode.order_item.height} cm • 
                                      {qrCode.order_item.has_fringe ? ' Saçaklı' : ' Saçaksız'} • 
                                      {translateCutType(qrCode.order_item.cut_type)}
                                    </div>
                                    <div className="mt-1 text-xs text-[#00365a]/80">
                                      Adet: {qrCode.order_item.quantity} • 
                                      Tarama: {qrCode.first_scan_at ? (qrCode.second_scan_at ? '2/2' : '1/2') : '0/2'}
                                    </div>
                                    <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-200">
                                      <div 
                                        className="h-1.5 rounded-full bg-emerald-600/80" 
                                        style={{width: `${qrCode.second_scan_at ? 100 : (qrCode.first_scan_at ? 50 : 0)}%`}}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {qrCode.is_scanned ? (
                                    <div className="text-xs text-center">
                                      <span className="text-emerald-700/80 font-medium">✓ Tamamlandı</span>
                                      {qrCode.second_scan_at && (
                                        <div className="text-slate-500">
                                          {new Date(qrCode.second_scan_at).toLocaleDateString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : qrCode.first_scan_at ? (
                                    <div className="text-xs text-center">
                                      <span className="text-orange-600 font-medium">
                                        Hazır - 2. okuma bekliyor
                                      </span>
                                      {qrCode.first_scan_at && (
                                        <div className="text-slate-500">
                                          1. Okuma: {new Date(qrCode.first_scan_at).toLocaleDateString('tr-TR', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-center">
                                      <span className="text-yellow-600 font-medium">
                                        Bekliyor
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1">
                                    <button
                                      onClick={() => {
                                        // QR kod detayını göster/indir
                                        const qrWindow = window.open('', '_blank');
                                        if (qrWindow) {
                                          qrWindow.document.write(`
                                            <html>
                                              <head><title>QR Kodu - ${qrCode.product.name}</title></head>
                                              <body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f0f0;">
                                                <div style="text-align: center; background: white; padding: 30px; max-width: 600px; margin: 20px;">
                                                  
                                                  <div style="margin: 20px 0;">
                                                    <img src="${qrCode.qrCodeImageUrl}" alt="QR Kod" style="max-width: 350px; max-height: 350px; border: 1px solid black;" onerror="this.innerHTML='<p>QR kod görseli yüklenemedi</p>'" />
                                                  </div>
                                                  
                                                  <!-- Adres Bilgileri -->
                                                  <div style="border: 1px solid black; padding: 15px; margin-bottom: 15px; text-align: left;">
                                                    <h3 style="color: black; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Teslimat Adresi</h3>
                                                    <p style="margin: 3px 0;"><strong>Mağaza:</strong> ${selectedOrder.store_name}</p>
                                                    ${selectedOrder.address ? `
                                                      <p style="margin: 3px 0;"><strong>Adres Başlığı:</strong> ${(selectedOrder.address as any).title}</p>
                                                      <p style="margin: 3px 0; line-height: 1.4;"><strong>Adres:</strong> ${(selectedOrder.address as any).address}</p>
                                                      <p style="margin: 3px 0;"><strong>Şehir/İlçe:</strong> ${(selectedOrder.address as any).district ? (selectedOrder.address as any).district + ', ' : ''}${(selectedOrder.address as any).city}</p>
                                                      ${(selectedOrder.address as any).postal_code ? `<p style="margin: 3px 0;"><strong>Posta Kodu:</strong> ${(selectedOrder.address as any).postal_code}</p>` : ''}
                                                    ` : `
                                                      ${selectedOrder.address ? `
                                                        <p style="margin: 3px 0; line-height: 1.4; font-weight: bold;">${(selectedOrder.address as any).title}</p>
                                                        <p style="margin: 3px 0; line-height: 1.4;">${(selectedOrder.address as any).address}</p>
                                                        <p style="margin: 3px 0; line-height: 1.4;">${(selectedOrder.address as any).district} / ${(selectedOrder.address as any).city}</p>
                                                        ${(selectedOrder.address as any).postal_code ? `<p style="margin: 3px 0; line-height: 1.4;">Posta Kodu: ${(selectedOrder.address as any).postal_code}</p>` : ''}
                                                      ` : `
                                                        <p style="margin: 3px 0; line-height: 1.4;">${selectedOrder.delivery_address}</p>
                                                      `}
                                                    `}
                                                    <p style="margin: 3px 0;"><strong>Telefon:</strong> ${selectedOrder.user?.Store?.telefon || selectedOrder.store_phone}</p>
                                                    <p style="margin: 3px 0;"><strong>E-posta:</strong> ${selectedOrder.store_email}</p>
                                                  </div>
                                                  
                                                  <!-- Bu QR koda ait ürün bilgileri -->
                                                  <div style="border: 1px solid black; padding: 15px; margin-bottom: 15px; text-align: left;">
                                                    <h3 style="color: #2563eb; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">${qrCode.product.name}</h3>
                                                    <p style="margin: 3px 0;"><strong>Boyut:</strong> ${qrCode.order_item.width}×${qrCode.order_item.height} cm</p>
                                                    <p style="margin: 3px 0;"><strong>Adet:</strong> ${qrCode.order_item.quantity}</p>
                                                    <p style="margin: 3px 0;"><strong>Saçak:</strong> ${qrCode.order_item.has_fringe ? 'Saçaklı' : 'Saçaksız'}</p>
                                                    <p style="margin: 3px 0;"><strong>Kesim Türü:</strong> ${translateCutType(qrCode.order_item.cut_type)}</p>
                                                  </div>
                                                </div>
                                              </body>
                                            </html>
                                          `);
                                          qrWindow.document.close();
                                        }
                                      }}
                                      className="text-[#00365a] hover:text-[#004170] text-xs underline"
                                    >
                                      Göster
                                    </button>
                                    
                                    {/* QR Okutma Butonu - Sadece admin/editor için */}
                                    {isAdminOrEditor && (
                                      <button
                                        onClick={() => {
                                          // QR kod ID'sini kullanarak backend scan sayfasına yönlendir
                                          window.open(qrCode.qr_code, '_blank');
                                        }}
                                        disabled={qrCode.second_scan_at !== null}
                                        className="text-xs text-emerald-700/80 underline transition-colors duration-150 hover:text-emerald-900 disabled:cursor-not-allowed disabled:text-slate-400"
                                      >
                                        {qrCode.second_scan_at ? 'Tamamlandı' : (qrCode.first_scan_at ? '2. Okuma' : '1. Okuma')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fiş Görüntüle Butonu - Sadece DELIVERED durumunda ve canSeePrice yetkisi olan kullanıcılar için */}
                    {selectedOrder.status === 'DELIVERED' && user?.canSeePrice && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={async () => {
                            try {
                              const receiptData = await getOrderReceiptFromAPI(selectedOrder.id);
                              
                              // Fiş sayfasını yeni sekmede aç
                              const receiptWindow = window.open('', '_blank', 'width=800,height=600');
                              if (receiptWindow) {
                                receiptWindow.document.write(`
                                <!DOCTYPE html>
                                <html>
                                  <head>
                                    <title>Sipariş Fişi - ${selectedOrder.id.slice(0, 8)}</title>
                                    <meta charset="utf-8">
                                    <style>
                                      * { margin: 0; padding: 0; box-sizing: border-box; }
                                      body { 
                                        font-family: Arial, sans-serif; 
                                        line-height: 1.4; 
                                        color: #333; 
                                        max-width: 800px; 
                                        margin: 0 auto; 
                                        padding: 20px;
                                        background: white;
                                      }
                                      .header { 
                                        text-align: center; 
                                        border-bottom: 2px solid #000; 
                                        padding-bottom: 20px; 
                                        margin-bottom: 30px; 
                                      }
                                      .header h1 { 
                                        font-size: 24px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                      }
                                      .section { 
                                        margin-bottom: 25px; 
                                        padding: 15px; 
                                        border: 1px solid #000; 
                                        border-radius: 0; 
                                      }
                                      .section h3 { 
                                        font-size: 16px; 
                                        margin-bottom: 10px; 
                                        color: #000; 
                                        border-bottom: 1px solid #000; 
                                        padding-bottom: 5px; 
                                      }
                                      .info-grid { 
                                        display: grid; 
                                        grid-template-columns: 1fr 1fr; 
                                        gap: 15px; 
                                        margin-bottom: 15px; 
                                      }
                                      .info-item { 
                                        display: flex; 
                                        justify-content: space-between; 
                                      }
                                      .info-item strong { 
                                        color: #000; 
                                      }
                                      table { 
                                        width: 100%; 
                                        border-collapse: collapse; 
                                        margin-top: 10px; 
                                      }
                                      th, td { 
                                        border: 1px solid #000; 
                                        padding: 8px; 
                                        text-align: left; 
                                      }
                                      th { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }
                                      .total-row { 
                                        background-color: #fff; 
                                        font-weight: bold; 
                                      }

                                      .footer { 
                                        margin-top: 30px; 
                                        text-align: center; 
                                        font-size: 12px; 
                                        color: #000; 
                                        border-top: 1px solid #000; 
                                        padding-top: 15px; 
                                      }
                                      .print-button {
                                        position: fixed;
                                        top: 20px;
                                        right: 20px;
                                        background: #007bff;
                                        color: white;
                                        border: none;
                                        padding: 10px 20px;
                                        border-radius: 5px;
                                        cursor: pointer;
                                        font-size: 14px;
                                        z-index: 1000;
                                      }
                                      .print-button:hover {
                                        background: #0056b3;
                                      }
                                      @media print {
                                        body { font-size: 12px; }
                                        .section { break-inside: avoid; }
                                        .print-button { display: none; }
                                        @page { margin: 0; }
                                        * { -webkit-print-color-adjust: exact; }
                                      }
                                      @page { margin: 0; size: auto; }
                                    </style>
                                  </head>
                                  <body>
                                    <!-- Print Button -->
                                    <button class="print-button" onclick="window.print()">🖨️ Yazdır</button>
                                    
                                    <!-- Header -->
                                    <div class="header">
                                      <h1>PAŞA HOME</h1>
                                      <h2>SİPARİŞ FİŞİ</h2>
                                      <p>Fiş No: <strong>${receiptData.fis?.fisNumarasi || 'N/A'}</strong></p>
                                      <p>Sipariş No: <strong>${receiptData.siparis?.id || selectedOrder.id}</strong></p>
                                      <p>Tarih: <strong>${receiptData.siparis?.olusturmaTarihi ? new Date(receiptData.siparis.olusturmaTarihi).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}</strong></p>
                                      <p>Durum: <strong style="color: #000;">${statusLabels[receiptData.siparis?.durum || selectedOrder.status] || (receiptData.siparis?.durum || selectedOrder.status)}</strong></p>
                                    </div>

                                    <!-- Temel Bilgiler -->
                                    <div class="section">
                                      <h3>Sipariş Bilgileri</h3>
                                      <div class="info-grid">
                                        <div class="info-item">
                                          <span><strong>Mağaza:</strong></span>
                                          <span>${receiptData.magaza?.kurumAdi || selectedOrder.store_name || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Müşteri:</strong></span>
                                          <span>${receiptData.musteri?.ad || selectedOrder.user?.name || 'N/A'} ${receiptData.musteri?.soyad || selectedOrder.user?.surname || ''}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Tarihi:</strong></span>
                                          <span>${receiptData.siparis?.olusturmaTarihi ? new Date(receiptData.siparis.olusturmaTarihi).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : new Date(selectedOrder.created_at).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Son Güncelleme:</strong></span>
                                          <span>${receiptData.siparis?.guncellemeTarihi ? new Date(receiptData.siparis.guncellemeTarihi).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          }) : new Date(selectedOrder.updated_at).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <!-- Sipariş Edilen Ürünler -->
                                    <div class="section">
                                      <h3>Sipariş Edilen Ürünler</h3>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Ürün Adı</th>
                                            <th>Boyut (cm)</th>
                                            <th>Adet</th>
                                            <th>Birim Fiyat</th>
                                            <th>Toplam</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${receiptData.urunler && receiptData.urunler.length > 0 ? receiptData.urunler.map((urun: any) => `
                                            <tr>
                                              <td>
                                                ${urun.urunAdi || 'N/A'}
                                                ${urun.aciklama ? '<br><small>' + urun.aciklama + '</small>' : ''}
                                              </td>
                                              <td>${urun.olculer?.en || 'N/A'} × ${urun.olculer?.boy || 'N/A'}</td>
                                              <td>${urun.miktar || 0}</td>
                                              <td>${(urun.birimFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                              <td>${(urun.toplamFiyat || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                            </tr>
                                          `).join('') : selectedOrder.items.map(item => `
                                            <tr>
                                              <td>${item.product.name}</td>
                                              <td>${item.width} × ${item.height}</td>
                                              <td>${item.quantity}</td>
                                              <td>${parseFloat(item.unit_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(selectedOrder, userCurrency)}</td>
                                              <td>${parseFloat(item.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(selectedOrder, userCurrency)}</td>
                                            </tr>
                                          `).join('')}
                                          <tr class="total-row">
                                            <td colspan="4"><strong>GENEL TOPLAM</strong></td>
                                            <td><strong>${getDisplayAmount(selectedOrder, selectedOrder.total_price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${getCurrencyDisplay(selectedOrder, userCurrency)}</strong></td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>

                                    <!-- Bakiye Bilgileri - sadece admin görebilir -->
                                    ${isAdmin && receiptData.bakiye ? `
                                    <div class="section">
                                      <h3>Bakiye Bilgileri</h3>
                                      <div class="info-grid">
                                        <div class="info-item">
                                          <span><strong>Sipariş Öncesi Bakiye:</strong></span>
                                          <span>${receiptData.bakiye.siparisOncesi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Sonrası Bakiye:</strong></span>
                                          <span>${receiptData.bakiye.siparisSonrasi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Sipariş Kesinti Tutarı:</strong></span>
                                          <span>${receiptData.bakiye.siparisKesintisi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                        </div>
                                        <div class="info-item">
                                          <span><strong>Bakiye Güncelleme Tarihi:</strong></span>
                                          <span>${new Date(receiptData.bakiye.tarih).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}</span>
                                        </div>
                                      </div>
                                    </div>
                                    ` : ''}

                                    ${selectedOrder.notes ? `
                                      <!-- Notlar -->
                                      <div class="section">
                                        <h3>Sipariş Notları</h3>
                                        <p>${selectedOrder.notes}</p>
                                      </div>
                                    ` : ''}

                                    <!-- Footer -->
                                    <div class="footer">
                                      <p>Bu fiş ${new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</p>
                                      <p>Sipariş takibi için lütfen sipariş numaranızı saklayınız.</p>
                                    </div>
                                  </body>
                                </html>
                              `);
                              receiptWindow.document.close();
                              }
                            } catch (error: any) {
                              console.error('Fiş alma hatası:', error);
                              alert('Fiş bilgileri alınamadı: ' + (error.message || 'Bilinmeyen hata'));
                            }
                          }}
                          className="rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                        >
                          📄 Fiş Görüntüle
                        </button>
                      </div>
                    )}

                    {/* QR Kodu yoksa ama sipariş onaylanmış veya hazır durumda (CANCELLED hariç) */}
                    {isAdminOrEditor && selectedOrder.status !== 'CANCELLED' && (selectedOrder.status === 'CONFIRMED' || selectedOrder.status === 'READY') && (!selectedOrder.qr_codes || selectedOrder.qr_codes.length === 0) && (
                      <div className="mt-5">
                        <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">QR Kodları</h4>
                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/70 px-3.5 py-4 text-center">
                          <p className="mb-3 text-sm text-amber-900/80">Bu sipariş için henüz QR kodları oluşturulmamış.</p>
                          <button
                            onClick={async () => {
                              try {
                                setUpdatingStatus(true);
                                await generateQRCodes(selectedOrder.id);
                                // QR kodları oluşturulduktan sonra sipariş detayını yenile
                                await handleViewOrderDetail(selectedOrder.id);
                                alert('QR kodları başarıyla oluşturuldu!');
                              } catch (error: any) {

                                alert('QR kodları oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
                              } finally {
                                setUpdatingStatus(false);
                              }
                            }}
                            disabled={updatingStatus}
                            className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingStatus ? 'QR Kodları Oluşturuluyor...' : 'QR Kodları Oluştur'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 border-t border-slate-200/80 bg-stone-50/80 px-4 py-3 sm:px-5">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 sm:justify-start">
                    {isAdminOrEditor && selectedOrder.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CONFIRMED')}
                          disabled={updatingStatus}
                          className="rounded-lg bg-[#00365a] px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingStatus ? 'Güncelleniyor...' : 'Onayla'}
                        </button>
                        <button
                          onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'CANCELED')}
                          disabled={updatingStatus}
                          className="rounded-lg border border-rose-200/70 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-800/90 transition-all duration-200 ease-out hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingStatus ? 'Güncelleniyor...' : 'İptal Et'}
                        </button>
                      </>
                    )}
                    {isAdminOrEditor && selectedOrder.status === 'SHIPPED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, 'DELIVERED')}
                        disabled={updatingStatus}
                        className="rounded-lg bg-emerald-700/90 px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingStatus ? 'Güncelleniyor...' : 'Durumu Güncelle'}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-lg border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98]"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toplu Onaylama Sonuç Modal */}
        {bulkConfirmModal && bulkConfirmResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200/80 bg-white">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                    Toplu Onaylama Sonuçları
                  </h3>
                  <button
                    onClick={() => {
                      setBulkConfirmModal(false);
                      setBulkConfirmResult(null);
                    }}
                    className="rounded-lg p-1 text-slate-400 transition-colors duration-150 hover:bg-stone-100 hover:text-slate-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Özet */}
                <div className="mb-6 rounded-lg border border-slate-200/60 bg-stone-50/80 p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-semibold tabular-nums text-slate-900">{(bulkConfirmResult.data.success?.length || 0) + (bulkConfirmResult.data.failed?.length || 0)}</div>
                      <div className="text-sm text-slate-600">Toplam</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tabular-nums text-emerald-700/90">{bulkConfirmResult.data.success?.length || 0}</div>
                      <div className="text-sm text-slate-600">Başarılı</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tabular-nums text-rose-700/90">{bulkConfirmResult.data.failed?.length || 0}</div>
                      <div className="text-sm text-slate-600">Başarısız</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold tabular-nums text-[#00365a]">
                        {bulkConfirmResult.data.success?.length || 0} / {(bulkConfirmResult.data.success?.length || 0) + (bulkConfirmResult.data.failed?.length || 0)}
                      </div>
                      <div className="text-sm text-slate-600">Başarı Oranı</div>
                    </div>
                  </div>
                </div>

                {/* Başarılı Siparişler */}
                {bulkConfirmResult.data.success.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800/80">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Başarıyla Onaylanan Siparişler
                    </h4>
                    <div className="space-y-2">
                      {bulkConfirmResult.data.success.map((order) => (
                        <div key={order.orderId} className="rounded-lg border border-emerald-200/60 bg-emerald-50/70 p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-slate-900">
                                Sipariş #{order.orderId.slice(0, 8)}
                              </div>
                              <div className="mt-1 text-sm text-emerald-700/80">
                                Başarıyla onaylandı
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-slate-600">
                                  <span className="text-emerald-700/80">✓ QR Kodları Oluşturuldu</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Başarısız Siparişler */}
                {bulkConfirmResult.data.failed.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800/80">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Onaylanamayan Siparişler
                    </h4>
                    <div className="space-y-2">
                      {bulkConfirmResult.data.failed.map((order) => (
                        <div key={order.orderId} className="rounded-lg border border-rose-200/60 bg-rose-50/70 p-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              Sipariş #{order.orderId.slice(0, 8)}
                            </div>
                            <div className="mt-1 text-sm text-rose-700/80">
                              Hata: {order.error}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  {bulkConfirmResult.data.success.length > 0 && (
                    <button
                      onClick={async () => {
                        // Başarılı siparişlerin ID'lerini al
                        const successOrderIds = bulkConfirmResult.data.success.map(s => s.orderId);
                        
                        // Modal'ı kapat
                        setBulkConfirmModal(false);
                        setBulkConfirmResult(null);
                        
                        // QR'ları yazdır
                        await printBulkQRCodesForOrders(successOrderIds);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Tüm QR'ları Yazdır
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setBulkConfirmModal(false);
                      setBulkConfirmResult(null);
                    }}
                    className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                  >
                    Tamam
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sipariş İptal Modal */}
        {cancelOrderModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200/80 bg-white">
              <div className="p-6">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 mb-4">
                  {cancelOrderModal.isRefund ? 'Siparişi İade Et' : 'Siparişi İptal Et'}
                </h3>
                
                <div className="mb-4">
                  <p className="mb-4 text-sm text-slate-500">
                    {cancelOrderModal.isRefund 
                      ? 'Bu siparişi iade etmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve sipariş tutarı müşteri bakiyesine iade edilecektir.'
                      : `Bu siparişi iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz${user?.canSeePrice ? ' ve sipariş tutarı bakiyenize iade edilecektir' : ''}.`
                    }
                  </p>
                  
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    {cancelOrderModal.isRefund ? 'İade Nedeni (İsteğe bağlı)' : 'İptal Nedeni (İsteğe bağlı)'}
                  </label>
                  <textarea
                    value={cancelOrderModal.reason}
                    onChange={(e) => setCancelOrderModal(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 transition-all duration-200 ease-out placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400/25"
                    rows={3}
                    placeholder="Vazgeçtim, yanlış ürün seçtim, vb..."
                    maxLength={500}
                  />
                  <div className="mt-1 text-xs text-slate-400">
                    {cancelOrderModal.reason.length}/500 karakter
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setCancelOrderModal({
                      isOpen: false,
                      orderId: '',
                      reason: '',
                      isLoading: false,
                      isRefund: false
                    })}
                    disabled={cancelOrderModal.isLoading}
                    className="rounded-lg border border-slate-200/80 bg-stone-50 px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={() => {
                      if (cancelOrderModal.isRefund) {
                        handleRefundOrder(cancelOrderModal.orderId, cancelOrderModal.reason || undefined);
                      } else {
                        handleCancelOrder(cancelOrderModal.orderId, cancelOrderModal.reason || undefined);
                      }
                    }}
                    disabled={cancelOrderModal.isLoading}
                    className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                      cancelOrderModal.isRefund 
                        ? 'bg-amber-700/90 hover:bg-amber-800' 
                        : 'bg-rose-700/90 hover:bg-rose-800'
                    }`}
                  >
                    {cancelOrderModal.isLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {cancelOrderModal.isLoading 
                      ? (cancelOrderModal.isRefund ? 'İade Ediliyor...' : 'İptal Ediliyor...') 
                      : (cancelOrderModal.isRefund ? 'Siparişi İade Et' : 'Siparişi İptal Et')
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cargo Receipt Modal */}
        {cargoReceiptVisible && selectedOrderForCargo && (
          <CargoReceipt
            order={selectedOrderForCargo}
            isVisible={cargoReceiptVisible}
            onClose={() => {
              setCargoReceiptVisible(false);
              setSelectedOrderForCargo(null);
            }}
          />
        )}

        {/* QR Label Modal */}
        {qrLabelVisible && selectedOrderItemForQR && (
          <QRLabel
            orderData={{
              id: selectedOrderItemForQR.order.id,
              store_name: selectedOrderItemForQR.order.store_name,
              store_tax_number: selectedOrderItemForQR.order.store_tax_number,
              store_tax_office: selectedOrderItemForQR.order.store_tax_office,
              store_phone: selectedOrderItemForQR.order.store_phone,
              store_email: selectedOrderItemForQR.order.store_email,
              total_price: selectedOrderItemForQR.order.total_price,
              status: selectedOrderItemForQR.order.status,
              notes: selectedOrderItemForQR.order.notes,
              created_at: selectedOrderItemForQR.order.created_at,
              qr_codes: selectedOrderItemForQR.order.qr_codes || [],
              barcodes: selectedOrderItemForQR.order.barcodes || [],
              user: selectedOrderItemForQR.order.user,
              address: selectedOrderItemForQR.order.address,
              items: selectedOrderItemForQR.order.items.map(item => ({
                id: item.id,
                product: {
                  productId: item.product.productId,
                  name: item.product.name,
                  productImage: item.product.productImage
                },
                width: item.width,
                height: item.height,
                has_fringe: item.has_fringe,
                cut_type: item.cut_type,
                quantity: item.quantity,
                notes: item.notes,
                unit_price: item.unit_price,
                total_price: item.total_price
              }))
            }}
            isVisible={qrLabelVisible}
            onClose={() => {
              setQrLabelVisible(false);
              setSelectedOrderItemForQR(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Siparisler; 