'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import DoughnutChart from '../components/DoughnutChart';
import { getStorePriceLists, StorePriceListAssignment } from '@/services/api';

interface StorePriceListResponse {
  success: boolean;
  data: StorePriceListAssignment[];
  message?: string;
}

interface StorePriceListItem {
  PriceList: {
    price_list_id: string;
    name: string;
    description: string;
    is_default: boolean;
    valid_from: string | null;
    valid_to: string | null;
    limit_amount: number | null;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    products?: PriceListProduct[];
  };
  price_list_id: string;
  store_id: string;
  store_price_list_id: string | null;
  created_at: string;
  updated_at: string;
  is_default_assignment: boolean;
}

interface PriceListProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  collection_name: string;
  productImage: string;
  stock: number;
}

interface PriceListDetailResponse {
  success: boolean;
  data: {
    price_list_id: string;
    name: string;
    description: string;
    is_default: boolean;
    valid_from: string | null;
    valid_to: string | null;
    limit_amount: number | null;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    PriceListDetail: PriceListDetailItem[];
  }
}

interface PriceListDetailItem {
  price_list_detail_id: string;
  price_list_id: string;
  collection_id: string;
  price_per_square_meter: number;
  created_at: string;
  updated_at: string;
  Collection: {
    collectionId: string;
    name: string;
    code: string;
    description: string;
  }
}

export default function Dashboard() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  const [priceListResponse, setPriceListResponse] = useState<StorePriceListResponse | null>(null);
  const [priceListDetail, setPriceListDetail] = useState<PriceListDetailResponse | null>(null);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const didFetch = useRef(false);

  // localStorage'dan store_id'yi al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Test için hardcoded store ID kullanabilirsiniz
        // setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
        
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.Store && parsedUser.Store.store_id) {
            setStoreId(parsedUser.Store.store_id);
          } else {
            // localStorage'da store_id bulunamadıysa test ID'sini kullan
            setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
          }
        } else {
          // localStorage'da user bulunamadıysa test ID'sini kullan
          setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
        }
      } catch (error) {
        console.error('LocalStorage okuma hatası:', error);
        // Hata durumunda da test ID'sini kullan
        setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
      }
    }
  }, []);

  useEffect(() => {
    if (!user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (didFetch.current || !token || !storeId) return;
    didFetch.current = true;

    const fetchStorePriceList = async () => {
      try {
        // Doğrudan mağaza ID ile fiyat listesi detaylarını al
        const response = await fetch(`https://pasha-backend-production.up.railway.app/api/price-lists/store-assignments/${storeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPriceListResponse(data);
            setPriceListDetail({
              success: true,
              data: data.data
            });
            setIsLoadingDetail(false);
          }
        }
      } catch (error) {
        console.error('Mağaza fiyat listesi çekme hatası:', error);
      } finally {
        setIsLoadingPriceList(false);
      }
    };

    fetchStorePriceList();
  }, [token, storeId]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  // Fiyat listesi öğesini al (varsa)
  const priceListItem = priceListResponse?.data?.[0] || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <hr className="border-gray-200 mb-6" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Kullanıcı bilgileri kartı - Sol taraf */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="h-20 w-20 rounded-full bg-blue-900 flex items-center justify-center text-white text-2xl font-bold">
                {user.name[0]}{user.surname[0]}
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-medium text-gray-800">{user.name} {user.surname}</h2>
                <p className="text-gray-500">{user.username}</p>
                {user.Store && (
                  <p className="text-gray-600 mt-1">{user.Store.kurum_adi}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Fiyat Listesi Kartı - Sağ taraf */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 col-span-2">
            {isLoadingPriceList ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              </div>
            ) : priceListDetail?.data ? (
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      Güncel Fiyat Listesi
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                      {user.Store?.kurum_adi || "Paşa Home"}
                    </p>
                  </div>
                  <button className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    Fiyat Hesapla
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Ürün Adı
                        </th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fiyat
                        </th>
                        <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Para Birimi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {priceListDetail.data.PriceListDetail && priceListDetail.data.PriceListDetail.length > 0 ? (
                        priceListDetail.data.PriceListDetail
                          .map((detail, index) => (
                            <tr key={detail.price_list_detail_id} 
                                className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150 ease-in-out`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-sm mr-3">
                                    {detail.Collection.name.charAt(0)}
                                  </div>
                                  <div className="text-sm font-semibold text-gray-900">{detail.Collection.name} SERİSİ</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-gray-900">
                                  {typeof detail.price_per_square_meter === 'number' 
                                    ? detail.price_per_square_meter.toFixed(2) 
                                    : Number(detail.price_per_square_meter).toFixed(2)} ₺
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Türk Lirası
                                </span>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                            Koleksiyon fiyatları bulunamadı
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                Fiyat listesi bilgisi bulunamadı
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 