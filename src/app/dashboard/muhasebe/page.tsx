'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getStores, getStorePriceLists, Store, PriceListProduct } from '../../../services/api';
import { useToken } from '@/app/hooks/useToken';

// Açıklama formatını güncelleyen fonksiyon
const formatAciklama = (transaction: any) => {
  // Admin Siparişi, Sipariş veya Sipariş İptali işlem türleri için özel format
  if ((transaction.islemTuru === 'Parekende Satış' || transaction.islemTuru === 'Satış' || transaction.islemTuru === 'Sipariş İptali')) {
    // orderDetails veya order alanından items'ı al
    let items = [];
    if (transaction.orderDetails && transaction.orderDetails.items) {
      items = transaction.orderDetails.items;
    } else if (transaction.order && transaction.order.items) {
      items = transaction.order.items;
    }
    
    if (items.length > 0) {
      let orderType = 'Sipariş';
      if (transaction.aciklama.includes('Admin Siparişi')) {
        orderType = 'Admin Siparişi';
      } else if (transaction.aciklama.includes('Sipariş İptali')) {
        orderType = 'Sipariş İptali';
      }
      
      // Currency bilgisini al
      const currency = transaction.currency || transaction.store?.currency || 'TRY';
      const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₺';
      
      const formattedItems = items.map((item: any) => {
        // Farklı veri yapıları için esnek alan adları
        const productName = item.productName || item.product?.name || 'Bilinmeyen Ürün';
        const width = item.width || item.product?.width || 0;
        const height = item.height || item.product?.height || 0;
        const quantity = item.quantity || 1;
        const unitPrice = item.unitPrice || item.unit_price || 0;
        const totalPrice = item.totalPrice || item.total_price || 0;
        
        const ebat = `${width}x${height}`;
        const m2 = item.areaM2 || (width * height / 10000);
        const fiyat = `${unitPrice} ${currencySymbol}`;
        const tutar = `${totalPrice} ${currencySymbol}`;
        
        // Sabit genişliklerle hizalama
        const productNameStr = productName.padEnd(20);
        const ebatStr = ebat.padEnd(10);
        const m2Str = `${m2}m²`.padEnd(8);
        const fiyatStr = fiyat.padEnd(12);
        const adetStr = `x ${quantity}`.padEnd(8);
        const tutarStr = tutar;
        
        return `${productNameStr} ${ebatStr} ${m2Str} ${fiyatStr} ${adetStr} ${tutarStr}`;
      }).join('\n');
      
      // Başlık satırını da aynı hizalama ile
      const header = `${'Ürün Adı'.padEnd(20)} ${'Ebat'.padEnd(10)} ${'m²'.padEnd(8)} ${'Fiyat'.padEnd(12)} ${'Adet'.padEnd(8)} ${'Tutar'}`;
      
      return `${orderType}\n${header}\n${formattedItems}`;
    }
  }
  
  // Diğer işlemler için mevcut açıklamayı döndür
  return transaction.aciklama;
};

// PriceListProduct'ı genişletiyoruz
interface ExtendedPriceListProduct extends PriceListProduct {
  displayName?: string;
  collection_code?: string;
  metreKareFiyati?: number;
}

interface MagazaBakiye {
  store_id: string;
  kurum_adi: string;
  bakiye: number;
  durum: 'ALACAKLI' | 'BORCLU' | 'DENGEDE';
  tutar: number;
  is_active: boolean;
}

interface Transaction {
  id: number;
  storeId: string;
  islemTuru: string;
  tutar: string;
  harcama: boolean;
  tarih: string;
  aciklama: string;
  createdAt: string;
  store: {
    store_id: string;
    kurum_adi: string;
    bakiye: number;
    durum: 'ALACAKLI' | 'BORCLU' | 'DENGEDE';
    tutar: number;
  };
}

interface AccountingResponseData {
  hareketler: Transaction[];
  magazaBakiyeleri?: MagazaBakiye[];
  adminKasaBakiyesi?: string;
  toplamAlacak?: number;
  adminVerecekMagazaSayisi?: number;
  adminAlacakliMagazaSayisi?: number;
  magazaBilgi?: any;
  magaza?: any;
  ozet?: any;
  pagination?: any;
}

interface AccountingData {
  responseData?: AccountingResponseData;
  hareketler?: Transaction[];
  magazaBakiyeleri?: MagazaBakiye[];
  adminKasaBakiyesi?: string;
  toplamAlacak?: number;
  adminVerecekMagazaSayisi?: number;
  adminAlacakliMagazaSayisi?: number;
  magazaBilgi?: any;
}

interface TransactionFormData {
  storeId: string;
  islemTuru: string;
  tutar: number;
  tarih: string;
  aciklama: string;
  // UI için gerekli ama API'ye gönderilmeyen alanlar
  collection_id?: string;
  square_meters?: number;
}

const MuhasebePage = () => {
  const { isAdmin, user } = useAuth();
  const token = useToken();
  const router = useRouter();
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);

  // canSeePrice kontrolü
  useEffect(() => {
    if (user && !user.canSeePrice) {
      router.push('/dashboard');
      return;
    }
  }, [user, router]);
  const [error, setError] = useState<string | null>(null);

  // Modal ve form state'leri
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<ExtendedPriceListProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [collections, setCollections] = useState<any[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<string[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);

  // Filtreleme state'i
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>(''); // 'gelir', 'gider', veya ''

  // Custom dropdown state'leri
  const [storeFilterDropdownOpen, setStoreFilterDropdownOpen] = useState(false);
  const [transactionTypeFilterDropdownOpen, setTransactionTypeFilterDropdownOpen] = useState(false);
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
  const [transactionTypeDropdownOpen, setTransactionTypeDropdownOpen] = useState(false);
  
  // Currency dropdown state'leri
  const [selectedCurrency, setSelectedCurrency] = useState<'TRY' | 'USD'>('TRY');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  const [formData, setFormData] = useState<TransactionFormData>({
    storeId: '',
    islemTuru: '',
    tutar: 0,
    tarih: new Date().toISOString().slice(0, 16),
    aciklama: '',
    collection_id: '',
    square_meters: 0
  });

  // İstek kontrolü için ref
  const hasFetchedRef = useRef(false);

  // Currency'ye göre fetch function'ı seç
  const fetchDataByCurrency = useCallback((forceRefresh = false) => {
    if (selectedCurrency === 'USD') {
      fetchUSDAccountingData(forceRefresh);
    } else {
      fetchAccountingData(forceRefresh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency, selectedStoreFilter]);

  // Currency'ye göre income/expense types getir
  const fetchTypesByCurrency = useCallback(() => {
    if (selectedCurrency === 'USD') {
      fetchUSDIncomeTypes();
      fetchUSDExpenseTypes();
    } else {
      fetchIncomeTypes();
      fetchExpenseTypes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency]);

  // Mağazaları getir
  const fetchStores = useCallback(async () => {
    try {
      let storesData;
      
      // Her durumda normal mağaza listesini al
      storesData = await getStores();
      
      // Seçili currency'ye göre filtrele
      if (storesData && storesData.length > 0) {
        if (selectedCurrency === 'USD') {
          // USD seçiliyse sadece USD currency'li mağazaları göster
          storesData = storesData.filter((store: any) => store.currency === 'USD');
        } else {
          // TRY seçiliyse sadece TRY currency'li mağazaları göster
          storesData = storesData.filter((store: any) => store.currency === 'TRY');
        }
      }

      setStores(storesData);
      setFilteredStores(storesData); // İlk başta tüm mağazaları göster
    } catch (error) {
      console.error('Mağazalar alınamadı:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurrency]);

  useEffect(() => {
    // Admin kontrolü
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    // Sadece bir kez çalışması için kontrol
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDataByCurrency(false);
      fetchStores();
      fetchTypesByCurrency();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Filtre değişimlerinde verileri yeniden getir
  useEffect(() => {
    // İlk yükleme kontrolü - hasFetchedRef.current true ise ve admin ise
    if (hasFetchedRef.current && isAdmin) {
      fetchDataByCurrency(true);
    }
  }, [selectedStoreFilter, startDate, endDate, selectedCurrency, fetchDataByCurrency]);

  // Currency değiştiğinde income/expense types'ı ve mağazaları yeniden getir
  useEffect(() => {
    if (isAdmin) {
      fetchTypesByCurrency();
      fetchStores();
    }
  }, [selectedCurrency, fetchTypesByCurrency, fetchStores, isAdmin]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setStoreFilterDropdownOpen(false);
        setTransactionTypeFilterDropdownOpen(false);
        setCustomerDropdownOpen(false);
        setCollectionDropdownOpen(false);
        setTransactionTypeDropdownOpen(false);
        setCurrencyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Modal açıldığında body scroll'u engelle
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const fetchAccountingData = async (forceRefresh = false, storeId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const authToken = token;
      if (!authToken) {
        throw new Error('Token bulunamadı');
      }

      // API URL'i oluştur - mağaza seçiliyse mağaza bazlı endpoint kullan
      let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}`;

      // storeId parametresi varsa onu kullan, yoksa state'den al
      const targetStoreId = storeId || selectedStoreFilter;

      if (targetStoreId) {
        // Mağaza bazlı endpoint
        apiUrl += `/api/admin/muhasebe/store/${targetStoreId}`;
      } else {
        // Tüm mağazalar için endpoint
        apiUrl += '/api/admin/muhasebe-hareketleri';
      }

      // Query parametrelerini oluştur
      const queryParams = new URLSearchParams();

      if (startDate) {
        queryParams.append('startDate', startDate);
      }

      if (endDate) {
        queryParams.append('endDate', endDate);
      }

      // Query parametreleri varsa URL'e ekle
      if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Veriler alınamadı');
      }

      // Mağaza bazlı veya genel veri yapısını handle et
      if (targetStoreId && (result.data.magaza || result.data.bakiyeDurumu)) {
        // Mağaza bazlı response - /api/admin/muhasebe/store/storeID
        const magazaData = result.data.magaza || result.data;
        const bakiyeDurumu = result.data.bakiyeDurumu || result.data.magaza;
        
        setData({
          hareketler: result.data.hareketler || [],
          magazaBakiyeleri: [{
            store_id: magazaData.store_id || magazaData.id,
            kurum_adi: magazaData.kurum_adi || magazaData.name,
            bakiye: bakiyeDurumu.bakiye || 0,
            tutar: bakiyeDurumu.bakiye || 0,
            is_active: magazaData.is_active || true,
            durum: bakiyeDurumu.durum || (bakiyeDurumu.bakiye > 0 ? 'ALACAKLI' : bakiyeDurumu.bakiye < 0 ? 'BORCLU' : 'DENGEDE')
          }],
          adminKasaBakiyesi: "0",
          toplamAlacak: 0,
          adminVerecekMagazaSayisi: 0,
          adminAlacakliMagazaSayisi: 1,
          magazaBilgi: magazaData,
          responseData: {
            hareketler: result.data.hareketler || [],
            magazaBilgi: magazaData,
            ozet: result.data.ozet || {},
            pagination: result.data.pagination || { total: result.data.total || 0 }
          }
        });
      } else {
        // Genel response - /api/admin/muhasebe-hareketleri
        setData({
          hareketler: result.data.hareketler || [],
          magazaBakiyeleri: result.data.magazaBakiyeleri || [],
          adminKasaBakiyesi: result.data.adminKasaBakiyesi || "0",
          toplamAlacak: result.data.toplamAlacak || 0,
          adminVerecekMagazaSayisi: result.data.adminVerecekMagazaSayisi || 0,
          adminAlacakliMagazaSayisi: result.data.adminAlacakliMagazaSayisi || 0,
          magazaBilgi: result.data.magazaBilgi,
          responseData: result.data
        });
      }
    } catch (error: any) {
      setError(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // USD Muhasebe verilerini getir
  const fetchUSDAccountingData = async (forceRefresh = false, storeId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const authToken = token;
      if (!authToken) {
        throw new Error('Token bulunamadı');
      }

      // USD API URL'i oluştur
      let apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}`;

      // storeId parametresi varsa onu kullan, yoksa state'den al
      const targetStoreId = storeId || selectedStoreFilter;

      if (targetStoreId) {
        // USD mağaza bazlı endpoint
        apiUrl += `/api/admin/usd-muhasebe/store/${targetStoreId}`;
      } else {
        // Tüm USD mağazalar için endpoint
        apiUrl += '/api/admin/usd-muhasebe/hareketler';
      }

      // Query parametrelerini oluştur
      const queryParams = new URLSearchParams();

      if (startDate) {
        queryParams.append('startDate', startDate);
      }

      if (endDate) {
        queryParams.append('endDate', endDate);
      }

      // Query parametreleri varsa URL'e ekle
      if (queryParams.toString()) {
        apiUrl += `?${queryParams.toString()}`;
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Mağaza bazlı veya genel veri yapısını handle et
        if (targetStoreId && result.data.bakiyeDurumu) {
          // Mağaza bazlı response - /api/admin/usd-muhasebe/store/storeID
          setData({
            hareketler: result.data.hareketler || [],
            magazaBakiyeleri: [{
              store_id: result.data.store_id,
              kurum_adi: result.data.kurum_adi,
              bakiye: result.data.bakiyeDurumu.bakiye || 0,
              tutar: result.data.bakiyeDurumu.tutar || 0,
              is_active: true,
              durum: result.data.bakiyeDurumu.durum || 'DENGEDE'
            }],
            adminKasaBakiyesi: "0",
            toplamAlacak: 0,
            adminVerecekMagazaSayisi: 0,
            adminAlacakliMagazaSayisi: 1,
            magazaBilgi: {
              store_id: result.data.store_id,
              kurum_adi: result.data.kurum_adi,
              bakiye: result.data.bakiyeDurumu.bakiye || 0,
              currency: result.data.bakiyeDurumu.currency || 'USD'
            },
            responseData: {
              hareketler: result.data.hareketler || [],
              magazaBilgi: {
                store_id: result.data.store_id,
                kurum_adi: result.data.kurum_adi,
                bakiye: result.data.bakiyeDurumu.bakiye || 0,
                currency: result.data.bakiyeDurumu.currency || 'USD'
              },
              ozet: {},
              pagination: { total: result.data.total || 0 }
            }
          });
        } else {
          // Genel response - /api/admin/usd-muhasebe/hareketler
          setData({
            hareketler: result.data.hareketler || [],
            magazaBakiyeleri: result.data.magazaBakiyeleri || [],
            adminKasaBakiyesi: result.data.adminKasaBakiyesi || "0",
            toplamAlacak: result.data.toplamAlacak || 0,
            adminVerecekMagazaSayisi: result.data.adminVerecekMagazaSayisi || 0,
            adminAlacakliMagazaSayisi: result.data.adminAlacakliMagazaSayisi || 0,
            magazaBilgi: result.data.magazaBilgi,
            responseData: result.data
          });
        }
      }
    } catch (error: any) {
      setError(error.message || 'USD muhasebe verileri alınamadı');
    } finally {
      setLoading(false);
    }
  };



  // USD Gelir türlerini getir
  const fetchUSDIncomeTypes = async () => {
    try {
      const authToken = token;
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/usd-muhasebe/income-types`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIncomeTypes(result.data);
        }
      }
    } catch (error) {
      console.error('USD Gelir türleri alınamadı:', error);
    }
  };

  // USD Gider türlerini getir
  const fetchUSDExpenseTypes = async () => {
    try {
      const authToken = token;
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/usd-muhasebe/expense-types`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExpenseTypes(result.data);
        }
      }
    } catch (error) {
      console.error('USD Gider türleri alınamadı:', error);
    }
  };

  // Türkçe karakterler için gelişmiş normalizasyon fonksiyonu
  const normalizeText = (text: string): string => {
    const turkishMap: { [key: string]: string } = {
      'İ': 'i', 'I': 'i', 'ı': 'i', 'i': 'i',
      'Ğ': 'g', 'ğ': 'g', 'G': 'g', 'g': 'g',
      'Ü': 'u', 'ü': 'u', 'U': 'u', 'u': 'u',
      'Ş': 's', 'ş': 's', 'S': 's', 's': 's',
      'Ö': 'o', 'ö': 'o', 'O': 'o', 'o': 'o',
      'Ç': 'c', 'ç': 'c', 'C': 'c', 'c': 'c'
    };

    return text
      .toLowerCase()
      .split('')
      .map(char => turkishMap[char] || char)
      .join('');
  };

  // Müşteri arama fonksiyonu
  const handleCustomerSearch = (searchTerm: string) => {
    setCustomerSearchTerm(searchTerm);

    if (searchTerm.trim() === '') {
      setFilteredStores(stores);
    } else {
      const normalizedSearch = normalizeText(searchTerm.trim());

      const filtered = stores.filter(store => {
        const normalizedStoreName = normalizeText(store.kurum_adi);
        const isMatch = normalizedStoreName.includes(normalizedSearch);

        if (isMatch) {
        }

        return isMatch;
      });

      setFilteredStores(filtered);
    }
  };

  // Gelir türlerini getir
  const fetchIncomeTypes = async () => {
    try {
      const authToken = token;
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/muhasebe/income-types`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIncomeTypes(result.data);
        }
      }
    } catch (error) {
      console.error('Gelir türleri alınamadı:', error);
    }
  };

  // Gider türlerini getir
  const fetchExpenseTypes = async () => {
    try {
      const authToken = token;
      if (!authToken) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/muhasebe/expense-types`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setExpenseTypes(result.data);
        }
      }
    } catch (error) {
      console.error('Gider türleri alınamadı:', error);
    }
  };

  // Seçilen müşteriye göre ürünleri getir
  const fetchProductsByCustomer = async (customerId: string) => {
    try {
      const priceListData: any = await getStorePriceLists(customerId);

      // Farklı veri yapılarını kontrol et
      let dataToProcess = null;

      // 1. Eğer priceListData direkt obje ise (success: true, data: {...})
      if (priceListData && priceListData.success && priceListData.data) {
        dataToProcess = priceListData.data;
      }
      // 2. Eğer priceListData array ise
      else if (priceListData && Array.isArray(priceListData) && priceListData.length > 0) {
        const firstItem = priceListData[0];
        dataToProcess = firstItem?.data || firstItem;
      }
      // 3. Eğer priceListData direkt data objesi ise
      else if (priceListData && priceListData.PriceListDetail) {
        dataToProcess = priceListData;
      }

      if (dataToProcess && dataToProcess.PriceListDetail) {
        const priceListDetail = dataToProcess.PriceListDetail;

        if (priceListDetail && Array.isArray(priceListDetail) && priceListDetail.length > 0) {
          // Koleksiyonları ayrı olarak sakla
          const collectionsData = priceListDetail.map((item: any, index: number) => {

            const collection = item.Collection;
            return {
              id: collection?.collectionId || item.price_list_detail_id || item.id || index,
              name: collection?.name || 'Koleksiyon',
              price_per_square_meter: parseFloat(item.price_per_square_meter) || 0,
              collection_code: collection?.code,
              collection_id: collection?.collectionId,
              original_item: item
            };
          });
          setCollections(collectionsData);

          // Ürünler için de formatla (eski uyumluluk için)
          const formattedCollections = priceListDetail.map((item: any, index: number) => {
            const collection = item.Collection;
            const collectionName = collection?.name || 'Koleksiyon';
            const pricePerSquareMeter = parseFloat(item.price_per_square_meter) || 0;

            return {
              id: collection?.collectionId || item.price_list_detail_id || item.id || index,
              name: collectionName,
              price: pricePerSquareMeter,
              description: collection?.description || '',
              currency: 'TRY',
              collection_name: collectionName,
              productImage: '',
              stock: 0,
              displayName: `${collectionName} (${formatCurrency(pricePerSquareMeter)}/m²)`,
              collection_code: collection?.code,
              metreKareFiyati: pricePerSquareMeter,
              original_item: item
            };
          });
          setProducts(formattedCollections);
        } else {
          setCollections([]);
          setProducts([]);
        }
      } else {
        setCollections([]);
        setProducts([]);
      }
    } catch (error) {
      setCollections([]);
      setProducts([]);
    }
  };

  // İşlem türüne göre gelir/harcama belirle
  const getTransactionExpenseType = (transactionType: string): boolean => {
    if (incomeTypes.includes(transactionType)) {
      return false; // Gelir
    } else if (expenseTypes.includes(transactionType)) {
      return true; // Harcama
    } else {
      return false; // Default olarak gelir
    }
  };

  // Müşteri değiştiğinde ürünleri getir
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomer(customerId);
    setSelectedCollection('');
    setFormData(prev => ({ ...prev, storeId: customerId, collection_id: '', tutar: 0 }));

    // Seçilen müşteriyi arama kutusunda göster
    const selectedStore = stores.find(store => store.store_id === customerId);
    if (selectedStore) {
      setCustomerSearchTerm(selectedStore.kurum_adi);
    }

    if (customerId) {
      // Sadece bir kez çağır
      setProducts([]); // Önceki ürünleri temizle
      setCollections([]); // Önceki koleksiyonları temizle
      fetchProductsByCustomer(customerId);
    } else {
      setProducts([]);
      setCollections([]);
    }
  };

  // Tutarı hesapla
  const calculateAmount = () => {
    const selectedProduct = collections.find(c => c.id === formData.collection_id);
    const squareMeters = typeof formData.square_meters === 'string' ? parseFloat(formData.square_meters) : formData.square_meters;
    if (selectedProduct && squareMeters && squareMeters > 0) {
      const calculatedAmount = selectedProduct.price_per_square_meter * squareMeters;
      setFormData(prev => ({ ...prev, tutar: calculatedAmount }));
    }
  };

  // Modal aç
  const openModal = () => {
    setIsModalOpen(true);
    fetchStores();
  };

  // Modal kapat
  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({
      storeId: '',
      islemTuru: '',
      tutar: 0,
      tarih: new Date().toISOString().slice(0, 16),
      aciklama: '',
      collection_id: '',
      square_meters: 0
    });
    setSelectedCustomer('');
    setSelectedCollection('');
    setCustomerSearchTerm('');
    setFilteredStores(stores);
    setProducts([]);
    setCollections([]);
  };

  // Form gönder
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.storeId || !formData.tutar || !formData.aciklama || !formData.islemTuru) {
      alert('Lütfen gerekli alanları doldurun');
      return;
    }

    try {
      setFormLoading(true);
      const authToken = token;

      // API formatına uygun olarak veri hazırla (currency'ye göre)
      const submitData = {
        storeId: formData.storeId,
        islemTuru: formData.islemTuru,
        tutar: formData.tutar,
        tarih: new Date(formData.tarih).toISOString(),
        aciklama: formData.aciklama,
        ...(selectedCurrency === 'USD' && { currency: 'USD' })
      };

      // Currency'ye göre API endpoint'i belirle
      const apiEndpoint = selectedCurrency === 'USD' 
        ? '/api/admin/usd-muhasebe/hareketler'
        : '/api/admin/muhasebe-hareketleri';

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}${apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error('İşlem kaydedilemedi');
      }

      const result = await response.json();

      if (result.success) {
        alert('İşlem başarıyla kaydedildi');
        closeModal();
        fetchDataByCurrency(true); // Verileri yenile
      } else {
        throw new Error(result.message || 'İşlem kaydedilemedi');
      }
    } catch (error: any) {
      alert(error.message || 'Bir hata oluştu');
    } finally {
      setFormLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: selectedCurrency
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ALACAKLI':
        return 'text-green-600 bg-green-50';
      case 'BORÇLU':
        return 'text-red-600 bg-red-50';
      case 'NÖTR':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Yetkisiz Erişim</h3>
          <p className="mt-2 text-sm text-slate-500">Bu sayfaya erişim için admin yetkisi gereklidir.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Muhasebe verileri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white px-6 py-10 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Veri Yükleme Hatası</h3>
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</p>
          <button
            onClick={() => fetchAccountingData(true)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { responseData } = data;

  // Filtrelenmiş verileri hesapla
  const getFilteredData = () => {
    if (!responseData) return null;

    let filteredTransactions = responseData.hareketler;

    // Mağaza filtrelemesi (sadece genel data için - mağaza bazlı data zaten filtrelenmiş)
    if (selectedStoreFilter && !responseData.magazaBilgi) {
      filteredTransactions = filteredTransactions.filter(
        transaction => transaction.storeId === selectedStoreFilter
      );
    }

    // Tarih aralığı filtrelemesi
    if (startDate) {
      const startDateTime = new Date(startDate);
      filteredTransactions = filteredTransactions.filter(
        transaction => new Date(transaction.tarih) >= startDateTime
      );
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      // Bitiş tarihini günün sonuna ayarla
      endDateTime.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(
        transaction => new Date(transaction.tarih) <= endDateTime
      );
    }

    // Gelir/Gider filtrelemesi
    if (transactionTypeFilter === 'gelir') {
      filteredTransactions = filteredTransactions.filter(
        transaction => !transaction.harcama
      );
    } else if (transactionTypeFilter === 'gider') {
      filteredTransactions = filteredTransactions.filter(
        transaction => transaction.harcama
      );
    }

    return {
      ...responseData,
      hareketler: filteredTransactions,
      // magazaBakiyeleri filtrelenmeyecek - hep orijinal veri
    };
  };

  const filteredData = getFilteredData();

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Muhasebe Yönetimi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Mali işlemler ve mağaza bakiyelerini yönetin</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <button
              onClick={openModal}
              className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yeni Hareket
            </button>
            <button
              onClick={() => fetchDataByCurrency(true)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Yenile
            </button>
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              >
                {selectedCurrency}
                <svg
                  className={`ml-2 h-4 w-4 text-slate-400 transition-transform ${currencyDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {currencyDropdownOpen && (
                <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurrency('TRY');
                      setCurrencyDropdownOpen(false);
                      setSelectedStoreFilter('');
                      setStartDate('');
                      setEndDate('');
                      setTransactionTypeFilter('');
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                      selectedCurrency === 'TRY' ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                    }`}
                  >
                    <span className="mr-2">₺</span>
                    TRY
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCurrency('USD');
                      setCurrencyDropdownOpen(false);
                      setSelectedStoreFilter('');
                      setStartDate('');
                      setEndDate('');
                      setTransactionTypeFilter('');
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                      selectedCurrency === 'USD' ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                    }`}
                  >
                    <span className="mr-2">$</span>
                    USD
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Gelişmiş Filtreleme</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            {/* Mağaza Filtresi */}
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Mağaza
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStoreFilterDropdownOpen(!storeFilterDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  <span>
                    {selectedStoreFilter ?
                      stores?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi || 'Seçili Mağaza' :
                      'Tüm Mağazalar'
                    }
                  </span>
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${storeFilterDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {storeFilterDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-hide">
                    <div className="sticky top-0 border-b border-slate-200 bg-white p-2">
                      <input
                        type="text"
                        placeholder="Mağaza ara..."
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        onChange={(e) => {
                          const searchValue = e.target.value.toLowerCase();
                          if (searchValue === '') {
                            setFilteredStores(stores);
                          } else {
                            const filtered = stores.filter(store =>
                              store.kurum_adi.toLowerCase().includes(searchValue)
                            );
                            setFilteredStores(filtered);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${!selectedStoreFilter ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                      onClick={() => {
                        setSelectedStoreFilter('');
                        setStoreFilterDropdownOpen(false);
                        setFilteredStores(stores);
                      }}
                    >
                      Tüm Mağazalar
                    </button>
                    {filteredStores?.map((magaza) => (
                      <button
                        type="button"
                        key={magaza.store_id}
                        className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${selectedStoreFilter === magaza.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                          }`}
                        onClick={() => {
                          setSelectedStoreFilter(magaza.store_id);
                          setStoreFilterDropdownOpen(false);
                          setFilteredStores(stores);
                        }}
                      >
                        {magaza.kurum_adi}
                      </button>
                    ))}
                    {filteredStores?.length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-slate-500">
                        Mağaza bulunamadı
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Başlangıç Tarihi */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>

            {/* Bitiş Tarihi */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>

            {/* İşlem Türü Filtresi */}
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                İşlem Türü
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTransactionTypeFilterDropdownOpen(!transactionTypeFilterDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  <span>
                    {transactionTypeFilter === "gelir" && "Sadece Gelir"}
                    {transactionTypeFilter === "gider" && "Sadece Gider"}
                    {!transactionTypeFilter && "Tüm İşlemler"}
                  </span>
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${transactionTypeFilterDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {transactionTypeFilterDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-hide">
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${!transactionTypeFilter ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                      onClick={() => {
                        setTransactionTypeFilter('');
                        setTransactionTypeFilterDropdownOpen(false);
                      }}
                    >
                      Tüm İşlemler
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${transactionTypeFilter === "gelir" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                      onClick={() => {
                        setTransactionTypeFilter("gelir");
                        setTransactionTypeFilterDropdownOpen(false);
                      }}
                    >
                      Sadece Gelir
                    </button>
                    <button
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${transactionTypeFilter === "gider" ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                      onClick={() => {
                        setTransactionTypeFilter("gider");
                        setTransactionTypeFilterDropdownOpen(false);
                      }}
                    >
                      Sadece Gider
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filtreleri Temizle Butonu */}
            <div>
              {(selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStoreFilter('');
                    setStartDate('');
                    setEndDate('');
                    setTransactionTypeFilter('');
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>
          </div>

          {/* Aktif Filtreler Gösterimi */}
          {(selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">Aktif Filtreler:</span>
                {selectedStoreFilter && (
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                    Mağaza: {responseData?.magazaBakiyeleri?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi}
                  </span>
                )}
                {startDate && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Başlangıç: {new Date(startDate).toLocaleDateString('tr-TR')}
                  </span>
                )}
                {endDate && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Bitiş: {new Date(endDate).toLocaleDateString('tr-TR')}
                  </span>
                )}
                {transactionTypeFilter && (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Tür: {transactionTypeFilter === 'gelir' ? 'Gelir' : 'Gider'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mağaza Bazlı Özet Kartı - Filtreleme aktifken göster */}
        {responseData && selectedStoreFilter && responseData.magazaBilgi && (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">{responseData.magazaBilgi.kurum_adi}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Mağaza Detay Bilgileri</p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${(responseData.magazaBilgi.bakiyeDurumu?.durum || responseData.magazaBilgi.durum) === 'BORCLU'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : (responseData.magazaBilgi.bakiyeDurumu?.durum || responseData.magazaBilgi.durum) === 'ALACAKLI'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                {responseData.magazaBilgi.bakiyeDurumu?.durum || responseData.magazaBilgi.durum || 'DENGEDE'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bakiye</p>
                <p className={`mt-2 text-2xl font-light tabular-nums ${(responseData.magazaBilgi.bakiyeDurumu?.bakiye || responseData.magazaBilgi.bakiye) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                  {formatCurrency(responseData.magazaBilgi.bakiyeDurumu?.bakiye || responseData.magazaBilgi.bakiye || 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {(responseData.magazaBilgi.bakiyeDurumu?.bakiye || responseData.magazaBilgi.bakiye || 0) >= 0 ? 'Alacaklı' : 'Borçlu'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Açık Hesap Limiti</p>
                <p className="mt-2 text-2xl font-light tabular-nums text-slate-900">
                  {(responseData.magazaBilgi.bakiyeDurumu?.limitsizAcikHesap || responseData.magazaBilgi.limitsiz_acik_hesap)
                    ? 'Limitsiz'
                    : formatCurrency(responseData.magazaBilgi.bakiyeDurumu?.acikHesapLimiti || responseData.magazaBilgi.acik_hesap_tutari || 0)
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modern Özet Kartları - Responsive Grid - Sadece genel veriler için göster */}
        {responseData && !selectedStoreFilter && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Mağaza</p>
              <p className="mt-2 text-2xl font-light text-slate-900">{responseData.magazaBakiyeleri?.length || 0}</p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Kasa Bakiyesi</p>
              <p className="mt-2 truncate text-2xl font-light tabular-nums text-slate-900" title={formatCurrency(parseFloat(responseData.adminKasaBakiyesi || '0'))}>
                {formatCurrency(parseFloat(responseData.adminKasaBakiyesi || '0'))}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Alacak</p>
              <p className="mt-2 truncate text-2xl font-light tabular-nums text-rose-600" title={formatCurrency(
                responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU')
                  .reduce((sum, m) => sum + Math.abs(m.bakiye), 0) || 0
              )}>
                {formatCurrency(
                  responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU')
                    .reduce((sum, m) => sum + Math.abs(m.bakiye), 0) || 0
                )}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Borçlu Mağazalar</p>
              <p className="mt-2 text-2xl font-light text-rose-600">
                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').length || 0}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Alacaklı Mağazalar</p>
              <p className="mt-2 text-2xl font-light text-emerald-600">
                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').length || 0}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Verecek</p>
              <p className="mt-2 truncate text-2xl font-light tabular-nums text-emerald-600" title={formatCurrency(
                responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI')
                  .reduce((sum, m) => sum + m.bakiye, 0) || 0
              )}>
                {formatCurrency(
                  responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI')
                    .reduce((sum, m) => sum + m.bakiye, 0) || 0
                )}
              </p>
            </div>
          </div>
        )}

        {/* Mağaza Detayları - Modern Kartlar - Sadece genel veriler için göster */}
        {responseData && responseData.magazaBakiyeleri && responseData.magazaBakiyeleri.length > 0 && !selectedStoreFilter && (
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-slate-900">Borçlu Mağazalar</h3>
                  <span className="text-xs text-slate-500">
                    {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2 sm:p-3">
                  {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').map((magaza: MagazaBakiye) => (
                    <div
                      key={magaza.store_id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50/70"
                      onClick={() => {
                        setSelectedStoreFilter(magaza.store_id);
                        if (selectedCurrency === 'USD') {
                          fetchUSDAccountingData(false, magaza.store_id);
                        } else {
                          fetchAccountingData(false, magaza.store_id);
                        }
                      }}
                    >
                      <span className="text-sm font-medium text-slate-900">{magaza.kurum_adi}</span>
                      <span className="text-sm font-medium tabular-nums text-rose-600">
                        {formatCurrency(magaza.tutar)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-slate-900">Alacaklı Mağazalar</h3>
                  <span className="text-xs text-slate-500">
                    {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2 sm:p-3">
                  {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').map((magaza: MagazaBakiye) => (
                    <div
                      key={magaza.store_id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50/70"
                      onClick={() => {
                        setSelectedStoreFilter(magaza.store_id);
                        if (selectedCurrency === 'USD') {
                          fetchUSDAccountingData(false, magaza.store_id);
                        } else {
                          fetchAccountingData(false, magaza.store_id);
                        }
                      }}
                    >
                      <span className="text-sm font-medium text-slate-900">{magaza.kurum_adi}</span>
                      <span className="text-sm font-medium tabular-nums text-emerald-600">
                        {formatCurrency(magaza.tutar)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {responseData.magazaBakiyeleri?.filter(m => m.durum === 'DENGEDE').length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-slate-900">Dengede Mağazalar</h3>
                  <span className="text-xs text-slate-500">
                    {responseData.magazaBakiyeleri?.filter(m => m.durum === 'DENGEDE').length}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 p-2 sm:p-3">
                  {responseData.magazaBakiyeleri?.filter(m => m.durum === 'DENGEDE').map((magaza: MagazaBakiye) => (
                    <div
                      key={magaza.store_id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50/70"
                      onClick={() => {
                        setSelectedStoreFilter(magaza.store_id);
                        if (selectedCurrency === 'USD') {
                          fetchUSDAccountingData(false, magaza.store_id);
                        } else {
                          fetchAccountingData(false, magaza.store_id);
                        }
                      }}
                    >
                      <span className="text-sm font-medium text-slate-900">{magaza.kurum_adi}</span>
                      <span className="text-sm text-slate-500 tabular-nums">
                        Bakiye: {formatCurrency(magaza.bakiye)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm" id="son-islemler">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Son İşlemler
                {filteredData && filteredData.hareketler.length !== responseData?.hareketler.length && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({filteredData.hareketler.length} / {responseData?.hareketler.length} kayıt)
                  </span>
                )}
              </h2>
              {filteredData && filteredData.hareketler.length === 0 && (selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
                <p className="mt-0.5 text-xs text-slate-500">Filtreye uygun kayıt bulunamadı</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                // Filtrelenmiş verileri al
                const currentData = getFilteredData();
                const transactions = currentData?.hareketler || [];

                // Sayfaya yazdırma stilleri ekle
                const printStyles = `
                                    <style id="print-styles">
                                        @page {
                                            margin: 0.2in 0.3in;
                                            size: A4;
                                            orphans: 1;
                                            widows: 1;
                                        }
                                        @page:last {
                                            margin-bottom: 0;
                                        }
                                        @media print {
                                            html, body {
                                                height: auto !important;
                                                overflow: hidden !important;
                                                margin: 0 !important;
                                                padding: 0 !important;
                                            }
                                            * {
                                                box-sizing: border-box;
                                                margin: 0 !important;
                                                padding: 0 !important;
                                            }
                                            .printable-content * {
                                                margin: revert !important;
                                                padding: revert !important;
                                            }
                                            .print-table {
                                                page-break-after: avoid;
                                                margin-bottom: 0 !important;
                                            }
                                            .print-table tr {
                                                page-break-inside: avoid;
                                                page-break-after: auto;
                                            }
                                            .print-table tr:last-child {
                                                page-break-after: avoid;
                                            }
                                            body {
                                                margin: 0;
                                                padding: 0;
                                                -webkit-print-color-adjust: exact;
                                                print-color-adjust: exact;
                                            }
                                            body * {
                                                visibility: hidden;
                                            }
                                            .printable-content, .printable-content * {
                                                visibility: visible;
                                            }
                                            .printable-content {
                                                position: absolute;
                                                left: 0;
                                                top: 0;
                                                width: 100%;
                                                margin: 0 !important;
                                                padding: 0 !important;
                                                overflow: hidden;
                                                height: auto !important;
                                                max-height: none !important;
                                                page-break-after: avoid !important;
                                            }
                                            .printable-content::after {
                                                content: "";
                                                display: block;
                                                height: 0;
                                                clear: both;
                                                page-break-after: avoid;
                                            }
                                            .print-header {
                                                text-align: center;
                                                margin-bottom: 12px;
                                                padding-bottom: 8px;
                                                border-bottom: 2px solid #00365a;
                                                page-break-after: avoid;
                                            }
                                            .print-header h1 {
                                                color: #00365a;
                                                font-size: 20px;
                                                margin-bottom: 8px;
                                                font-weight: bold;
                                            }
                                            .print-header .date {
                                                color: #666;
                                                font-size: 14px;
                                            }
                                            .filters-info {
                                                background: #f8f9fa;
                                                padding: 10px;
                                                margin-bottom: 15px;
                                                border-radius: 5px;
                                                border-left: 4px solid #00365a;
                                            }
                                            .filters-info h3 {
                                                color: #00365a;
                                                font-size: 14px;
                                                margin-bottom: 5px;
                                            }
                                            .filter-item {
                                                display: inline-block;
                                                background: white;
                                                padding: 3px 8px;
                                                margin: 2px;
                                                border-radius: 3px;
                                                border: 1px solid #ddd;
                                                font-size: 11px;
                                            }
                                            .summary-section {
                                                margin-bottom: 8px;
                                                display: flex;
                                                justify-content: center;
                                                page-break-inside: avoid;
                                                page-break-after: avoid;
                                            }
                                            .summary-card {
                                                text-align: center;
                                                padding: 8px 16px;
                                                border: 1px solid #ddd;
                                                border-radius: 5px;
                                                background: #f9f9f9;
                                                max-width: 200px;
                                            }
                                            .summary-card .value {
                                                font-size: 16px;
                                                font-weight: bold;
                                                margin-bottom: 3px;
                                            }
                                            .summary-card .label {
                                                font-size: 11px;
                                                color: #666;
                                                text-transform: uppercase;
                                            }
                                            .summary-card.income .value { color: #16a34a; }
                                            .summary-card.expense .value { color: #dc2626; }
                                            .summary-card.net .value { color: #00365a; }
                                            .summary-card.balance .value { color: #00365a; }
                                            .print-table {
                                                width: 100%;
                                                border-collapse: collapse;
                                                margin: 8px 0 0 0 !important;
                                                font-size: 11px;
                                                table-layout: fixed;
                                                page-break-inside: auto;
                                            }
                                            .print-table th {
                                                background-color: #00365a !important;
                                                color: white !important;
                                                padding: 8px 6px;
                                                text-align: left;
                                                font-weight: bold;
                                                font-size: 10px;
                                                text-transform: uppercase;
                                                -webkit-print-color-adjust: exact;
                                                line-height: 1.4;
                                                word-wrap: break-word;
                                                height: 32px;
                                            }
                                            .print-table td {
                                                padding: 6px 4px;
                                                border-bottom: 1px solid #e5e5e5;
                                                vertical-align: top;
                                                font-size: 10px;
                                                line-height: 1.4;
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                                hyphens: auto;
                                                min-height: 28px;
                                            }
                                            .print-table tr:nth-child(even) {
                                                background-color: #f9f9f9 !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .status-badge {
                                                display: inline-block;
                                                padding: 2px 6px;
                                                border-radius: 3px;
                                                font-size: 9px;
                                                font-weight: bold;
                                                text-transform: uppercase;
                                            }
                                            .status-alacakli {
                                                background-color: #dcfce7 !important;
                                                color: #166534 !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .status-borclu {
                                                background-color: #fef2f2 !important;
                                                color: #991b1b !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .status-dengede {
                                                background-color: #f3f4f6 !important;
                                                color: #374151 !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .amount-income {
                                                color: #16a34a !important;
                                                font-weight: bold;
                                            }
                                            .amount-expense {
                                                color: #dc2626 !important;
                                                font-weight: bold;
                                            }
                                            .transaction-type {
                                                display: inline-block;
                                                padding: 2px 6px;
                                                border-radius: 3px;
                                                font-size: 9px;
                                                font-weight: bold;
                                            }
                                            .type-income {
                                                background-color: #dcfce7 !important;
                                                color: #166534 !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .type-expense {
                                                background-color: #fef2f2 !important;
                                                color: #991b1b !important;
                                                -webkit-print-color-adjust: exact;
                                            }
                                            .print-footer {
                                                margin-top: 8px;
                                                margin-bottom: 0 !important;
                                                padding-top: 4px;
                                                padding-bottom: 0 !important;
                                                border-top: 1px solid #ddd;
                                                text-align: center;
                                                font-size: 9px;
                                                color: #666;
                                                page-break-inside: avoid;
                                                page-break-before: avoid;
                                                page-break-after: avoid;
                                                height: auto;
                                            }
                                            .print-footer p {
                                                margin: 2px 0 !important;
                                                padding: 0 !important;
                                            }
                                            .text-truncate {
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                                hyphens: auto;
                                                white-space: normal;
                                            }
                                            .balance-info {
                                                font-size: 10px;
                                                color: #666;
                                                margin-top: 2px;
                                            }
                                        }
                                                </style>
                                `;

                // Yazdırılacak içeriği oluştur
                const printContent = `
                                    <div class="printable-content">
                                        <div class="print-header">
                                            <h1>📋 Muhasebe Hareketleri</h1>
                                            <div class="date">Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</div>
                                        </div>


                                        ${selectedStoreFilter && (responseData?.magazaBilgi || responseData?.magaza) ? `
                                            <div class="summary-section">
                                                <div class="summary-card balance">
                                                    <div class="value">${formatCurrency(responseData.magazaBilgi?.bakiyeDurumu?.bakiye || responseData.magazaBilgi?.bakiye || responseData.magaza?.bakiyeDurumu?.bakiye || responseData.magaza?.bakiye || 0)}</div>
                                                    <div class="label">BAKİYE (${(responseData.magazaBilgi?.bakiyeDurumu?.bakiye || responseData.magazaBilgi?.bakiye || responseData.magaza?.bakiyeDurumu?.bakiye || responseData.magaza?.bakiye || 0) >= 0 ? 'ALACAKLI' : 'BORÇLU'})</div>
                                                </div>
                                            </div>
                                        ` : ''}

                                        <table class="print-table">
                                            <thead>
                                                <tr>
                                                    <th style="width: 12%;">Tarih</th>
                                                    <th style="width: 20%;">Mağaza</th>
                                                    <th style="width: 15%;">İşlem Türü</th>
                                                    <th style="width: 13%;">Tutar</th>
                                                    <th style="width: 40%;">Açıklama</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${transactions.map(transaction => `
                                                    <tr>
                                                        <td>
                                                            ${new Date(transaction.tarih).toLocaleDateString('tr-TR')}
                                                            <div style="font-size: 9px; color: #888;">
                                                                ${new Date(transaction.tarih).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div class="text-truncate" title="${selectedStoreFilter ? (responseData?.magazaBilgi?.kurum_adi || responseData?.magaza?.kurum_adi || 'Bilinmeyen Mağaza') : (transaction.store?.kurum_adi || 'Bilinmeyen Mağaza')}">
                                                                ${selectedStoreFilter ? (responseData?.magazaBilgi?.kurum_adi || responseData?.magaza?.kurum_adi || 'Bilinmeyen Mağaza') : (transaction.store?.kurum_adi || 'Bilinmeyen Mağaza')}
                                                            </div>
                                                        </td>
                                                        <td class="text-truncate" title="${transaction.islemTuru}">
                                                            ${transaction.islemTuru}
                                                        </td>
                                                        <td class="${transaction.harcama ? 'amount-expense' : 'amount-income'}">
                                                            ${transaction.harcama ? '-' : '+'}${formatCurrency(parseFloat(transaction.tutar))}
                                                        </td>
                                                        <td class="whitespace-pre-line max-w-xs font-mono">
                                                            ${formatAciklama(transaction)}
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>

                                        <div class="print-footer">
                                            <p><strong>Toplam ${transactions.length} hareket listelendi</strong></p>
                                            <p>Bu rapor Paşa Bayi Sipariş Sistemi tarafından ${new Date().toLocaleDateString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
                                        </div>
                                    </div>
                                `;

                // Eski yazdırma stillerini temizle
                const oldStyles = document.getElementById('print-styles');
                if (oldStyles) {
                  oldStyles.remove();
                }

                // Eski yazdırılacak içeriği temizle
                const oldContent = document.querySelector('.printable-content');
                if (oldContent) {
                  oldContent.remove();
                }

                // Yeni stilleri head'e ekle
                document.head.insertAdjacentHTML('beforeend', printStyles);

                // Yazdırılacak içeriği body'ye ekle
                document.body.insertAdjacentHTML('beforeend', printContent);

                // Yazdırma dialogunu aç
                window.print();

                // Yazdırma işlemi bittiğinde temizlik yap
                setTimeout(() => {
                  const stylesElement = document.getElementById('print-styles');
                  const contentElement = document.querySelector('.printable-content');
                  if (stylesElement) stylesElement.remove();
                  if (contentElement) contentElement.remove();
                }, 1000);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Yazdır
            </button>
          </div>
          <div className="max-h-96 w-full overflow-x-auto overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Mağaza
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    İşlem Türü
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tutar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Açıklama
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData?.hareketler.map((transaction: Transaction) => (
                  <tr key={transaction.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(transaction.tarih).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-32 truncate text-sm font-medium text-slate-900">
                        {selectedStoreFilter ? responseData?.magazaBilgi?.kurum_adi : (transaction.store?.kurum_adi || 'Bilinmeyen Mağaza')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className="block max-w-28 truncate">{transaction.islemTuru}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-sm font-medium tabular-nums ${transaction.harcama ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {transaction.harcama ? '-' : '+'}{formatCurrency(parseFloat(transaction.tutar))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="max-w-xs whitespace-pre-line font-mono">
                        {formatAciklama(transaction)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {responseData?.pagination && (
            <div className="flex items-center justify-between border-t border-slate-200/80 px-4 py-3 sm:px-5">
              <div className="text-sm text-slate-700">
                <span>
                  Toplam {responseData.pagination.total} kayıt bulundu
                  ({responseData.pagination.totalPages} sayfa)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {responseData.pagination.page > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Sayfa değiştirme fonksiyonu - API'ye page parametresi ekle
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Önceki
                  </button>
                )}
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                  Sayfa {responseData.pagination.page}
                </span>
                {responseData.pagination.page < responseData.pagination.totalPages && (
                  <button
                    type="button"
                    onClick={() => {
                      // Sayfa değiştirme fonksiyonu - API'ye page parametresi ekle
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Sonraki
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Yeni Mali Hareket</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Gelir veya gider kaydı oluşturun</p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  disabled={formLoading}
                >
                  <span className="sr-only">Kapat</span>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form id="muhasebe-transaction-form" onSubmit={handleSubmit} className="max-h-[calc(92vh-8rem)] space-y-6 overflow-y-auto px-5 py-5">
                <div className="dropdown-container">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Müşteri <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => setCustomerDropdownOpen(true)}
                      placeholder="Müşteri ara..."
                      className={`w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 ${formLoading ? 'cursor-not-allowed bg-slate-50' : ''
                        }`}
                      disabled={formLoading}
                    />
                    <svg
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      viewBox="0 0 24 24"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                    </svg>

                    {customerDropdownOpen && !formLoading && (
                      <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-hide">
                        {filteredStores.length === 0 ? (
                          <div className="px-3 py-2 text-center text-sm text-slate-500">
                            Müşteri bulunamadı
                          </div>
                        ) : (
                          filteredStores.map((store) => (
                            <button
                              type="button"
                              key={store.store_id}
                              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${selectedCustomer === store.store_id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                }`}
                              onClick={() => {
                                handleCustomerChange(store.store_id);
                                setCustomerDropdownOpen(false);
                              }}
                            >
                              {store.kurum_adi}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4">
                  <h4 className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Otomatik Tutar Hesaplama (İsteğe Bağlı)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Ürün Seçimi */}
                    <div className="md:col-span-2 dropdown-container">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Ürün</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                          className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 ${!selectedCustomer || formLoading || collections.length === 0 ? 'cursor-not-allowed bg-slate-100' : 'bg-white'
                            }`}
                          disabled={!selectedCustomer || formLoading || collections.length === 0}
                        >
                          <span>
                            {!selectedCustomer ? 'Önce müşteri seçin...' :
                              collections.length === 0 ? 'Ürün bulunamadı...' :
                                selectedCollection ?
                                  collections.find(c => c.id === selectedCollection)?.name +
                                  ` (${formatCurrency(collections.find(c => c.id === selectedCollection)?.price_per_square_meter || 0)}/m²)` :
                                  'Ürün seçin...'
                            }
                          </span>
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${collectionDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {collectionDropdownOpen && selectedCustomer && !formLoading && collections.length > 0 && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-hide">
                            {collections.map((collection) => (
                              <button
                                type="button"
                                key={collection.id}
                                className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${selectedCollection === collection.id ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                  }`}
                                onClick={() => {
                                  setSelectedCollection(collection.id);
                                  setFormData(prev => ({ ...prev, collection_id: collection.id }));
                                  setCollectionDropdownOpen(false);
                                }}
                              >
                                {collection.name} ({formatCurrency(collection.price_per_square_meter)}/m²)
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Metrekare</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.square_meters || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, square_meters: parseFloat(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        placeholder="0.00"
                        disabled={formLoading}
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={calculateAmount}
                        disabled={!formData.collection_id || !formData.square_meters || formLoading}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Hesapla
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="border-b border-slate-200/80 pb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    İşlem Detayları
                  </h4>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="dropdown-container">
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        İşlem Türü <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setTransactionTypeDropdownOpen(!transactionTypeDropdownOpen)}
                          className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-9 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 ${formLoading ? 'cursor-not-allowed bg-slate-100' : 'bg-slate-50'
                            }`}
                          disabled={formLoading}
                        >
                          <span>
                            {formData.islemTuru || 'İşlem türü seçin...'}
                          </span>
                          <svg
                            className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${transactionTypeDropdownOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {transactionTypeDropdownOpen && !formLoading && (
                          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg scrollbar-hide">
                            {incomeTypes.length > 0 && (
                              <>
                                <div className="border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Gelir Türleri
                                </div>
                                {incomeTypes.map((type) => (
                                  <button
                                    type="button"
                                    key={type}
                                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${formData.islemTuru === type ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                      }`}
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        islemTuru: type
                                      }));
                                      setTransactionTypeDropdownOpen(false);
                                    }}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </>
                            )}

                            {expenseTypes.length > 0 && (
                              <>
                                <div className="border-b border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Gider Türleri
                                </div>
                                {expenseTypes.map((type) => (
                                  <button
                                    type="button"
                                    key={type}
                                    className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${formData.islemTuru === type ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                                      }`}
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        islemTuru: type
                                      }));
                                      setTransactionTypeDropdownOpen(false);
                                    }}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Tutar <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formData.tutar === 0 ? '' : formData.tutar}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.-]/g, '');
                          setFormData(prev => ({ ...prev, tutar: value === '' ? 0 : parseFloat(value) || 0 }));
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                        placeholder="0.00"
                        required
                        disabled={formLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      İşlem Tarihi <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.tarih}
                      onChange={(e) => setFormData(prev => ({ ...prev, tarih: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      required
                      disabled={formLoading}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Açıklama <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.aciklama}
                      onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                      rows={3}
                      placeholder="İşlem açıklaması... Fiş no, Fatura no, Nakliye, Kargo, vb."
                      required
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </form>

              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  disabled={formLoading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  form="muhasebe-transaction-form"
                  disabled={formLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MuhasebePage; 