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

interface TopCustomer {
  name: string;
  surname: string;
  orderCount: number;
  totalAmount: string;
}

interface TopProduct {
  name: string;
  orderCount: number;
  totalQuantity: number;
}

interface SquareMeterData {
  period: string;
  totalSquareMeters: number;
  orderCount: number;
}

interface AnalyticsData {
  topCustomers: TopCustomer[];
  topProducts: TopProduct[];
  squareMeterData: SquareMeterData[];
}

export default function AnalyticsPage() {
  const { user, isAdmin, token } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<'1month' | '3months' | '1year'>('1month');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAnalyticsData();
  }, [isAdmin, router, selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/analytics?period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Analytics verisi alınamadı');
      }

      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        throw new Error(data.message || 'Analytics verisi alınamadı');
      }
    } catch (error: any) {
      console.error('Analytics hatası:', error);
      setError(error.message || 'Bir hata oluştu');
      
      // Mock data for development
      setAnalyticsData({
        topCustomers: [
          { name: 'Ahmet', surname: 'Yılmaz', orderCount: 15, totalAmount: '25000.00' },
          { name: 'Mehmet', surname: 'Kaya', orderCount: 12, totalAmount: '20000.00' },
          { name: 'Ayşe', surname: 'Demir', orderCount: 10, totalAmount: '18000.00' },
          { name: 'Fatma', surname: 'Çelik', orderCount: 8, totalAmount: '15000.00' },
          { name: 'Ali', surname: 'Özkan', orderCount: 7, totalAmount: '12000.00' }
        ],
        topProducts: [
          { name: 'Vintage Halı Siyah', orderCount: 25, totalQuantity: 45 },
          { name: 'Modern Kilim Gri', orderCount: 20, totalQuantity: 35 },
          { name: 'Klasik Halı Kırmızı', orderCount: 18, totalQuantity: 30 },
          { name: 'Antik Halı Bej', orderCount: 15, totalQuantity: 25 },
          { name: 'Contemporary Halı Mavi', orderCount: 12, totalQuantity: 20 }
        ],
        squareMeterData: [
          { period: 'Son 1 Ay', totalSquareMeters: 1250.5, orderCount: 45 },
          { period: 'Son 3 Ay', totalSquareMeters: 3850.2, orderCount: 128 },
          { period: 'Son 1 Yıl', totalSquareMeters: 15420.8, orderCount: 485 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  // Chart yapılandırmaları
  const topCustomersChartData = {
    labels: analyticsData.topCustomers.map(customer => `${customer.name} ${customer.surname}`),
    datasets: [
      {
        label: 'Sipariş Adedi',
        data: analyticsData.topCustomers.map(customer => customer.orderCount),
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
    labels: analyticsData.topProducts.map(product => product.name),
    datasets: [
      {
        label: 'Sipariş Adedi',
        data: analyticsData.topProducts.map(product => product.orderCount),
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

  const squareMeterChartData = {
    labels: analyticsData.squareMeterData.map(item => item.period),
    datasets: [
      {
        label: 'Toplam Metrekare',
        data: analyticsData.squareMeterData.map(item => item.totalSquareMeters),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
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
        beginAtZero: true
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analiz Paneli</h1>
          <p className="mt-2 text-gray-600">Sipariş ve müşteri analizlerinizi görüntüleyin</p>
        </div>

        {/* Period Selector */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Zaman Aralığı Seçin</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { value: '1month', label: 'Son 1 Ay' },
                { value: '3months', label: 'Son 3 Ay' }, 
                { value: '1year', label: 'Son 1 Yıl' }
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
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* En Çok Sipariş Veren Müşteriler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Sipariş Veren Müşteriler (TOP 5)</h2>
            <div style={{ height: '400px' }}>
              <Bar data={topCustomersChartData} options={chartOptions} />
            </div>
          </div>

          {/* En Çok Sipariş Verilen Ürünler */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">En Çok Sipariş Verilen Ürünler (TOP 5)</h2>
            <div style={{ height: '400px' }}>
              <Bar data={topProductsChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Metrekare Analizi */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Siparişler Metrekare Bazlı</h2>
          <div style={{ height: '400px' }}>
            <Line data={squareMeterChartData} options={chartOptions} />
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Müşteri Siparişleri</h3>
            <p className="text-3xl font-bold text-blue-600">
              {analyticsData.topCustomers.reduce((sum, customer) => sum + customer.orderCount, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Son {selectedPeriod === '1month' ? '1 ay' : selectedPeriod === '3months' ? '3 ay' : '1 yıl'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Ürün Siparişleri</h3>
            <p className="text-3xl font-bold text-green-600">
              {analyticsData.topProducts.reduce((sum, product) => sum + product.orderCount, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Son {selectedPeriod === '1month' ? '1 ay' : selectedPeriod === '3months' ? '3 ay' : '1 yıl'}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Toplam Metrekare</h3>
            <p className="text-3xl font-bold text-purple-600">
              {analyticsData.squareMeterData.find(item => 
                item.period === (selectedPeriod === '1month' ? 'Son 1 Ay' : 
                                selectedPeriod === '3months' ? 'Son 3 Ay' : 'Son 1 Yıl')
              )?.totalSquareMeters.toFixed(1) || '0'} m²
            </p>
            <p className="text-sm text-gray-500 mt-1">Son {selectedPeriod === '1month' ? '1 ay' : selectedPeriod === '3months' ? '3 ay' : '1 yıl'}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 