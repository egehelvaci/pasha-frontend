'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getStores, getStorePriceLists, Store, PriceListProduct } from '../../../services/api';
import { useToken } from '@/app/hooks/useToken';

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
    magazaBakiyeleri: MagazaBakiye[];
    adminKasaBakiyesi: string;
    toplamAlacak: number;
    adminVerecekMagazaSayisi: number;
    adminAlacakliMagazaSayisi: number;
}

interface AccountingData {
    responseData?: AccountingResponseData;
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
    const [error, setError] = useState<string | null>(null);

    // Modal ve form state'leri
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [stores, setStores] = useState<Store[]>([]);
    const [products, setProducts] = useState<ExtendedPriceListProduct[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [selectedCollection, setSelectedCollection] = useState<string>('');
    const [collections, setCollections] = useState<any[]>([]);
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

    useEffect(() => {
        // Admin kontrolü
        if (!isAdmin) {
            router.push('/dashboard');
            return;
        }

        // Sadece bir kez çalışması için kontrol
        if (!hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchAccountingData(false);
            fetchStores();
            fetchIncomeTypes();
            fetchExpenseTypes();
        }
    }, [isAdmin]);

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

    const fetchAccountingData = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const authToken = token;
            if (!authToken) {
                throw new Error('Token bulunamadı');
            }

            // Yeni API - tek endpoint'ten hem transactions hem bakiye bilgileri
            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe-hareketleri', {
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

            setData({
                responseData: result.data
            });
        } catch (error: any) {
            setError(error.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    // Mağazaları getir
    const fetchStores = async () => {
        try {
            const storesData = await getStores();
            setStores(storesData);
        } catch (error) {
            console.error('Mağazalar alınamadı:', error);
        }
    };

    // Gelir türlerini getir
    const fetchIncomeTypes = async () => {
        try {
            const authToken = token;
            if (!authToken) return;

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe/income-types', {
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

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe/expense-types', {
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

            // API formatına uygun olarak veri hazırla (yeni API dokümantasyonuna göre)
            const submitData = {
                storeId: formData.storeId,
                islemTuru: formData.islemTuru,
                tutar: formData.tutar,
                tarih: new Date(formData.tarih).toISOString(),
                aciklama: formData.aciklama
            };



            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe-hareketleri', {
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
                fetchAccountingData(true); // Verileri yenile
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
            currency: 'TRY'
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Yetkisiz Erişim</h2>
                        <p className="text-gray-600 mb-6">Bu sayfaya erişim için admin yetkisi gereklidir.</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Dashboard'a Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header Skeleton */}
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded-lg w-64 mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-96"></div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse">
                        {/* Stats Cards Skeleton */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                                </div>
                        ))}
                    </div>

                        {/* Content Skeleton */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading Indicator */}
                <div className="fixed bottom-8 right-8">
                    <div className="bg-white rounded-full shadow-lg p-4">
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="text-sm font-medium text-gray-700">Muhasebe verileri yükleniyor...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Veri Yükleme Hatası</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => fetchAccountingData(true)}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Tekrar Dene
                    </button>
                    </div>
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

        // Mağaza filtrelemesi
        if (selectedStoreFilter) {
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
        <div className="min-h-screen bg-gray-50">
            {/* Modern Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{backgroundColor: '#00365a'}}>
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Muhasebe Yönetimi</h1>
                                <p className="text-gray-600">Mali işlemler ve mağaza bakiyelerini yönetin</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                        <button
                            onClick={openModal}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                                Yeni Hareket
                        </button>
                        <button
                            onClick={() => fetchAccountingData(true)}
                                className="flex items-center px-4 py-2 text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                            style={{backgroundColor: '#00365a'}}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#002847'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00365a'}
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Yenile
                        </button>
                        </div>
                    </div>
                    </div>
                </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filtreleme Bölümü */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">🔍 Gelişmiş Filtreleme</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                        {/* Mağaza Filtresi */}
                        <div className="dropdown-container">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Mağaza
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setStoreFilterDropdownOpen(!storeFilterDropdownOpen)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-left bg-white"
                                >
                                    <span className="text-gray-900">
                                        {selectedStoreFilter ? 
                                            responseData?.magazaBakiyeleri?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi || 'Seçili Mağaza' :
                                            'Tüm Mağazalar'
                                        }
                                    </span>
                                    <svg 
                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${storeFilterDropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {storeFilterDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                                        <div
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                !selectedStoreFilter ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                            }`}
                                            onClick={() => {
                                                setSelectedStoreFilter('');
                                                setStoreFilterDropdownOpen(false);
                                            }}
                                        >
                                            Tüm Mağazalar
                                        </div>
                                        {responseData?.magazaBakiyeleri?.map((magaza) => (
                                            <div
                                                key={magaza.store_id}
                                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                    selectedStoreFilter === magaza.store_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                                }`}
                                                onClick={() => {
                                                    setSelectedStoreFilter(magaza.store_id);
                                                    setStoreFilterDropdownOpen(false);
                                                }}
                                            >
                                                {magaza.kurum_adi}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Başlangıç Tarihi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Başlangıç Tarihi
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* Bitiş Tarihi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Bitiş Tarihi
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                        </div>

                        {/* İşlem Türü Filtresi */}
                        <div className="dropdown-container">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                İşlem Türü
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setTransactionTypeFilterDropdownOpen(!transactionTypeFilterDropdownOpen)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-left bg-white"
                                >
                                    <span className="text-gray-900">
                                        {transactionTypeFilter === "gelir" && "Sadece Gelir"}
                                        {transactionTypeFilter === "gider" && "Sadece Gider"}
                                        {!transactionTypeFilter && "Tüm İşlemler"}
                                    </span>
                                    <svg 
                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${transactionTypeFilterDropdownOpen ? 'rotate-180' : ''}`}
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                
                                {transactionTypeFilterDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                                        <div
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                !transactionTypeFilter ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                            }`}
                                            onClick={() => {
                                                setTransactionTypeFilter('');
                                                setTransactionTypeFilterDropdownOpen(false);
                                            }}
                                        >
                                            Tüm İşlemler
                                        </div>
                                        <div
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                transactionTypeFilter === "gelir" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                            }`}
                                            onClick={() => {
                                                setTransactionTypeFilter("gelir");
                                                setTransactionTypeFilterDropdownOpen(false);
                                            }}
                                        >
                                            Sadece Gelir
                                        </div>
                                        <div
                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                transactionTypeFilter === "gider" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                            }`}
                                            onClick={() => {
                                                setTransactionTypeFilter("gider");
                                                setTransactionTypeFilterDropdownOpen(false);
                                            }}
                                        >
                                            Sadece Gider
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Filtreleri Temizle Butonu */}
                        <div>
                            {(selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
                                <button
                                    onClick={() => {
                                        setSelectedStoreFilter('');
                                        setStartDate('');
                                        setEndDate('');
                                        setTransactionTypeFilter('');
                                    }}
                                    className="w-full px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                                >
                                    Filtreleri Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Aktif Filtreler Gösterimi */}
                    {(selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
                        <div className="mt-6 pt-4 border-t border-gray-200">
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-medium text-gray-600">🏷️ Aktif Filtreler:</span>
                            {selectedStoreFilter && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Mağaza: {responseData?.magazaBakiyeleri?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi}
                                </span>
                            )}
                            {startDate && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Başlangıç: {new Date(startDate).toLocaleDateString('tr-TR')}
                                </span>
                            )}
                            {endDate && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Bitiş: {new Date(endDate).toLocaleDateString('tr-TR')}
                                </span>
                            )}
                            {transactionTypeFilter && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Tür: {transactionTypeFilter === 'gelir' ? 'Gelir' : 'Gider'}
                                </span>
                            )}
                            </div>
                        </div>
                    )}
            </div>

                {/* Modern Özet Kartları - Responsive Grid */}
            {responseData && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 lg:gap-6 mb-8">
                    {/* Toplam Mağaza */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0">
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Toplam Mağaza</p>
                                    <p className="text-xl font-bold text-gray-900">{responseData.magazaBakiyeleri.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Kasa Bakiyesi */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 flex-shrink-0">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Kasa Bakiyesi</p>
                                    <p className="text-sm xl:text-base font-bold text-blue-600 truncate leading-tight" title={formatCurrency(parseFloat(responseData.adminKasaBakiyesi))}>
                                {formatCurrency(parseFloat(responseData.adminKasaBakiyesi))}
                                    </p>
                            </div>
                        </div>
                    </div>

                    {/* Toplam Alacak */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 flex-shrink-0">
                                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Toplam Alacak</p>
                                    <p className="text-sm xl:text-base font-bold text-red-600 truncate leading-tight" title={formatCurrency(
                                        responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU')
                                            .reduce((sum, m) => sum + Math.abs(m.bakiye), 0) || 0
                                    )}>
                                {formatCurrency(
                                    responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU')
                                        .reduce((sum, m) => sum + Math.abs(m.bakiye), 0) || 0
                                )}
                                    </p>
                            </div>
                        </div>
                    </div>

                    {/* Borçlu Mağazalar */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{backgroundColor: 'rgba(0, 54, 90, 0.1)'}}>
                                    <svg className="w-4 h-4" style={{color: '#00365a'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Borçlu Mağazalar</p>
                                    <p className="text-xl font-bold text-red-600">
                                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').length || 0}
                                    </p>
                            </div>
                        </div>
                    </div>

                    {/* Alacaklı Mağazalar */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 flex-shrink-0">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Alacaklı Mağazalar</p>
                                    <p className="text-xl font-bold text-green-600">
                                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').length || 0}
                                    </p>
                            </div>
                        </div>
                    </div>

                    {/* Toplam Verecek */}
                        <div className="bg-white rounded-xl shadow-sm border p-3 lg:p-4 hover:shadow-md transition-shadow min-w-0">
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 flex-shrink-0">
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                            </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-600 truncate">Toplam Verecek</p>
                                    <p className="text-sm xl:text-base font-bold text-blue-600 truncate leading-tight" title={formatCurrency(
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
                    </div>
                </div>
            )}

                {/* Mağaza Detayları - Modern Kartlar */}
            {responseData && responseData.magazaBakiyeleri && responseData.magazaBakiyeleri.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Borçlu Mağazalar */}
                    {responseData.magazaBakiyeleri.filter(m => m.durum === 'BORCLU').length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100">
                                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">📉 Borçlu Mağazalar</h3>
                                </div>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'BORCLU').map((magaza: MagazaBakiye) => (
                                        <div key={magaza.store_id} className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                                        <span className="text-sm font-medium text-gray-900">{magaza.kurum_adi}</span>
                                        <span className="text-sm font-bold text-red-600">
                                            {formatCurrency(magaza.tutar)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alacaklı Mağazalar */}
                    {responseData.magazaBakiyeleri.filter(m => m.durum === 'ALACAKLI').length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">📈 Alacaklı Mağazalar</h3>
                                </div>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'ALACAKLI').map((magaza: MagazaBakiye) => (
                                        <div key={magaza.store_id} className="flex justify-between items-center p-4 bg-green-50 rounded-xl border border-green-100 hover:bg-green-100 transition-colors">
                                        <span className="text-sm font-medium text-gray-900">{magaza.kurum_adi}</span>
                                        <span className="text-sm font-bold text-green-600">
                                            {formatCurrency(magaza.tutar)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dengede Mağazalar */}
                    {responseData.magazaBakiyeleri.filter(m => m.durum === 'DENGEDE').length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100">
                                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">⚖️ Dengede Mağazalar</h3>
                                </div>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'DENGEDE').map((magaza: MagazaBakiye) => (
                                        <div key={magaza.store_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                        <span className="text-sm font-medium text-gray-900">{magaza.kurum_adi}</span>
                                        <span className="text-sm font-medium text-gray-600">
                                            Bakiye: {formatCurrency(magaza.bakiye)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filtrelenmiş Veriler Özeti */}
            {(selectedStoreFilter || startDate || endDate || transactionTypeFilter) && filteredData && (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 mb-8">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-200">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                        </div>
                            <h3 className="text-lg font-semibold text-blue-900">📊 Filtrelenmiş Veriler Özeti</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="text-center bg-white rounded-lg p-4">
                                <div className="text-2xl font-bold text-blue-900">{filteredData.hareketler.length}</div>
                                <div className="text-sm text-blue-700">Toplam İşlem</div>
                            </div>
                            <div className="text-center bg-white rounded-lg p-4">
                                <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(
                                    filteredData.hareketler
                                        .filter(t => !t.harcama)
                                        .reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                                <div className="text-sm text-green-700">Toplam Gelir</div>
                        </div>
                            <div className="text-center bg-white rounded-lg p-4">
                                <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(
                                    filteredData.hareketler
                                        .filter(t => t.harcama)
                                        .reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                                <div className="text-sm text-red-700">Toplam Gider</div>
                        </div>
                            <div className="text-center bg-white rounded-lg p-4">
                                <div className={`text-2xl font-bold ${
                                (filteredData.hareketler.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0) -
                                 filteredData.hareketler.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)) >= 0
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {formatCurrency(
                                    filteredData.hareketler.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0) -
                                    filteredData.hareketler.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                                <div className="text-sm text-gray-700">Net Durum</div>
                        </div>
                    </div>
                </div>
            )}

                {/* Modern İşlem Geçmişi Tablosu */}
                <div className="bg-white rounded-xl shadow-sm border" id="son-islemler">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                    <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    📋 Son İşlemler
                            {filteredData && filteredData.hareketler.length !== responseData?.hareketler.length && (
                                <span className="ml-2 text-sm text-gray-500">
                                    ({filteredData.hareketler.length} / {responseData?.hareketler.length} kayıt)
                                </span>
                            )}
                        </h2>
                        {filteredData && filteredData.hareketler.length === 0 && (selectedStoreFilter || startDate || endDate || transactionTypeFilter) && (
                            <p className="text-sm text-gray-500 mt-1">Filtreye uygun kayıt bulunamadı</p>
                        )}
                            </div>
                    </div>
                    <button
                        onClick={() => {
                                // Filtrelenmiş verileri al
                                const currentData = getFilteredData();
                                const transactions = currentData?.hareketler || [];
                                
                                // Sayfaya yazdırma stilleri ekle
                                const printStyles = `
                                    <style id="print-styles">
                                        @media print {
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
                                            }
                                            .print-header {
                                                text-align: center;
                                                margin-bottom: 20px;
                                                padding-bottom: 15px;
                                                border-bottom: 2px solid #00365a;
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
                                                margin-bottom: 20px;
                                                display: grid;
                                                grid-template-columns: repeat(3, 1fr);
                                                gap: 15px;
                                            }
                                            .summary-card {
                                                text-align: center;
                                                padding: 10px;
                                                border: 1px solid #ddd;
                                                border-radius: 5px;
                                                background: #f9f9f9;
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
                                            .print-table {
                                                width: 100%;
                                                border-collapse: collapse;
                                                margin-top: 10px;
                                                font-size: 11px;
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
                                            }
                                            .print-table td {
                                                padding: 6px;
                                                border-bottom: 1px solid #e5e5e5;
                                                vertical-align: top;
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
                                                margin-top: 30px;
                                                padding-top: 15px;
                                                border-top: 1px solid #ddd;
                                                text-align: center;
                                                font-size: 10px;
                                                color: #666;
                                            }
                                            .text-truncate {
                                                white-space: nowrap;
                                                overflow: hidden;
                                                text-overflow: ellipsis;
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

                                        ${(selectedStoreFilter || startDate || endDate || transactionTypeFilter) ? `
                                            <div class="filters-info">
                                                <h3>🔍 Uygulanan Filtreler:</h3>
                                                ${selectedStoreFilter ? `<span class="filter-item">Mağaza: ${responseData?.magazaBakiyeleri?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi}</span>` : ''}
                                                ${startDate ? `<span class="filter-item">Başlangıç: ${new Date(startDate).toLocaleDateString('tr-TR')}</span>` : ''}
                                                ${endDate ? `<span class="filter-item">Bitiş: ${new Date(endDate).toLocaleDateString('tr-TR')}</span>` : ''}
                                                ${transactionTypeFilter ? `<span class="filter-item">Tür: ${transactionTypeFilter === 'gelir' ? 'Gelir' : 'Gider'}</span>` : ''}
                                            </div>
                                        ` : ''}

                                        <div class="summary-section">
                                            <div class="summary-card income">
                                                <div class="value">+${formatCurrency(
                                                    transactions.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                                )}</div>
                                                <div class="label">Toplam Gelir</div>
                                            </div>
                                            <div class="summary-card expense">
                                                <div class="value">-${formatCurrency(
                                                    transactions.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                                )}</div>
                                                <div class="label">Toplam Gider</div>
                                            </div>
                                            <div class="summary-card net">
                                                <div class="value">${formatCurrency(
                                                    transactions.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0) -
                                                    transactions.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                                )}</div>
                                                <div class="label">Net Durum</div>
                                            </div>
                                        </div>

                                        <table class="print-table">
                                            <thead>
                                                <tr>
                                                    <th style="width: 12%;">Tarih</th>
                                                    <th style="width: 20%;">Mağaza</th>
                                                    <th style="width: 15%;">İşlem Türü</th>
                                                    <th style="width: 15%;">Mağaza Durumu</th>
                                                    <th style="width: 12%;">Tutar</th>
                                                    <th style="width: 20%;">Açıklama</th>
                                                    <th style="width: 6%;">Durum</th>
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
                                                            <div class="text-truncate" title="${transaction.store?.kurum_adi || 'Bilinmeyen Mağaza'}">
                                                                ${transaction.store?.kurum_adi || 'Bilinmeyen Mağaza'}
                                                            </div>
                                                            <div style="font-size: 9px; color: #888;">${transaction.storeId}</div>
                                                        </td>
                                                        <td class="text-truncate" title="${transaction.islemTuru}">
                                                            ${transaction.islemTuru}
                                                        </td>
                                                        <td>
                                                            <span class="status-badge status-${transaction.store.durum.toLowerCase()}">
                                                                ${transaction.store.durum}
                                                            </span>
                                                            <div class="balance-info">
                                                                Bakiye: ${formatCurrency(transaction.store.bakiye)}
                                                            </div>
                                                        </td>
                                                        <td class="${transaction.harcama ? 'amount-expense' : 'amount-income'}">
                                                            ${transaction.harcama ? '-' : '+'}${formatCurrency(parseFloat(transaction.tutar))}
                                                        </td>
                                                        <td class="text-truncate" title="${transaction.aciklama}">
                                                            ${transaction.aciklama}
                                                        </td>
                                                        <td>
                                                            <span class="transaction-type type-${transaction.harcama ? 'expense' : 'income'}">
                                                                ${transaction.harcama ? 'GİDER' : 'GELİR'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>

                                        <div class="print-footer">
                                            <p><strong>Toplam ${transactions.length} hareket listelendi</strong></p>
                                            <p>Bu rapor Paşa Bayii Sipariş Sistemi tarafından ${new Date().toLocaleDateString('tr-TR')} tarihinde otomatik olarak oluşturulmuştur.</p>
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
                            className="flex items-center px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Yazdır
                    </button>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tarih
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mağaza
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    İşlem Türü
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mağaza Durumu
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tutar
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Açıklama
                                </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Durum
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData?.hareketler.map((transaction: Transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                        {new Date(transaction.tarih).toLocaleDateString('tr-TR')}
                                    </td>
                                        <td className="px-4 py-4">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                                            {transaction.store?.kurum_adi || 'Bilinmeyen Mağaza'}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{transaction.storeId}</div>
                                    </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                        <span className="truncate block max-w-28">{transaction.islemTuru}</span>
                                    </td>
                                        <td className="px-4 py-4">
                                        <div className="text-sm">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                                    transaction.store.durum === 'ALACAKLI' ? 'text-green-600 bg-green-100' :
                                                    transaction.store.durum === 'BORCLU' ? 'text-red-600 bg-red-100' :
                                                    'text-gray-600 bg-gray-100'
                                            }`}>
                                                {transaction.store.durum}
                                            </span>
                                                                                         <div className="text-xs text-gray-500 mt-1">
                                                 Bakiye: {formatCurrency(transaction.store.bakiye)}
                                             </div>
                                        </div>
                                    </td>
                                        <td className="px-4 py-4">
                                        <div className={`text-sm font-medium ${transaction.harcama ? 'text-red-600' : 'text-green-600'}`}>
                                            {transaction.harcama ? '-' : '+'}{formatCurrency(parseFloat(transaction.tutar))}
                                        </div>
                                    </td>
                                        <td className="px-4 py-4 text-sm text-gray-900">
                                        <span className="truncate block max-w-48" title={transaction.aciklama}>
                                            {transaction.aciklama}
                                        </span>
                                    </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                                transaction.harcama ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100'
                                            }`}>
                                            {transaction.harcama ? 'Gider' : 'Gelir'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

                {/* Modern Mali Kayıt Ekleme Modal */}
            {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {/* Modal Header */}
                            <div className="bg-[#00365a] text-white rounded-t-2xl p-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold">Yeni Mali Hareket</h3>
                                        <p className="text-blue-100 text-sm mt-1">Gelir veya gider kaydı oluşturun</p>
                                    </div>
                            <button
                                onClick={closeModal}
                                        className="text-blue-100 hover:text-white transition-colors p-2 hover:bg-white hover:bg-opacity-20 rounded-xl"
                                disabled={formLoading}
                            >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                                </div>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Müşteri Seçimi */}
                            <div className="dropdown-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Müşteri <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                        className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors text-left ${
                                            formLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                                        }`}
                                        disabled={formLoading}
                                    >
                                        <span className="text-gray-900">
                                            {selectedCustomer ? 
                                                stores.find(s => s.store_id === selectedCustomer)?.kurum_adi || 'Seçili Müşteri' :
                                                'Müşteri seçin...'
                                            }
                                        </span>
                                        <svg 
                                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {customerDropdownOpen && !formLoading && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                                            {stores.map((store) => (
                                                <div
                                                    key={store.store_id}
                                                    className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                        selectedCustomer === store.store_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                                    }`}
                                                    onClick={() => {
                                                        handleCustomerChange(store.store_id);
                                                        setCustomerDropdownOpen(false);
                                                    }}
                                                >
                                                    {store.kurum_adi}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                                {/* Otomatik Tutar Hesaplama */}
                                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">
                                        Otomatik Tutar Hesaplama (İsteğe Bağlı)
                                    </h4>
                                    
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Ürün Seçimi */}
                                <div className="md:col-span-2 dropdown-container">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Ürün</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                                                    className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors text-left ${
                                                        !selectedCustomer || formLoading || collections.length === 0 ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                                                    }`}
                                                    disabled={!selectedCustomer || formLoading || collections.length === 0}
                                                >
                                                    <span className="text-gray-900">
                                                        {!selectedCustomer ? 'Önce müşteri seçin...' :
                                                            collections.length === 0 ? 'Ürün bulunamadı...' :
                                                                selectedCollection ? 
                                                                    collections.find(c => c.id === selectedCollection)?.name + 
                                                                    ` (${formatCurrency(collections.find(c => c.id === selectedCollection)?.price_per_square_meter || 0)}/m²)` :
                                                                    'Ürün seçin...'
                                                        }
                                                    </span>
                                                    <svg 
                                                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${collectionDropdownOpen ? 'rotate-180' : ''}`}
                                                        fill="none" 
                                                        stroke="currentColor" 
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                                
                                                {collectionDropdownOpen && selectedCustomer && !formLoading && collections.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                                                        {collections.map((collection) => (
                                                            <div
                                                                key={collection.id}
                                                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                                    selectedCollection === collection.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                                                }`}
                                                                onClick={() => {
                                                                    setSelectedCollection(collection.id);
                                                                    setFormData(prev => ({ ...prev, collection_id: collection.id }));
                                                                    setCollectionDropdownOpen(false);
                                                                }}
                                                            >
                                                                {collection.name} ({formatCurrency(collection.price_per_square_meter)}/m²)
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                {/* Metrekare */}
                                <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Metrekare</label>
                                                                            <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.square_meters || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, square_meters: parseFloat(e.target.value) || 0 }))}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors"
                                        placeholder="0.00"
                                        disabled={formLoading}
                                    />
                                </div>

                                {/* Hesapla Butonu */}
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={calculateAmount}
                                        disabled={!formData.collection_id || !formData.square_meters || formLoading}
                                                className="w-full px-4 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#002847] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Hesapla
                                    </button>
                                        </div>
                                </div>
                            </div>

                                {/* İşlem Detayları */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">
                                        İşlem Detayları
                                    </h4>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* İşlem Türü */}
                            <div className="dropdown-container">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İşlem Türü <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setTransactionTypeDropdownOpen(!transactionTypeDropdownOpen)}
                                        className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors text-left ${
                                            formLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                                        }`}
                                        disabled={formLoading}
                                    >
                                        <span className="text-gray-900">
                                            {formData.islemTuru || 'İşlem türü seçin...'}
                                        </span>
                                        <svg 
                                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${transactionTypeDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {transactionTypeDropdownOpen && !formLoading && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                                            {/* Gelir Türleri */}
                                            {incomeTypes.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        Gelir Türleri
                                                    </div>
                                                    {incomeTypes.map((type) => (
                                                        <div
                                                            key={type}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                                formData.islemTuru === type ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
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
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            
                                            {/* Gider Türleri */}
                                            {expenseTypes.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        Gider Türleri
                                                    </div>
                                                    {expenseTypes.map((type) => (
                                                        <div
                                                            key={type}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                                formData.islemTuru === type ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
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
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Tutar */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tutar <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.tutar}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tutar: parseFloat(e.target.value) || 0 }))}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors"
                                    placeholder="0.00"
                                    required
                                    disabled={formLoading}
                                />
                                        </div>
                            </div>

                            {/* Tarih */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İşlem Tarihi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.tarih}
                                    onChange={(e) => setFormData(prev => ({ ...prev, tarih: e.target.value }))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors"
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Açıklama <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.aciklama}
                                    onChange={(e) => setFormData(prev => ({ ...prev, aciklama: e.target.value }))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors"
                                    rows={3}
                                    placeholder="İşlem açıklaması... Fiş no, Fatura no, Nakliye, Kargo, vb."
                                    required
                                    disabled={formLoading}
                                />
                                    </div>
                            </div>

                            {/* Butonlar */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={formLoading}
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                        className="flex-1 px-4 py-3 bg-[#00365a] text-white rounded-lg hover:bg-[#002847] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {formLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                Kaydediliyor...
                                            </>
                                        ) : (
                                            'Kaydet'
                                        )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default MuhasebePage; 