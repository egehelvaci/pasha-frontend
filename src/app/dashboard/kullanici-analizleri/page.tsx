"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useToken } from '@/app/hooks/useToken';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getMyUserStatistics, UserStatisticsResponse } from '../../../services/api';

// Currency sembollerini tanımla
const CURRENCY_SYMBOLS = {
  'TRY': '₺',
  'USD': '$',
  'EUR': '€'
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

type UserStatisticsData = UserStatisticsResponse['data'];

export default function UserAnalyticsPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const token = useToken();
  const router = useRouter();
  const [statisticsData, setStatisticsData] = useState<UserStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'1_month' | '3_months' | '6_months' | '1_year'>('1_year');
  
  // Currency state
  const [userCurrency, setUserCurrency] = useState<string>('TRY');

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

  useEffect(() => {
    // Auth yüklemesi tamamlanmadıysa bekle
    if (authLoading) return;
    
    // Auth yüklemesi tamamlandıktan sonra user kontrolü yap
    if (!user) {
      router.push('/');
      return;
    }

    // Admin ise admin analizlere yönlendir
    if (isAdmin) {
      router.push('/dashboard/analizler');
      return;
    }

    // canSeePrice kontrolü
    if (user && !user.canSeePrice) {
      router.push('/dashboard');
      return;
    }

    fetchUserStatistics();
  }, [user, isAdmin, router, selectedPeriod, authLoading]);

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Kullanıcı girişi kontrolü
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Oturum Gerekli</h3>
          <p className="mt-1 text-sm text-gray-500">Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fetchUserStatistics = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        router.push('/');
        return;
      }

      const data = await getMyUserStatistics(selectedPeriod);
      setStatisticsData(data);
    } catch (error: any) {
      console.error('Kullanıcı istatistikleri hatası:', error);
      setError(error.message || 'Bir hata oluştu');
      
      // Mock data for development/testing
      setStatisticsData({
        user_info: {
          user_id: user?.userId || 'test-user-id',
          name: user?.name + ' ' + (user?.surname || ''),
          email: user?.email || 'test@example.com',
          store_name: user?.store?.kurum_adi || 'Test Mağaza',
          store_id: user?.store?.store_id || 'test-store-id'
        },
        order_statistics: {
          total_orders: 25,
          total_amount: 45750.50,
          total_area_m2: 125.75,
          pending_orders: 3,
          confirmed_orders: 8,
          delivered_orders: 12,
          canceled_orders: 2,
          completed_orders: 20
        },
        top_products: [
          {
            product_id: 'product-1',
            product_name: 'Premium Anadolu Halısı',
            collection_name: 'Premium Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 15,
            total_amount: 12500.75,
            order_count: 8
          },
          {
            product_id: 'product-2',
            product_name: 'Klasik Şark Halısı',
            collection_name: 'Klasik Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 12,
            total_amount: 9800.25,
            order_count: 6
          },
          {
            product_id: 'product-3',
            product_name: 'Modern Desenli Halı',
            collection_name: 'Modern Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 10,
            total_amount: 8750.50,
            order_count: 5
          },
          {
            product_id: 'product-4',
            product_name: 'Vintage Tarzı Halı',
            collection_name: 'Vintage Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 8,
            total_amount: 7200.00,
            order_count: 4
          },
          {
            product_id: 'product-5',
            product_name: 'Çocuk Odası Halısı',
            collection_name: 'Çocuk Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 6,
            total_amount: 3500.25,
            order_count: 3
          }
        ],
        top_collections: [
          {
            collection_id: 'collection-1',
            collection_name: 'Premium Koleksiyon',
            collection_code: 'PREM',
            total_quantity: 35,
            total_amount: 28500.00,
            order_count: 12
          },
          {
            collection_id: 'collection-2',
            collection_name: 'Klasik Koleksiyon',
            collection_code: 'KLAS',
            total_quantity: 28,
            total_amount: 22100.50,
            order_count: 9
          },
          {
            collection_id: 'collection-3',
            collection_name: 'Modern Koleksiyon',
            collection_code: 'MOD',
            total_quantity: 22,
            total_amount: 18750.25,
            order_count: 7
          },
          {
            collection_id: 'collection-4',
            collection_name: 'Vintage Koleksiyon',
            collection_code: 'VINT',
            total_quantity: 18,
            total_amount: 15200.00,
            order_count: 6
          },
          {
            collection_id: 'collection-5',
            collection_name: 'Çocuk Koleksiyon',
            collection_code: 'COCUK',
            total_quantity: 12,
            total_amount: 8900.75,
            order_count: 4
          }
        ],
        monthly_orders: [
          {
            month: '2024-01-01T00:00:00.000Z',
            order_count: 5,
            total_amount: 8750.25
          },
          {
            month: '2023-12-01T00:00:00.000Z',
            order_count: 3,
            total_amount: 5200.00
          },
          {
            month: '2023-11-01T00:00:00.000Z',
            order_count: 4,
            total_amount: 7100.50
          },
          {
            month: '2023-10-01T00:00:00.000Z',
            order_count: 6,
            total_amount: 9850.75
          },
          {
            month: '2023-09-01T00:00:00.000Z',
            order_count: 2,
            total_amount: 3750.00
          },
          {
            month: '2023-08-01T00:00:00.000Z',
            order_count: 5,
            total_amount: 11100.00
          }
        ],
        period_info: {
          period: selectedPeriod,
          start_date: '2023-01-15T10:30:00.000Z',
          end_date: '2024-01-15T10:30:00.000Z'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchUserStatistics();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">İstatistik verileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!statisticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Veri Yüklenemedi</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Chart yapılandırmaları
  const topProductsChartData = {
    labels: statisticsData.top_products.map(product => product.product_name),
    datasets: [
      {
        label: 'Sipariş Adedi',
        data: statisticsData.top_products.map(product => product.total_quantity),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)', 
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)', 
          'rgba(239, 68, 68, 1)',
          'rgba(139, 92, 246, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const topCollectionsChartData = {
    labels: statisticsData.top_collections.map(collection => collection.collection_name),
    datasets: [
      {
        label: `Toplam Tutar (${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency})`,
        data: statisticsData.top_collections.map(collection => collection.total_amount),
        backgroundColor: [
          'rgba(236, 72, 153, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(6, 182, 212, 0.8)'
        ],
        borderColor: [
          'rgba(236, 72, 153, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(251, 146, 60, 1)',
          'rgba(168, 85, 247, 1)',
          'rgba(6, 182, 212, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const monthlyOrdersChartData = {
    labels: statisticsData.monthly_orders.map(item => {
      const date = new Date(item.month);
      return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
    }).reverse(), // En eski aydan en yeniye doğru
    datasets: [
      {
        label: 'Sipariş Sayısı',
        data: statisticsData.monthly_orders.map(item => item.order_count).reverse(),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: `Toplam Tutar (${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency})`,
        data: statisticsData.monthly_orders.map(item => item.total_amount).reverse(),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  // Sipariş durumu dağılımı için pie chart
  const orderStatusChartData = {
    labels: ['Teslim Edilmiş', 'Onaylanmış', 'Bekleyen', 'İptal Edilmiş'],
    datasets: [
      {
        data: [
          statisticsData.order_statistics.delivered_orders,
          statisticsData.order_statistics.confirmed_orders,
          statisticsData.order_statistics.pending_orders,
          statisticsData.order_statistics.canceled_orders
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // Yeşil - Teslim Edilmiş
          'rgba(59, 130, 246, 0.8)',  // Mavi - Onaylanmış
          'rgba(245, 158, 11, 0.8)',  // Sarı - Bekleyen
          'rgba(239, 68, 68, 0.8)'    // Kırmızı - İptal Edilmiş
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Sipariş Sayısı'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: `Tutar (${CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency})`
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const simpleChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      },
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false
      },
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1_month': return 'Son 1 Ay';
      case '3_months': return 'Son 3 Ay';
      case '6_months': return 'Son 6 Ay';
      case '1_year': return 'Son 1 Yıl';
      default: return period;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sipariş Analizlerim</h1>
          <p className="mt-2 text-gray-600">
            Merhaba <span className="font-semibold">{statisticsData.user_info.name}</span>, sipariş istatistiklerinizi görüntüleyin
          </p>
          <p className="text-sm text-gray-500">{statisticsData.user_info.store_name}</p>
        </div>

        {/* Period Selector & Refresh */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Zaman Aralığı Seçin</h2>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: '1_month', label: 'Son 1 Ay' },
                    { value: '3_months', label: 'Son 3 Ay' },
                    { value: '6_months', label: 'Son 6 Ay' },
                    { value: '1_year', label: 'Son 1 Yıl' }
                  ].map((period) => (
                    <button
                      key={period.value}
                      onClick={() => setSelectedPeriod(period.value as any)}
                      className={`px-4 py-2 rounded-md font-medium transition-colors ${
                        selectedPeriod === period.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Yenile
              </button>
            </div>
          </div>
        </div>

        {/* Toplam İstatistikler Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Toplam Sipariş</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {statisticsData.order_statistics.total_orders}
                </p>
                <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Toplam Harcama</h3>
                <p className="text-3xl font-bold text-green-600">
                  {statisticsData.order_statistics.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
                </p>
                <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Tamamlanan</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {statisticsData.order_statistics.completed_orders}
                </p>
                <p className="text-sm text-gray-500 mt-1">Onaylanmış + Teslim Edilmiş</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Toplam Alan</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {statisticsData.order_statistics.total_area_m2.toFixed(1)} m²
                </p>
                <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* En Çok Sipariş Ettiğim Ürünler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Sipariş Ettiğim Ürünler</h2>
            <div style={{ height: '400px' }}>
              <Bar data={topProductsChartData} options={simpleChartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              {statisticsData.top_products.map((product, index) => (
                <div key={product.product_id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                  <div>
                    <div className="font-medium">{index + 1}. {product.product_name}</div>
                    <div className="text-gray-500">{product.collection_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900">{product.total_quantity} adet</div>
                    <div className="text-gray-500">{product.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}</div>
                    <div className="text-xs text-blue-600">{product.order_count} sipariş</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* En Çok Tercih Ettiğim Koleksiyonlar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Tercih Ettiğim Koleksiyonlar</h2>
            <div style={{ height: '400px' }}>
              <Bar data={topCollectionsChartData} options={simpleChartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              {statisticsData.top_collections.map((collection, index) => (
                <div key={collection.collection_id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                  <div>
                    <div className="font-medium">{index + 1}. {collection.collection_name}</div>
                    <div className="text-gray-500">Kod: {collection.collection_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900">{collection.total_quantity} adet</div>
                    <div className="text-gray-500">{collection.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}</div>
                    <div className="text-xs text-blue-600">{collection.order_count} sipariş</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* İkinci Satır Grafikler */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Aylık Sipariş Trendi */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Aylık Sipariş Trendi</h2>
            <div style={{ height: '400px' }}>
              <Line data={monthlyOrdersChartData} options={chartOptions} />
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {statisticsData.monthly_orders.slice(0, 6).reverse().map((item, index) => {
                const date = new Date(item.month);
                const monthName = date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short' });
                return (
                  <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-semibold text-gray-900">{monthName}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      <div>{item.order_count} sipariş</div>
                      <div>{item.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sipariş Durumu Dağılımı */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sipariş Durumu Dağılımı</h2>
            <div style={{ height: '300px' }}>
              <Doughnut data={orderStatusChartData} options={pieChartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>Teslim Edilmiş</span>
                </div>
                <span className="font-medium">{statisticsData.order_statistics.delivered_orders}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span>Onaylanmış</span>
                </div>
                <span className="font-medium">{statisticsData.order_statistics.confirmed_orders}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Bekleyen</span>
                </div>
                <span className="font-medium">{statisticsData.order_statistics.pending_orders}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>İptal Edilmiş</span>
                </div>
                <span className="font-medium">{statisticsData.order_statistics.canceled_orders}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Özet Bilgiler */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Özet Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{statisticsData.order_statistics.total_orders}</div>
              <div className="text-sm text-gray-600">Toplam Sipariş</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(statisticsData.order_statistics.total_amount / statisticsData.order_statistics.total_orders || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {CURRENCY_SYMBOLS[userCurrency as keyof typeof CURRENCY_SYMBOLS] || userCurrency}
              </div>
              <div className="text-sm text-gray-600">Ortalama Sipariş Tutarı</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {((statisticsData.order_statistics.completed_orders / statisticsData.order_statistics.total_orders) * 100 || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Tamamlanma Oranı</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {(statisticsData.order_statistics.total_area_m2 / statisticsData.order_statistics.total_orders || 0).toFixed(1)} m²
              </div>
              <div className="text-sm text-gray-600">Ortalama Sipariş Alanı</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 