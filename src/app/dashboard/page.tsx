'use client';

import React from 'react';
import Header from '../components/Header';
import AccountCard from '../components/AccountCard';
import DoughnutChart from '../components/DoughnutChart';
import ProductSummary from '../components/ProductSummary';
import PriceList from '../components/PriceList';

export default function Dashboard() {
  // Kullanıcı bilgileri
  const user = {
    name: 'Özkan ADIGÜZEL',
    imageUrl: 'https://via.placeholder.com/40'
  };

  // Hesap kartı verileri
  const accountData = {
    balance: 8023.68,
    debt: 8023.68,
    credit: 0,
    debtCredit: 8023.68
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

  // Ürün özeti verileri
  const productSummaryData = [
    {
      id: '1',
      name: 'HAZIR-SUYOLU KAHVE',
      quantity: 2,
      totalArea: 3.36,
      image: 'https://via.placeholder.com/80'
    },
    {
      id: '2',
      name: 'SONSUZ GRİ',
      quantity: 2,
      totalArea: 4.40,
      image: 'https://via.placeholder.com/80'
    },
    {
      id: '3',
      name: 'BA02-S405 GRİ',
      quantity: 2,
      totalArea: 3.20,
      image: 'https://via.placeholder.com/80'
    }
  ];

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

  return (
    <div className="min-h-screen">
      <Header title="Dashboard" user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Kullanıcı bilgileri kartı */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="h-14 w-14 rounded-full bg-blue-900 flex items-center justify-center text-white text-xl font-bold">
                ÖA
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-medium text-gray-800">{user.name}</h2>
                <p className="text-gray-500 text-sm">özkan</p>
                <p className="text-gray-500 text-sm">Paşa Home</p>
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
            <ProductSummary 
              title="" 
              products={productSummaryData} 
            />
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