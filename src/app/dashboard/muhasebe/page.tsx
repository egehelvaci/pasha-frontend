'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { getStores, getStorePriceLists, Store, PriceListProduct } from '../../../services/api';

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

    const fetchAccountingData = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Token bulunamadı');
            }

            // Yeni API - tek endpoint'ten hem transactions hem bakiye bilgileri
            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe-hareketleri', {
                headers: {
                    'Authorization': `Bearer ${token}`,
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
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe/income-types', {
                headers: {
                    'Authorization': `Bearer ${token}`,
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
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/muhasebe/expense-types', {
                headers: {
                    'Authorization': `Bearer ${token}`,
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
            const token = localStorage.getItem('token');

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
                    'Authorization': `Bearer ${token}`,
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
        return null;
    }

    if (loading) {
        return (
            <div className="container-responsive py-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                    <div className="h-96 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-responsive py-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <div className="text-red-600 text-lg font-medium mb-2">Hata</div>
                    <div className="text-red-500 mb-4">{error}</div>
                    <button
                        onClick={() => fetchAccountingData(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
        <div className="container-responsive py-6">
            {/* Başlık */}
            <div className="flex flex-col gap-4 mb-6 mt-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Muhasebe Dashboard</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={openModal}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni Muhasebe Hareketi
                        </button>
                        <button
                            onClick={() => fetchAccountingData(true)}
                            className="flex items-center px-4 py-2 text-white rounded-lg transition-colors"
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

                {/* Filtreleme */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                        {/* Mağaza Filtresi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mağaza</label>
                            <select
                                value={selectedStoreFilter}
                                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                            >
                                <option value="">Tüm Mağazalar</option>
                                {responseData?.magazaBakiyeleri?.map((magaza) => (
                                    <option key={magaza.store_id} value={magaza.store_id}>
                                        {magaza.kurum_adi}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Başlangıç Tarihi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                            />
                        </div>

                        {/* Bitiş Tarihi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                            />
                        </div>

                        {/* İşlem Türü Filtresi */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
                            <select
                                value={transactionTypeFilter}
                                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                            >
                                <option value="">Tüm İşlemler</option>
                                <option value="gelir">Sadece Gelir</option>
                                <option value="gider">Sadece Gider</option>
                            </select>
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
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-sm text-gray-600">Aktif Filtreler:</span>
                            {selectedStoreFilter && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Mağaza: {responseData?.magazaBakiyeleri?.find(m => m.store_id === selectedStoreFilter)?.kurum_adi}
                                </span>
                            )}
                            {startDate && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Başlangıç: {new Date(startDate).toLocaleDateString('tr-TR')}
                                </span>
                            )}
                            {endDate && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Bitiş: {new Date(endDate).toLocaleDateString('tr-TR')}
                                </span>
                            )}
                            {transactionTypeFilter && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Tür: {transactionTypeFilter === 'gelir' ? 'Gelir' : 'Gider'}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Özet Kartları */}
            {responseData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    {/* Toplam Mağaza */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Toplam Mağaza</span>
                            </div>
                            <div className="text-xl font-bold text-gray-900">
                                {responseData.magazaBakiyeleri.length}
                            </div>
                        </div>
                    </div>

                    {/* Kasa Bakiyesi */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Kasa Bakiyesi</span>
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                                {formatCurrency(parseFloat(responseData.adminKasaBakiyesi))}
                            </div>
                        </div>
                    </div>

                    {/* Toplam Alacak */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Toplam Alacak</span>
                            </div>
                            <div className="text-lg font-bold text-red-600">
                                {formatCurrency(
                                    responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU')
                                        .reduce((sum, m) => sum + Math.abs(m.bakiye), 0) || 0
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Borçlu Mağazalar */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5" style={{color: '#00365a'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Borçlu Mağazalar</span>
                            </div>
                            <div className="text-xl font-bold text-red-600">
                                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'BORCLU').length || 0}
                            </div>
                        </div>
                    </div>

                    {/* Alacaklı Mağazalar */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Alacaklı Mağazalar</span>
                            </div>
                            <div className="text-xl font-bold text-green-600">
                                {responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI').length || 0}
                            </div>
                        </div>
                    </div>

                    {/* Toplam Verecek */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col space-y-2">
                            <div className="flex items-center space-x-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                                <span className="text-xs font-medium text-gray-500">Toplam Verecek</span>
                            </div>
                            <div className="text-lg font-bold text-blue-600">
                                {formatCurrency(
                                    responseData.magazaBakiyeleri?.filter(m => m.durum === 'ALACAKLI')
                                        .reduce((sum, m) => sum + m.bakiye, 0) || 0
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mağaza Detayları */}
            {responseData && responseData.magazaBakiyeleri && responseData.magazaBakiyeleri.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Borçlu Mağazalar */}
                    {responseData.magazaBakiyeleri.filter(m => m.durum === 'BORCLU').length > 0 && (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Borçlu Mağazalar</h2>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'BORCLU').map((magaza: MagazaBakiye) => (
                                    <div key={magaza.store_id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Alacaklı Mağazalar</h2>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'ALACAKLI').map((magaza: MagazaBakiye) => (
                                    <div key={magaza.store_id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
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
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Dengede Mağazalar</h2>
                            <div className="space-y-3">
                                {responseData.magazaBakiyeleri.filter(m => m.durum === 'DENGEDE').map((magaza: MagazaBakiye) => (
                                    <div key={magaza.store_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h3 className="text-sm font-medium text-blue-900 mb-3">Filtrelenmiş Veriler Özeti</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-900">{filteredData.hareketler.length}</div>
                            <div className="text-xs text-blue-700">Toplam İşlem</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                                {formatCurrency(
                                    filteredData.hareketler
                                        .filter(t => !t.harcama)
                                        .reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                            <div className="text-xs text-green-700">Toplam Gelir</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                                {formatCurrency(
                                    filteredData.hareketler
                                        .filter(t => t.harcama)
                                        .reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                            <div className="text-xs text-red-700">Toplam Gider</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-lg font-bold ${
                                (filteredData.hareketler.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0) -
                                 filteredData.hareketler.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)) >= 0
                                ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {formatCurrency(
                                    filteredData.hareketler.filter(t => !t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0) -
                                    filteredData.hareketler.filter(t => t.harcama).reduce((sum, t) => sum + parseFloat(t.tutar), 0)
                                )}
                            </div>
                            <div className="text-xs text-gray-700">Net Durum</div>
                        </div>
                    </div>
                </div>
            )}

            {/* İşlem Geçmişi */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8" id="son-islemler">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-medium text-gray-900">
                            Son İşlemler
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
                    <button
                        onClick={() => {
                            const printContent = document.getElementById('son-islemler');
                            if (printContent) {
                                const newWindow = window.open('', '_blank');
                                if (newWindow) {
                                    newWindow.document.write(`
                                        <html>
                                            <head>
                                                <title>Son İşlemler</title>
                                                <style>
                                                    body { font-family: Arial, sans-serif; margin: 20px; }
                                                    table { width: 100%; border-collapse: collapse; }
                                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                                    th { background-color: #f5f5f5; font-weight: bold; }
                                                    .bg-red-50 { background-color: #fef2f2; }
                                                    .bg-green-50 { background-color: #f0fdf4; }
                                                    .bg-gray-50 { background-color: #f9fafb; }
                                                    .text-red-600 { color: #dc2626; }
                                                    .text-green-600 { color: #16a34a; }
                                                    .text-gray-600 { color: #4b5563; }
                                                    h2 { margin-bottom: 20px; color: #1f2937; }
                                                </style>
                                            </head>
                                            <body>
                                                ${printContent.innerHTML}
                                            </body>
                                        </html>
                                    `);
                                    newWindow.document.close();
                                    newWindow.print();
                                    newWindow.close();
                                }
                            }
                        }}
                        className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Tarih
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                                    Mağaza
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                                    İşlem Türü
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                    Mağaza Durumu
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                    Tutar
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Açıklama
                                </th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Durum
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData?.hareketler.map((transaction: Transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-3 text-sm text-gray-900">
                                        {new Date(transaction.tarih).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                                            {transaction.store?.kurum_adi || 'Bilinmeyen Mağaza'}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{transaction.storeId}</div>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-gray-900">
                                        <span className="truncate block max-w-28">{transaction.islemTuru}</span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="text-sm">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                transaction.store.durum === 'ALACAKLI' ? 'text-green-600 bg-green-50' :
                                                transaction.store.durum === 'BORCLU' ? 'text-red-600 bg-red-50' :
                                                'text-gray-600 bg-gray-50'
                                            }`}>
                                                {transaction.store.durum}
                                            </span>
                                                                                         <div className="text-xs text-gray-500 mt-1">
                                                 Bakiye: {formatCurrency(transaction.store.bakiye)}
                                             </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className={`text-sm font-medium ${transaction.harcama ? 'text-red-600' : 'text-green-600'}`}>
                                            {transaction.harcama ? '-' : '+'}{formatCurrency(parseFloat(transaction.tutar))}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-sm text-gray-900">
                                        <span className="truncate block max-w-48" title={transaction.aciklama}>
                                            {transaction.aciklama}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.harcama ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                            {transaction.harcama ? 'Gider' : 'Gelir'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mali Kayıt Ekleme Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Mali Kayıt Ekle</h3>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={formLoading}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Müşteri Seçimi */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Müşteri <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                    required
                                    disabled={formLoading}
                                >
                                    <option value="">Müşteri seçin...</option>
                                    {stores.map((store) => (
                                        <option key={store.store_id} value={store.store_id}>
                                            {store.kurum_adi}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Ürün Seçimi, Metrekare ve Hesapla Butonu */}
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                {/* Ürün Seçimi */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ürün
                                    </label>
                                                                            <select
                                            value={selectedCollection}
                                            onChange={(e) => {
                                                setSelectedCollection(e.target.value);
                                                setFormData(prev => ({ ...prev, collection_id: e.target.value }));
                                            }}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                        disabled={!selectedCustomer || formLoading || collections.length === 0}
                                    >
                                        <option value="">
                                            {!selectedCustomer ? 'Önce müşteri seçin...' :
                                                collections.length === 0 ? 'Ürün bulunamadı...' :
                                                    'Ürün seçin...'}
                                        </option>
                                        {collections.map((collection) => (
                                            <option key={collection.id} value={collection.id}>
                                                {collection.name} ({formatCurrency(collection.price_per_square_meter)}/m²)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Metrekare */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Metrekare
                                    </label>
                                                                            <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.square_meters || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, square_meters: parseFloat(e.target.value) || 0 }))}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
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
                                        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        Hesapla
                                    </button>
                                </div>
                            </div>

                            {/* İşlem Türü */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    İşlem Türü <span className="text-red-500">*</span>
                                </label>
                                                                    <select
                                        value={formData.islemTuru}
                                        onChange={(e) => {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                islemTuru: e.target.value
                                            }));
                                        }}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                    required
                                    disabled={formLoading}
                                >
                                    <option value="">İşlem türü seçin...</option>
                                    
                                    {/* Gelir Türleri */}
                                    {incomeTypes.length > 0 && (
                                        <optgroup label="Gelir Türleri">
                                            {incomeTypes.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                    
                                    {/* Gider Türleri */}
                                    {expenseTypes.length > 0 && (
                                        <optgroup label="Gider Türleri">
                                            {expenseTypes.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
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
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                    placeholder="0.00"
                                    required
                                    disabled={formLoading}
                                />
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
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
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
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                    rows={3}
                                    placeholder="İşlem açıklaması... Fiş no, Fatura no, Nakliye, Kargo, vb."
                                    required
                                    disabled={formLoading}
                                />
                            </div>

                            {/* Butonlar */}
                            <div className="flex gap-3 pt-4">
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
                                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {formLoading ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MuhasebePage; 