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
          
          {/* Fiyat Listesi Kartı */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 col-span-2">
            {isLoadingPriceList ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              </div>
            ) : priceListDetail?.data ? (
              <div>
                <h2 className="text-lg font-medium text-gray-800 mb-2">Fiyat Listesi: {priceListDetail.data.name}</h2>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Koleksiyon Adı
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          m² Fiyatı ({priceListDetail.data.currency})
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {priceListDetail.data.PriceListDetail && priceListDetail.data.PriceListDetail.length > 0 ? (
                        priceListDetail.data.PriceListDetail
                          .map((detail) => (
                            <tr key={detail.price_list_detail_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{detail.Collection.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className="text-gray-900">
                                  {detail.price_per_square_meter}
                                </span>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
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

        {/* Fiyat Listesi Ürünleri */}
        {priceListItem?.PriceList?.products && priceListItem.PriceList.products.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-800">Ürünler ve Fiyatları</h2>
              <p className="text-sm text-gray-500 mt-1">
                {priceListItem.PriceList.name} listesindeki tüm ürünler
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ürün
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Koleksiyon
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stok
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fiyat
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceListItem.PriceList.products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img 
                              className="h-10 w-10 rounded-lg object-cover" 
                              src={product.productImage || "https://via.placeholder.com/40"} 
                              alt={product.name} 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {product.collection_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {product.price} {product.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 