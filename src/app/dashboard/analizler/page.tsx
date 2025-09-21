"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

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

interface TopStore {
  store_id: string;
  store_name: string;
  user_name: string;
  order_count: number;
  total_amount: number;
  period: string;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  collection_name: string;
  product_image: string;
  total_quantity: number;
  total_amount: number;
  period: string;
}

interface OrderOverTimeData {
  time_period: string;
  order_count: number;
  total_amount: number;
  total_area_m2: number;
}

interface TotalStats {
  total_orders: number;
  total_amount: number;
  total_product_quantity: number;
  total_area_m2: number;
  period: string;
  start_date: string;
  end_date: string;
}

interface AnalyticsData {
  topStores: TopStore[];
  topProducts: TopProduct[];
  ordersOverTime: OrderOverTimeData[];
  totalStats: TotalStats;
}

export default function AnalyticsPage() {
  const { user, isAdmin, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'1_month' | '3_months' | '1_year'>('1_year');

  // canSeePrice kontrolü
  useEffect(() => {
    if (user && !user.canSeePrice) {
      router.push('/dashboard');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    // Auth yüklemesi tamamlanmadıysa bekle
    if (authLoading) return;
    
    // Auth yüklemesi tamamlandıktan sonra admin kontrolü yap
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAnalyticsData();
  }, [isAdmin, router, selectedPeriod, authLoading]);

  // Auth yüklenirken loading göster
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00365a]"></div>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Erişim Reddedildi</h3>
          <p className="mt-1 text-sm text-gray-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00365a] hover:bg-[#004170] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00365a]"
            >
              Dashboard'a Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        router.push('/');
        return;
      }

      const baseUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/statistics`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Paralel olarak tüm API'leri çağır
      const [topStoresRes, topProductsRes, ordersOverTimeRes, totalStatsRes] = await Promise.all([
        fetch(`${baseUrl}/top-stores?period=${selectedPeriod}`, { headers }),
        fetch(`${baseUrl}/top-products?period=${selectedPeriod}`, { headers }),
        fetch(`${baseUrl}/orders-over-time?period=${selectedPeriod}&groupBy=month`, { headers }),
        fetch(`${baseUrl}/totals?period=${selectedPeriod}`, { headers })
      ]);

      // Tüm response'ları kontrol et
      if (!topStoresRes.ok || !topProductsRes.ok || !ordersOverTimeRes.ok || !totalStatsRes.ok) {
        throw new Error('Analytics verisi alınamadı');
      }

      const [topStoresData, topProductsData, ordersOverTimeData, totalStatsData] = await Promise.all([
        topStoresRes.json(),
        topProductsRes.json(),
        ordersOverTimeRes.json(),
        totalStatsRes.json()
      ]);

      // Tüm response'ların başarılı olduğunu kontrol et
      if (topStoresData.success && topProductsData.success && ordersOverTimeData.success && totalStatsData.success) {
        setAnalyticsData({
          topStores: topStoresData.data.stores,
          topProducts: topProductsData.data.products,
          ordersOverTime: ordersOverTimeData.data.chart_data,
          totalStats: totalStatsData.data
        });
      } else {
        throw new Error('Analytics verisi alınamadı');
      }
    } catch (error: any) {
      console.error('Analytics hatası:', error);
      setError(error.message || 'Bir hata oluştu');
      
      // Mock data for development
      setAnalyticsData({
        topStores: [
          { 
            store_id: '1', 
            store_name: 'ABC Halı Mağazası', 
            user_name: 'Ahmet Yılmaz', 
            order_count: 25, 
            total_amount: 45750.50, 
            period: selectedPeriod 
          },
          { 
            store_id: '2', 
            store_name: 'XYZ Tekstil', 
            user_name: 'Mehmet Özkan', 
            order_count: 18, 
            total_amount: 32100.25, 
            period: selectedPeriod 
          },
          { 
            store_id: '3', 
            store_name: 'Modern Halı Dünyası', 
            user_name: 'Fatma Demir', 
            order_count: 15, 
            total_amount: 28900.75, 
            period: selectedPeriod 
          },
          { 
            store_id: '4', 
            store_name: 'Elit Halı Sarayı', 
            user_name: 'Can Kaya', 
            order_count: 12, 
            total_amount: 22450.00, 
            period: selectedPeriod 
          },
          { 
            store_id: '5', 
            store_name: 'Premium Tekstil', 
            user_name: 'Ayşe Şahin', 
            order_count: 10, 
            total_amount: 19200.30, 
            period: selectedPeriod 
          }
        ],
        topProducts: [
          {
            product_id: 'product-1',
            product_name: 'Premium Anadolu Halısı',
            collection_name: 'Geleneksel Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 45,
            total_amount: 22750.50,
            period: selectedPeriod
          },
          {
            product_id: 'product-2',
            product_name: 'Modern Desenli Halı',
            collection_name: 'Modern Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 38,
            total_amount: 19450.75,
            period: selectedPeriod
          },
          {
            product_id: 'product-3',
            product_name: 'Vintage Tarzı Halı',
            collection_name: 'Vintage Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 32,
            total_amount: 16800.00,
            period: selectedPeriod
          },
          {
            product_id: 'product-4',
            product_name: 'Lüks Yün Halı',
            collection_name: 'Premium Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 28,
            total_amount: 15750.25,
            period: selectedPeriod
          },
          {
            product_id: 'product-5',
            product_name: 'Çocuk Odası Halısı',
            collection_name: 'Çocuk Koleksiyon',
            product_image: '/logo.svg',
            total_quantity: 25,
            total_amount: 8750.50,
            period: selectedPeriod
          }
        ],
        ordersOverTime: [
          {
            time_period: '2024-01',
            order_count: 45,
            total_amount: 67500.75,
            total_area_m2: 1250.5
          },
          {
            time_period: '2024-02',
            order_count: 52,
            total_amount: 78650.25,
            total_area_m2: 1456.8
          },
          {
            time_period: '2024-03',
            order_count: 38,
            total_amount: 55200.50,
            total_area_m2: 1098.3
          }
        ],
        totalStats: {
          total_orders: 245,
          total_amount: 387650.75,
          total_product_quantity: 1847,
          total_area_m2: 12567.8,
          period: selectedPeriod,
          start_date: '2023-03-15T10:30:00.000Z',
          end_date: '2024-03-15T10:30:00.000Z'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00365a]"></div>
          <span className="text-gray-600">Analiz verileri yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-medium mb-2">Veri Yüklenemedi</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button 
            onClick={fetchAnalyticsData}
                            className="px-4 py-2 bg-[#00365a] text-white rounded-md hover:bg-[#004170]"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Uzun isimleri kısaltma fonksiyonu
  const truncateText = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Chart yapılandırmaları
  const topStoresChartData = {
    labels: analyticsData.topStores.map(store => truncateText(store.store_name, 20)),
    datasets: [
      {
        label: 'Sipariş Adedi',
        data: analyticsData.topStores.map(store => store.order_count),
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

  const topProductsChartData = {
    labels: analyticsData.topProducts.map(product => truncateText(product.product_name, 15)),
    datasets: [
      {
        label: 'Toplam Adet',
        data: analyticsData.topProducts.map(product => product.total_quantity),
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

  const ordersOverTimeChartData = {
    labels: analyticsData.ordersOverTime.map(item => item.time_period),
    datasets: [
      {
        label: 'Toplam Metrekare (m²)',
        data: analyticsData.ordersOverTime.map(item => item.total_area_m2),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        yAxisID: 'y'
      },
      {
        label: 'Sipariş Sayısı',
        data: analyticsData.ordersOverTime.map(item => item.order_count),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Analiz Verileri'
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
          text: 'Metrekare (m²)'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Sipariş Sayısı'
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
      tooltip: {
        callbacks: {
          title: function(context: any) {
            // Tooltip'te tam mağaza adını göster
            const dataIndex = context[0].dataIndex;
            if (context[0].chart.canvas.id.includes('stores')) {
              return analyticsData.topStores[dataIndex]?.store_name || context[0].label;
            } else {
              return analyticsData.topProducts[dataIndex]?.product_name || context[0].label;
            }
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '1_month': return 'Son 1 Ay';
      case '3_months': return 'Son 3 Ay';
      case '1_year': return 'Son 1 Yıl';
      default: return period;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analiz Paneli</h1>
          <p className="mt-2 text-gray-600">Sipariş ve mağaza analizlerinizi görüntüleyin</p>
        </div>

        {/* Period Selector */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zaman Aralığı Seçin</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { value: '1_month', label: 'Son 1 Ay' },
                { value: '3_months', label: 'Son 3 Ay' }, 
                { value: '1_year', label: 'Son 1 Yıl' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value as any)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    selectedPeriod === period.value
                      ? 'bg-[#00365a] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toplam İstatistikler Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Siparişler</h3>
            <p className="text-3xl font-bold text-[#00365a]">
              {analyticsData.totalStats.total_orders}
            </p>
            <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Ciro</h3>
            <p className="text-3xl font-bold text-green-600">
              {analyticsData.totalStats.total_amount.toLocaleString('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Ürün Adedi</h3>
            <p className="text-3xl font-bold text-purple-600">
              {analyticsData.totalStats.total_product_quantity}
            </p>
            <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Metrekare</h3>
            <p className="text-3xl font-bold text-orange-600">
              {analyticsData.totalStats.total_area_m2.toFixed(1)} m²
            </p>
            <p className="text-sm text-gray-500 mt-1">{getPeriodLabel(selectedPeriod)}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* En Çok Sipariş Veren Mağazalar */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Sipariş Veren Mağazalar (TOP 5)</h2>
            <div style={{ height: '350px', marginBottom: '20px' }}>
              <Bar data={topStoresChartData} options={simpleChartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              {analyticsData.topStores.map((store, index) => (
                <div key={store.store_id} className="flex justify-between items-center text-sm">
                  <span className="font-medium" title={store.store_name}>
                    {index + 1}. {truncateText(store.store_name, 30)}
                  </span>
                  <div className="text-right">
                    <div className="text-gray-900">{store.order_count} sipariş</div>
                    <div className="text-gray-500">{store.total_amount.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: 'TRY'
                    })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* En Çok Sipariş Edilen Ürünler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Sipariş Edilen Ürünler (TOP 5)</h2>
            <div style={{ height: '350px', marginBottom: '20px' }}>
              <Bar data={topProductsChartData} options={simpleChartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              {analyticsData.topProducts.map((product, index) => (
                <div key={product.product_id} className="flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">{index + 1}. {product.product_name}</div>
                    <div className="text-gray-500">{product.collection_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-900">{product.total_quantity} adet</div>
                    <div className="text-gray-500">{product.total_amount.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: 'TRY'
                    })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zaman Bazlı Analiz */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Zaman Bazlı Sipariş Analizi</h2>
          <div style={{ height: '400px' }}>
            <Line data={ordersOverTimeChartData} options={chartOptions} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.ordersOverTime.map((item, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900">{item.time_period}</div>
                <div className="text-sm text-gray-600 mt-1">
                  <div>{item.order_count} sipariş</div>
                  <div>{item.total_area_m2.toFixed(1)} m²</div>
                  <div>{item.total_amount.toLocaleString('tr-TR', {
                    style: 'currency',
                    currency: 'TRY'
                  })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 