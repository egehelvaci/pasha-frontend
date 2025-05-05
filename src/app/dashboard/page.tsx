'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import AccountCard from '../components/AccountCard';
import DoughnutChart from '../components/DoughnutChart';
import PriceList from '../components/PriceList';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Eğer kullanıcı yoksa ve yükleme tamamlandıysa, login sayfasına yönlendir
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Yükleme durumunda veya kullanıcı yoksa, içeriği gösterme
  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  // Hesap kartı verileri - kullanıcı bilgilerinden alınıyor
  const accountData = {
    balance: parseFloat(user.credit) - parseFloat(user.debit),
    debt: parseFloat(user.debit),
    credit: parseFloat(user.credit),
    debtCredit: parseFloat(user.credit) + parseFloat(user.debit)
  };

  // Sipariş ürün adet raporu verileri
  const orderProductCountChartData = {
    labels: ['Sipariş Edilen Ürün Adeti', 'Teslim Edilen Ürün Adeti'],
    datasets: [
      {
        label: 'Adet Raporu',
        data: [65, 35],
        backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)'],
        borderColor: ['rgba(239, 68, 68, 1)', 'rgba(34, 197, 94, 1)'],
        borderWidth: 1,
      },
    ],
  };

  // Sipariş ürün metrekare raporu verileri
  const orderProductAreaChartData = {
    labels: ['Sipariş Edilen Ürün Fırat Metrekaresi', 'Sipariş Edilen Ürün Fresiz Metrekaresi', 'Teslim Edilen Ürün Metrekaresi'],
    datasets: [
      {
        label: 'Metrekare Raporu',
        data: [40, 35, 25],
        backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(59, 130, 246, 0.7)'],
        borderColor: ['rgba(239, 68, 68, 1)', 'rgba(34, 197, 94, 1)', 'rgba(59, 130, 246, 1)'],
        borderWidth: 1,
      },
    ],
  };

  // Fiyat listesi verileri
  const priceListData = [
    {
      id: '1',
      name: 'SOHO SERİSİ',
      price: 504.00,
      type: 'Türk Lirası'
    },
    {
      id: '2',
      name: 'SATEN SERİSİ',
      price: 504.00,
      type: 'Türk Lirası'
    },
    {
      id: '3',
      name: 'BIANCA SERİSİ',
      price: 504.00,
      type: 'Türk Lirası'
    },
    {
      id: '4',
      name: 'SAGA SERİSİ',
      price: 504.00,
      type: 'Türk Lirası'
    },
    {
      id: '5',
      name: 'BOHEM SERİSİ',
      price: 504.00,
      type: 'Türk Lirası'
    },
  ];

  // Ürün özeti verileri
  const productSummaryData = [
    {
      id: '1',
      image: 'https://via.placeholder.com/64',
      name: 'SOHO Serisi - Gri',
      quantity: 3,
      totalArea: 5.5
    },
    {
      id: '2',
      image: 'https://via.placeholder.com/64',
      name: 'SATEN Serisi - Bej',
      quantity: 2,
      totalArea: 3.8
    },
    {
      id: '3',
      image: 'https://via.placeholder.com/64',
      name: 'BIANCA Serisi - Beyaz',
      quantity: 4,
      totalArea: 8.6
    }
  ];

  // Header bileşeni için kullanıcı bilgileri
  const userInfo = {
    name: `${user.name} ${user.surname}`,
    imageUrl: user.avatar || 'https://via.placeholder.com/40'
  };

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" user={userInfo} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Kullanıcı bilgileri kartı */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-14 w-14 rounded-full bg-blue-900 flex items-center justify-center text-white text-xl font-bold">
                {user.name[0]}{user.surname[0]}
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-800">{user.name} {user.surname}</h2>
                <p className="text-gray-500 text-sm">{user.username}</p>
                <p className="text-gray-500 text-sm">{user.email}</p>
              </div>
            </div>
          </div>
          
          {/* Hesap kartı */}
          <div className="md:col-span-2">
            <AccountCard 
              balance={accountData.balance}
              debt={accountData.debt}
              credit={accountData.credit}
              debtCredit={accountData.debtCredit}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Sipariş ürün adet raporu */}
          <DoughnutChart 
            title="Sipariş Ürün Adet Raporu" 
            data={orderProductCountChartData} 
          />
          
          {/* Sipariş ürün metrekare raporu */}
          <DoughnutChart 
            title="Sipariş Ürün Metrekare Raporu" 
            data={orderProductAreaChartData} 
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Sipariş ürün istatistiği */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Sipariş Ürün İstatistiği</h2>
            <div className="space-y-4">
              {productSummaryData.map((product) => (
                <div key={product.id} className="flex items-center border-b border-gray-100 pb-4">
                  <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-800">{product.name}</h3>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <p className="mr-3">{product.quantity} adet ürün sipariş verildi</p>
                      <p>Toplam {product.totalArea} m² olarak hesaplanmıştır.</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sipariş kurum istatistiği */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-800 mb-4">Sipariş Kurum İstatistiği</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-sm font-medium">Paşa Home</h3>
                <p className="text-sm text-gray-600">4 adet ürün siparişi verildi: Toplam 10.72 m²</p>
              </div>
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h3 className="text-sm font-medium">Altera Halı</h3>
                <p className="text-sm text-gray-600">2 adet ürün siparişi verildi: Toplam 5.12 m²</p>
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Novus Home</h3>
                <p className="text-sm text-gray-600">3 adet ürün siparişi verildi: Toplam 8.40 m²</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fiyat listesi */}
        <div className="mb-6">
          <PriceList
            title="Paşa Home Güncel Fiyat Listesi"
            items={priceListData}
          />
        </div>
      </div>
    </div>
  );
} 