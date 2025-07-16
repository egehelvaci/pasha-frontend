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

interface StoreBreakdown {
    store_id: string;
    store_name: string;
    balance: number;
    status: 'ALACAKLI' | 'BORÇLU';
}

interface AdminStatus {
    description: string;
    type: 'ALACAK' | 'BORÇ';
    amount: number;
}

interface FinancialSummary {
    total_stores: number;
    total_debt: number;
    total_credit: number;
    net_balance: number;
    admin_status: AdminStatus;
    store_breakdown: StoreBreakdown[];
}

interface AccountingData {
    transactions: any[];
    pagination: any;
    financial_summary: FinancialSummary;
}

interface TransactionFormData {
    customer_id: string;
    product_id: string;
    square_meters: number;
    transaction_type: string;
    amount: number;
    is_expense: boolean;
    transaction_date: string;
    description: string;
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
    const [formData, setFormData] = useState<TransactionFormData>({
        customer_id: '',
        product_id: '',
        square_meters: 0,
        transaction_type: '',
        amount: 0,
        is_expense: false,
        transaction_date: new Date().toISOString().slice(0, 16),
        description: ''
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

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/accounting-transactions', {
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

            setData(result.data);
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
                            id: item.price_list_detail_id || item.id || index,
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
                            id: item.price_list_detail_id || item.id || index,
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
        // GELİR kategorisi (is_expense = false)
        const incomeTypes = [
            'Parekende Satış',
            'Parekende Tahsilat',
            'Alacak ve/veya Tahsilat',
            'Nakit, Döviz ve/veya Değerli Kağıt Tahsilatı',
            'Borç Tahsilatı',
            'Paşaoğlu Halı Moka Post Tahsilatı',
            'Devreden Alacak Bakiyesi'
        ];

        // HARCAMA kategorisi (is_expense = true)
        const expenseTypes = [
            'Araç Bakım / Yakıt / Araç Sigorta / HGS Giderleri',
            'Mutfak Gideri',
            'Mal ve/veya Tamir, Servis vb. Hizmet Alımı',
            'Nakit, Döviz ve/veya Değerli Kağıt Ödemesi',
            'Personel Maaş Ödemesi',
            'Nakliye ve/veya Kargo Ödemesi',
            'Borç Verme',
            'Elektrik / Su / Isınma / Telefon / İnternet Giderleri',
            'İşletme İçi Sarf Malzeme ve/veya Kırtasiye Giderleri',
            'Kira / Aidat Giderleri',
            'Vergi / SSK / Bağkur / Muhasebe Giderleri',
            'Seyhat ve/veya Konaklama Giderleri',
            'Bilgi İşlem ve/veya Yazılım Hizmet Ödemesi',
            'Personel Maaş Hakkedişi',
            'Personel İkramiye Hakkedişi',
            'Personel Mesai Hakkedişi',
            'Personel İkramiye Ödemesi',
            'Personel Mesai Ödemesi',
            'Mal ve/veya Tamir, Servis vb. Hizmet Ödemesi',
            'Devreden Borç Bakiyesi',
            'Ürün ve/veya Hizmet İadesi',
            'Bilgi İşlem ve/veya Yazılım Hizmet Hakedişi'
        ];

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
        setFormData(prev => ({ ...prev, customer_id: customerId, product_id: '', amount: 0 }));

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
        const selectedProduct = collections.find(c => c.id === formData.product_id);
        if (selectedProduct && formData.square_meters > 0) {
            const calculatedAmount = selectedProduct.price_per_square_meter * formData.square_meters;
            setFormData(prev => ({ ...prev, amount: calculatedAmount }));
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
            customer_id: '',
            product_id: '',
            square_meters: 0,
            transaction_type: '',
            amount: 0,
            is_expense: false,
            transaction_date: new Date().toISOString().slice(0, 16),
            description: ''
        });
        setSelectedCustomer('');
        setSelectedCollection('');
        setProducts([]);
        setCollections([]);
    };

    // Form gönder
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.customer_id || !formData.amount || !formData.description) {
            alert('Lütfen gerekli alanları doldurun');
            return;
        }

        try {
            setFormLoading(true);
            const token = localStorage.getItem('token');

            const submitData = {
                ...formData,
                transaction_date: new Date(formData.transaction_date).toISOString()
            };

            const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/accounting-transactions', {
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
            case 'ALACAK':
                return 'text-green-600 bg-green-50';
            case 'BORÇLU':
            case 'BORÇ':
                return 'text-red-600 bg-red-50';
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

    const { financial_summary } = data;

    return (
        <div className="container-responsive py-6">
            {/* Başlık */}
            <div className="flex items-center justify-between mb-6 mt-8">
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

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Toplam Mağaza */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{color: '#00365a'}}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Mağaza</dt>
                                <dd className="text-lg font-medium text-gray-900">{financial_summary.total_stores}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Toplam Borç */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Borç</dt>
                                <dd className="text-lg font-medium text-red-600">{formatCurrency(financial_summary.total_debt)}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Toplam Alacak */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Toplam Alacak</dt>
                                <dd className="text-lg font-medium text-green-600">{formatCurrency(financial_summary.total_credit)}</dd>
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Net Bakiye */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0" style={{color: '#00365a'}}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-gray-500 truncate">Net Bakiye</dt>
                                <dd className={`text-lg font-medium ${financial_summary.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(financial_summary.net_balance)}
                                </dd>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Durumu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Admin Finansal Durumu</h2>
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(financial_summary.admin_status.type)}`}>
                    <span className="mr-2">
                        {financial_summary.admin_status.type === 'ALACAK' ? '↗️' : '↘️'}
                    </span>
                    {financial_summary.admin_status.description}
                </div>
                <div className={`text-2xl font-bold mt-2 ${financial_summary.admin_status.type === 'ALACAK' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financial_summary.admin_status.amount)}
                </div>
            </div>

            {/* Mağaza Detayları */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Mağaza Bazında Finansal Durum</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Mağaza Adı
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Bakiye
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Durum
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    İşlemler
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {financial_summary.store_breakdown.map((store) => (
                                <tr key={store.store_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{store.store_name}</div>
                                        <div className="text-sm text-gray-500">{store.store_id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className={`text-sm font-medium ${store.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(Math.abs(store.balance))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(store.status)}`}>
                                            {store.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button className="mr-3" 
                                            style={{color: '#00365a'}}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#002847'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#00365a'}>
                                            Detay
                                        </button>
                                        <button className="text-green-600 hover:text-green-900">
                                            Hareket
                                        </button>
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
                                                setFormData(prev => ({ ...prev, product_id: e.target.value }));
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
                                            value={formData.square_meters}
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
                                        disabled={!formData.product_id || !formData.square_meters || formLoading}
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
                                        value={formData.transaction_type}
                                        onChange={(e) => {
                                            const newTransactionType = e.target.value;
                                            const isExpense = getTransactionExpenseType(newTransactionType);
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                transaction_type: newTransactionType,
                                                is_expense: isExpense 
                                            }));
                                        }}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a]"
                                    required
                                    disabled={formLoading}
                                >
                                    <option value="">İşlem türü seçin...</option>
                                    <option value="Parekende Satış">Parekende Satış</option>
                                    <option value="Parekende Tahsilat">Parekende Tahsilat</option>
                                    <option value="Araç Bakım / Yakıt / Araç Sigorta / HGS Giderleri">Araç Bakım / Yakıt / Araç Sigorta / HGS Giderleri</option>
                                    <option value="Mutfak Gideri">Mutfak Gideri</option>
                                    <option value="Alacak ve/veya Tahsilat">Alacak ve/veya Tahsilat</option>
                                    <option value="Mal ve/veya Tamir, Servis vb. Hizmet Alımı">Mal ve/veya Tamir, Servis vb. Hizmet Alımı</option>
                                    <option value="Nakit, Döviz ve/veya Değerli Kağıt Tahsilatı">Nakit, Döviz ve/veya Değerli Kağıt Tahsilatı</option>
                                    <option value="Nakit, Döviz ve/veya Değerli Kağıt Ödemesi">Nakit, Döviz ve/veya Değerli Kağıt Ödemesi</option>
                                    <option value="Personel Maaş Ödemesi">Personel Maaş Ödemesi</option>
                                    <option value="Nakliye ve/veya Kargo Ödemesi">Nakliye ve/veya Kargo Ödemesi</option>
                                    <option value="Borç Verme">Borç Verme</option>
                                    <option value="Borç Tahsilatı">Borç Tahsilatı</option>
                                    <option value="Paşaoğlu Halı Moka Post Tahsilatı">Paşaoğlu Halı Moka Post Tahsilatı</option>
                                    <option value="Tanımsız Fiyat İşlemi">Tanımsız Fiyat İşlemi</option>
                                    <option value="Teslimat Fişi Otomatik Kaydı">Teslimat Fişi Otomatik Kaydı</option>
                                    <option value="Elektrik / Su / Isınma / Telefon / İnternet Giderleri">Elektrik / Su / Isınma / Telefon / İnternet Giderleri</option>
                                    <option value="İşletme İçi Sarf Malzeme ve/veya Kırtasiye Giderleri">İşletme İçi Sarf Malzeme ve/veya Kırtasiye Giderleri</option>
                                    <option value="Kira / Aidat Giderleri">Kira / Aidat Giderleri</option>
                                    <option value="Vergi / SSK / Bağkur / Muhasebe Giderleri">Vergi / SSK / Bağkur / Muhasebe Giderleri</option>
                                    <option value="Seyhat ve/veya Konaklama Giderleri">Seyhat ve/veya Konaklama Giderleri</option>
                                    <option value="Bilgi İşlem ve/veya Yazılım Hizmet Ödemesi">Bilgi İşlem ve/veya Yazılım Hizmet Ödemesi</option>
                                    <option value="Personel Maaş Hakkedişi">Personel Maaş Hakkedişi</option>
                                    <option value="Personel İkramiye Hakkedişi">Personel İkramiye Hakkedişi</option>
                                    <option value="Personel Mesai Hakkedişi">Personel Mesai Hakkedişi</option>
                                    <option value="Personel İkramiye Ödemesi">Personel İkramiye Ödemesi</option>
                                    <option value="Personel Mesai Ödemesi">Personel Mesai Ödemesi</option>
                                    <option value="Mal ve/veya Tamir, Servis vb. Hizmet Ödemesi">Mal ve/veya Tamir, Servis vb. Hizmet Ödemesi</option>
                                    <option value="Devreden Alacak Bakiyesi">Devreden Alacak Bakiyesi</option>
                                    <option value="Devreden Borç Bakiyesi">Devreden Borç Bakiyesi</option>
                                    <option value="Ürün ve/veya Hizmet İadesi">Ürün ve/veya Hizmet İadesi</option>
                                    <option value="Bilgi İşlem ve/veya Yazılım Hizmet Hakedişi">Bilgi İşlem ve/veya Yazılım Hizmet Hakedişi</option>
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
                                    value={formData.amount}
                                    onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
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
                                    value={formData.transaction_date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
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
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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