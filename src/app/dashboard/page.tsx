'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Collection {
  collectionId: string;
  name: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Product {
  productId: string;
  name: string;
  description: string;
  stock: number;
  width: number;
  height: number;
  cut: boolean;
  productImage: string;
  collectionId: string;
  created_at: string;
  Collection?: {
    name: string;
    code: string;
  };
}

interface PriceListDetail {
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

interface PriceListData {
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
  PriceListDetail: PriceListDetail[];
}

interface CollectionsResponse {
  success: boolean;
  data: Collection[];
  message?: string;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
}

interface PriceListResponse {
  success: boolean;
  data: PriceListData;
  message?: string;
}

export default function Dashboard() {
  const { user, isLoading, token } = useAuth();
  const router = useRouter();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [priceList, setPriceList] = useState<PriceListData | null>(null);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingPriceList, setIsLoadingPriceList] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const didFetch = useRef(false);

  // localStorage'dan store_id'yi al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.Store && parsedUser.Store.store_id) {
            setStoreId(parsedUser.Store.store_id);
          } else {
            // Test için hardcoded store ID
            setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
          }
        } else {
          setStoreId("f6c2d719-2035-45c4-9dcd-0831dca50452");
        }
      } catch (error) {
        console.error('LocalStorage okuma hatası:', error);
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
    if (didFetch.current || !token) return;
    didFetch.current = true;

    const fetchCollections = async () => {
      try {
        const response = await fetch('https://pasha-backend-production.up.railway.app/api/collections', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data: CollectionsResponse = await response.json();
          if (data.success) {
            setCollections(data.data.slice(0, 6)); // İlk 6 koleksiyonu göster
          }
        }
      } catch (error) {
        console.error('Koleksiyonlar çekme hatası:', error);
      } finally {
        setIsLoadingCollections(false);
      }
    };

    const fetchRecentProducts = async () => {
      try {
        const response = await fetch('https://pasha-backend-production.up.railway.app/api/products?limit=6&sort=created_at&order=desc', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data: ProductsResponse = await response.json();
          if (data.success) {
            setRecentProducts(data.data);
          }
        }
      } catch (error) {
        console.error('Son ürünler çekme hatası:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    const fetchPriceList = async () => {
      if (!storeId) {
        setIsLoadingPriceList(false);
        return;
      }

      try {
        const response = await fetch(`https://pasha-backend-production.up.railway.app/api/price-lists/store-assignments/${storeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data: PriceListResponse = await response.json();
          if (data.success) {
            setPriceList(data.data);
          }
        }
      } catch (error) {
        console.error('Fiyat listesi çekme hatası:', error);
      } finally {
        setIsLoadingPriceList(false);
      }
    };

    fetchCollections();
    fetchRecentProducts();
    
    if (storeId) {
      fetchPriceList();
    }
  }, [token, storeId]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <hr className="border-gray-200 mb-6" />
        
        {/* Kullanıcı bilgileri kartı */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center">
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

        {/* Ana içerik - 3 kolonlu layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Sol taraf - Fiyat Listesi */}
          <div className="xl:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Fiyat Listesi</h2>
                  <p className="text-gray-500 text-sm mt-1">Güncel fiyatlarınız</p>
                </div>
                <Link 
                  href="/dashboard/fiyat-listeleri"
                  className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1 font-medium text-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Detay
                </Link>
              </div>
              
              {isLoadingPriceList ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : priceList && priceList.PriceListDetail && priceList.PriceListDetail.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4">
                    <h3 className="font-semibold text-purple-900 text-sm">{priceList.name}</h3>
                    <p className="text-purple-700 text-xs mt-1">{priceList.description}</p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {priceList.PriceListDetail.slice(0, 8).map((detail) => (
                      <div
                        key={detail.price_list_detail_id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800 font-semibold text-xs mr-3">
                              {detail.Collection.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {detail.Collection.name}
                              </h4>
                              <p className="text-xs text-gray-500">{detail.Collection.code}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">
                              {typeof detail.price_per_square_meter === 'number' 
                                ? detail.price_per_square_meter.toFixed(2) 
                                : Number(detail.price_per_square_meter).toFixed(2)} ₺
                            </span>
                            <p className="text-xs text-gray-500">m²</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {priceList.PriceListDetail.length > 8 && (
                    <div className="text-center pt-3">
                      <Link 
                        href="/dashboard/fiyat-listeleri"
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        +{priceList.PriceListDetail.length - 8} daha fazla göster
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Fiyat listesi bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">Henüz fiyat listesi atanmamış.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sağ taraf - Koleksiyonlar ve Son Eklenen Ürünler */}
          <div className="xl:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Koleksiyonlar Kartı */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Koleksiyonlar</h2>
                    <p className="text-gray-500 text-sm mt-1">Mevcut koleksiyonlarınız</p>
                  </div>
                  <Link 
                    href="/dashboard/koleksiyonlar/liste"
                    className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1 font-medium text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Tümü
                  </Link>
                </div>
                
                {isLoadingCollections ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
                  </div>
                ) : collections.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {collections.map((collection) => (
                      <Link
                        key={collection.collectionId}
                        href={`/dashboard/koleksiyonlar/${collection.collectionId}`}
                        className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-800 font-semibold text-xs mr-3">
                              {collection.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                                {collection.name}
                              </h3>
                              <p className="text-xs text-gray-500">{collection.code}</p>
                            </div>
                          </div>
                          <svg className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Koleksiyon bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">Henüz hiç koleksiyon eklenmemiş.</p>
                  </div>
                )}
              </div>

              {/* Son Eklenen Ürünler Kartı */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Son Eklenen Ürünler</h2>
                    <p className="text-gray-500 text-sm mt-1">Yeni eklenen ürünleriniz</p>
                  </div>
                  <Link 
                    href="/dashboard/urunler/liste"
                    className="bg-gradient-to-r from-green-600 to-green-500 text-white px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1 font-medium text-xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Tümü
                  </Link>
                </div>
                
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : recentProducts.length > 0 ? (
                  <div className="space-y-3">
                    {recentProducts.map((product) => (
                      <Link
                        key={product.productId}
                        href={`/dashboard/urunler/${product.productId}`}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          {product.productImage ? (
                            <img 
                              src={product.productImage} 
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gray-300 flex items-center justify-center">
                              <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors truncate text-sm">
                            {product.name}
                          </h3>
                          <div className="flex items-center mt-1 space-x-3 text-xs text-gray-400">
                            <span>Stok: {product.stock}</span>
                            <span>{product.width}x{product.height} cm</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="h-4 w-4 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Ürün bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500">Henüz hiç ürün eklenmemiş.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 