'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import DoughnutChart from '../components/DoughnutChart';
import PriceList from '../components/PriceList';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [latestProducts, setLatestProducts] = useState<any[]>([]);
  const [latestCollections, setLatestCollections] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const didFetch = useRef(false);

  useEffect(() => {
    // Eğer kullanıcı yoksa ve yükleme tamamlandıysa, login sayfasına yönlendir
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    // Tüm ürünleri çek
    fetch("https://pasha-backend-production.up.railway.app/api/products", { 
      method: 'GET'
    })
      .then(res => res.json())
      .then(data => {
        setLatestProducts(data.data || []);
      })
      .catch(err => { 
        console.error('Ürün çekme hatası:', err);
      })
      .finally(() => {
        setIsLoadingProducts(false);
      });

    // Tüm koleksiyonları çek
    fetch("https://pasha-backend-production.up.railway.app/api/collections", { 
      method: 'GET'
    })
      .then(res => res.json())
      .then(data => {
        setLatestCollections(data.data || []);
      })
      .catch(err => { 
        console.error('Koleksiyon çekme hatası:', err);
      })
      .finally(() => {
        setIsLoadingCollections(false);
      });
  }, []);

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
    imageUrl: user.avatar || 'https://via.placeholder.com/40',
    debit: user.debit,
    credit: user.credit
  };

  return (
    <div className="min-h-screen">
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
        </div>

        {/* Ürünler ve Koleksiyonlar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ürünler Listesi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">Ürünler</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {isLoadingProducts ? (
                <div className="p-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                </div>
              ) : latestProducts.length === 0 ? (
                <div className="p-4 text-gray-500">Ürün bulunamadı.</div>
              ) : (
                latestProducts.map((product: any, index: number) => (
                  <div 
                    key={product.productId} 
                    className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-black">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.collection_name || "Koleksiyon yok"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Stok: {product.stock}</div>
                        <div className="text-sm text-gray-600">{product.price} {product.currency}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Koleksiyonlar Listesi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-black">Koleksiyonlar</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {isLoadingCollections ? (
                <div className="p-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-900"></div>
                </div>
              ) : latestCollections.length === 0 ? (
                <div className="p-4 text-gray-500">Koleksiyon bulunamadı.</div>
              ) : (
                latestCollections.map((col: any, index: number) => (
                  <div 
                    key={col.collectionId} 
                    className={`p-4 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-black">{col.name}</div>
                        <div className="text-sm text-gray-500">{col.code}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{col.products?.length || 0} ürün</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 