'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { 
  getAdminOrderCreateInfo, 
  AdminOrderCreateData, 
  AdminOrderProduct,
  addToAdminCart,
  getAdminCart,
  clearAdminCart,
  removeFromAdminCart,
  updateAdminCartItem,
  createOrderFromAdminCart,
  AdminCart,
  AdminCartItem,
  getProducts,
  Product
} from '@/services/api';

interface CartItem {
  productId: string;
  name: string;
  productImage: string;
  collectionName: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  width: number;
  height: number;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
}

const AdminSiparisOlustur = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [orderData, setOrderData] = useState<AdminOrderCreateData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminCart, setAdminCart] = useState<AdminCart | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Popup state'leri
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminOrderProduct | Product | null>(null);
  const [productForm, setProductForm] = useState({
    quantity: 1,
    width: 80,
    height: 100,
    hasFringe: false,
    cutType: '',
    notes: ''
  });

  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId');
  const userName = searchParams.get('userName');

  // URL parametrelerini kontrol et
  useEffect(() => {
    console.log('URL Parametreleri:', { storeId, userId, userName });
    
    if (!storeId || !userId || userId === 'undefined') {
      console.error('Eksik URL parametreleri:', { storeId, userId, userName });
      alert('Geçersiz URL parametreleri. Lütfen tekrar deneyiniz.');
      router.push('/dashboard/magazalar');
      return;
    }
  }, [storeId, userId, userName, router]);

  useEffect(() => {
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin değilse
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin ise veri çek
    if (!authLoading && isAdmin && storeId && userId) {
      fetchOrderCreateInfo();
      fetchAdminCart();
    }
  }, [isAdmin, authLoading, router, storeId, userId]);

  const fetchOrderCreateInfo = async () => {
    setLoading(true);
    try {
      const data = await getAdminOrderCreateInfo({
        store_id: storeId!,
        user_id: userId!
      });
      setOrderData(data);
    } catch (error: any) {
      console.error('Sipariş oluşturma bilgileri alınamadı:', error);
      // API henüz implement edilmemiş, normal ürün listesi kullanacağız
      await fetchNormalProducts();
    } finally {
      setLoading(false);
    }
  };

  const fetchNormalProducts = async () => {
    try {
      const productList = await getProducts();
      setProducts(productList);
      
      // Mock order data oluştur
      setOrderData({
        user: {
          userId: userId!,
          name: userName?.split(' ')[0] || 'Kullanıcı',
          surname: userName?.split(' ')[1] || '',
          email: 'kullanici@example.com',
          phoneNumber: '',
          adres: '',
          userType: 'viewer'
        },
        store: {
          store_id: storeId!,
          kurum_adi: 'Mağaza',
          vergi_numarasi: '',
          vergi_dairesi: '',
          telefon: '',
          eposta: '',
          bakiye: 0,
          acik_hesap_tutari: 0,
          limitsiz_acik_hesap: false
        },
        priceList: {
          price_list_id: 'default',
          name: 'Varsayılan Fiyat Listesi',
          description: 'Standart fiyat listesi',
          currency: 'TRY',
          limit_amount: 10000
        },
        products: [],
        totalProducts: productList.length,
        availableCollections: [...new Set(productList.map(p => p.collection?.name).filter(Boolean))]
      });
    } catch (error: any) {
      console.error('Ürünler alınamadı:', error);
    }
  };

  const fetchAdminCart = async () => {
    if (!storeId || !userId) return;
    
    setCartLoading(true);
    try {
      const cart = await getAdminCart(userId, storeId);
      setAdminCart(cart);
    } catch (error: any) {
      console.error('Admin sepeti alınamadı:', error);
      // Sepet boş olabilir, bu normal
    } finally {
      setCartLoading(false);
    }
  };

  // Filtreleme
  const filteredProducts = (orderData?.products && orderData.products.length > 0)
    ? orderData.products.filter(product => {
        const matchesSearch = searchTerm === "" || 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.collectionName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCollection = selectedCollection === 'all' || 
          product.collectionName === selectedCollection;
        
        return matchesSearch && matchesCollection;
      })
    : products.filter(product => {
        const matchesSearch = searchTerm === "" || 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.collection?.name && product.collection.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCollection = selectedCollection === 'all' || 
          product.collection?.name === selectedCollection;
        
        return matchesSearch && matchesCollection;
      });

  const handleAddToAdminCart = async (product: AdminOrderProduct | Product) => {
    if (!storeId || !userId) return;
    
    try {
      // AdminOrderProduct tipinde ise
      if ('pricing' in product) {
        const sizeOption = product.sizeOptions[0];
        if (!sizeOption) {
          alert('Bu ürün için boyut seçeneği bulunamadı');
          return;
        }

        await addToAdminCart({
          targetUserId: userId,
          storeId: storeId,
          productId: product.productId,
          quantity: productForm.quantity,
          width: productForm.width,
          height: productForm.height,
          hasFringe: productForm.hasFringe,
          cutType: productForm.cutType,
          notes: productForm.notes
        });
      } else {
        // Normal Product tipinde ise
        await addToAdminCart({
          targetUserId: userId,
          storeId: storeId,
          productId: product.productId,
          quantity: productForm.quantity,
          width: productForm.width,
          height: productForm.height,
          hasFringe: productForm.hasFringe,
          cutType: productForm.cutType,
          notes: productForm.notes
        });
      }

      // Sepeti yenile
      await fetchAdminCart();
      
      // Popup'ı kapat ve form'u sıfırla
      setShowAddProductModal(false);
      setSelectedProduct(null);
      setProductForm({
        quantity: 1,
        width: 80,
        height: 100,
        hasFringe: false,
        cutType: '',
        notes: ''
      });
    } catch (error: any) {
      alert(error.message || 'Ürün sepete eklenirken bir hata oluştu');
    }
  };

  const openAddProductModal = (product: AdminOrderProduct | Product) => {
    const isAdminProduct = 'pricing' in product;
    
    setSelectedProduct(product);
    setProductForm({
      quantity: 1,
      width: isAdminProduct ? product.sizeOptions[0]?.width || 80 : product.width || 80,
      height: isAdminProduct ? product.sizeOptions[0]?.height || 100 : product.height || 100,
      hasFringe: isAdminProduct ? product.canHaveFringe : false,
      cutType: isAdminProduct ? product.cutTypes[0]?.name || 'standart' : 'standart',
      notes: ''
    });
    setShowAddProductModal(true);
  };

  const handleRemoveFromAdminCart = async (adminCartItemId: number) => {
    if (!storeId || !userId) return;
    
    try {
      await removeFromAdminCart(userId, storeId, adminCartItemId);
      await fetchAdminCart();
    } catch (error: any) {
      alert(error.message || 'Ürün sepetten çıkarılırken bir hata oluştu');
    }
  };

  const handleUpdateAdminCartItem = async (adminCartItemId: number, updates: any) => {
    if (!storeId || !userId) return;
    
    try {
      await updateAdminCartItem(userId, storeId, adminCartItemId, updates);
      await fetchAdminCart();
    } catch (error: any) {
      alert(error.message || 'Sepet öğesi güncellenirken bir hata oluştu');
    }
  };

  const handleClearAdminCart = async () => {
    if (!storeId || !userId) return;
    
    try {
      await clearAdminCart(userId, storeId);
      await fetchAdminCart();
    } catch (error: any) {
      alert(error.message || 'Sepet temizlenirken bir hata oluştu');
    }
  };

  const handleCreateOrderFromAdminCart = async () => {
    if (!storeId || !userId) return;
    
    // Sepet boş mu kontrol et
    if (!adminCart || adminCart.items.length === 0) {
      alert('Sepet boş! Lütfen önce ürün ekleyin.');
      return;
    }
    
    try {
      setOrderLoading(true);
      const result = await createOrderFromAdminCart({
        targetUserId: userId,
        storeId: storeId,
        notes: orderNotes
      });
      
      alert('Sipariş başarıyla oluşturuldu!');
      router.push('/dashboard/siparisler');
    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error);
      
      // Sepet boş hatası için özel mesaj
      if (error.message && error.message.includes('Sepet bulunamadı veya boş')) {
        alert('Sepet boş! Lütfen önce ürün ekleyin.');
      } else {
        alert(error.message || 'Sipariş oluşturulurken bir hata oluştu');
      }
    } finally {
      setOrderLoading(false);
    }
  };

  const getTotalPrice = () => {
    return adminCart?.totalPrice || 0;
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Yetkilendirme Kontrol Ediliyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Admin sipariş oluşturma sadece admin kullanıcılar tarafından kullanılabilir.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Dashboard'a Dön
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4H5v8h14v-8h-3z" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Sipariş Bilgileri Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Bilgi Bulunamadı</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Sipariş oluşturma bilgileri alınamadı. Lütfen tekrar deneyiniz.</p>
          <button
            onClick={() => router.push('/dashboard/magazalar')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            Mağazalara Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center mb-2">
                <button
                  onClick={() => router.push(`/dashboard/magazalar/${storeId}/kullanicilar`)}
                  className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Admin Sipariş Oluştur
                </h1>
              </div>
              <div className="text-gray-600">
                <p className="text-lg font-semibold">{orderData.store.kurum_adi}</p>
                <p className="text-sm">Kullanıcı: {orderData.user.name} {orderData.user.surname}</p>
                <p className="text-sm">Fiyat Listesi: {orderData.priceList.name}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500">Toplam Ürün</div>
                <div className="text-2xl font-bold text-[#00365a]">{orderData?.totalProducts || 0}</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="text-sm text-gray-500">Sepet</div>
                <div className="text-2xl font-bold text-orange-600">{adminCart?.totalItems || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol Panel - Ürünler */}
          <div className="lg:col-span-2">
            {/* Filtreler */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-2 1A1 1 0 018 16v-4.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-semibold text-[#00365a]">Filtreler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ürün adı, açıklama..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                    />
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Koleksiyon</label>
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
                  >
                    <option value="all">Tüm Koleksiyonlar</option>
                    {orderData.availableCollections.map(collection => (
                      <option key={collection} value={collection}>{collection}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Ürün Listesi */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="text-lg font-semibold text-white">Ürünler</h3>
                  </div>
                  <span className="text-blue-100 text-sm">({filteredProducts.length} ürün)</span>
                </div>
              </div>

              <div className="p-6">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredProducts.map((product) => (
                      <div key={product.productId} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {('collectionName' in product) ? product.collectionName : product.collection?.name || 'Koleksiyon'}
                            </span>
                          </div>
                          <button
                            onClick={() => openAddProductModal(product)}
                            className="ml-4 bg-[#00365a] hover:bg-[#004170] text-white px-4 py-2 rounded-lg font-medium transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Ekle
                          </button>
                        </div>

                        {product.productImage && (
                          <div className="mb-4">
                            <img 
                              src={product.productImage} 
                              alt={product.name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Fiyat:</span>
                            <span className="text-lg font-bold text-[#00365a]">
                              {('pricing' in product) ? 
                                `${product.pricing.price.toLocaleString('tr-TR')} ${product.pricing.currency}` : 
                                'Fiyat bilgisi yok'
                              }
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Stok:</span>
                            <span className="text-sm text-gray-600">
                              {('sizeOptions' in product) ? 
                                `${product.sizeOptions[0]?.stockQuantity || 0} adet` : 
                                `${product.stock || 0} adet`
                              }
                            </span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Kesim Türleri:</span>
                            <span className="text-sm text-gray-600">
                              {('cutTypes' in product) ? 
                                product.cutTypes.map((ct: any) => ct.name).join(', ') : 
                                'Standart'
                              }
                            </span>
                          </div>

                          {('canHaveFringe' in product) && product.canHaveFringe && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">Saçak:</span>
                              <span className="text-sm text-green-600 font-medium">Mevcut</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Ürün Bulunamadı</h3>
                    <p className="text-gray-600">Arama kriterlerinize uygun ürün bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Panel - Sepet */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-orange-600">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                  </svg>
                  <h3 className="text-lg font-semibold text-white">Sepet</h3>
                  <span className="ml-auto text-orange-100 text-sm">({adminCart?.totalItems || 0} ürün)</span>
                </div>
              </div>

              <div className="p-6">
                {cartLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#00365a] mx-auto mb-4"></div>
                    <p className="text-gray-600">Sepet yükleniyor...</p>
                  </div>
                ) : adminCart && adminCart.items.length > 0 ? (
                  <>
                    <div className="space-y-4 mb-6">
                      {adminCart.items.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{item.product?.name || 'Ürün'}</h4>
                              <p className="text-sm text-gray-500">{item.product?.collection?.name || 'Koleksiyon'}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveFromAdminCart(item.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Adet:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  handleUpdateAdminCartItem(item.id, { quantity: newQuantity });
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                              />
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>Boyut:</span>
                              <span className="font-medium">{item.width}x{item.height} cm</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>Alan:</span>
                              <span className="font-medium">{item.area_m2} m²</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>Birim Fiyat:</span>
                              <span className="font-medium">{item.unit_price.toLocaleString('tr-TR')} ₺</span>
                            </div>
                            
                            <div className="flex justify-between text-sm">
                              <span>Toplam:</span>
                              <span className="font-bold text-[#00365a]">{item.total_price.toLocaleString('tr-TR')} ₺</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sipariş Notları</label>
                        <textarea
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="Sipariş notları..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                          rows={3}
                        />
                      </div>
                      
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold text-gray-900">Toplam:</span>
                        <span className="text-2xl font-bold text-[#00365a]">{getTotalPrice().toLocaleString('tr-TR')} ₺</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={handleClearAdminCart}
                          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold transition-all"
                        >
                          Sepeti Temizle
                        </button>
                        <button
                          onClick={handleCreateOrderFromAdminCart}
                          disabled={orderLoading || !adminCart || adminCart.items.length === 0}
                          className="flex-1 bg-[#00365a] hover:bg-[#004170] text-white py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {orderLoading ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              İşleniyor...
                            </div>
                          ) : (
                            'Siparişi Tamamla'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Sepet Boş</h3>
                    <p className="text-gray-600">Sepete ürün ekleyerek sipariş oluşturmaya başlayın.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ürün Ekleme Modal */}
      {showAddProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Sepete Ekle</h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sol Taraf - Ürün Bilgileri */}
                <div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Stok Durumu</h4>
                    <div className="space-y-2">
                      {('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions.map((option, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{option.width}x{option.is_optional_height ? 'İsteğe Bağlı' : option.height} cm:</span>
                          <span>{option.stockAreaM2} m²</span>
                        </div>
                      )) : (
                        <div className="flex justify-between text-sm">
                          <span>{selectedProduct.width}x{selectedProduct.height} cm:</span>
                          <span>{selectedProduct.stock} adet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedProduct.productImage && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <img 
                        src={selectedProduct.productImage} 
                        alt={selectedProduct.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Sağ Taraf - Form */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{selectedProduct.name}</h4>
                    <p className="text-sm text-gray-600 mb-4">{selectedProduct.description}</p>
                  </div>

                  {/* Boyut Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Boyut Seçimi</label>
                    <select
                      value={`${productForm.width}x${productForm.height}`}
                      onChange={(e) => {
                        const [width, height] = e.target.value.split('x').map(Number);
                        setProductForm(prev => ({ ...prev, width, height }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    >
                      {('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions.map((option, index) => (
                        <option key={index} value={`${option.width}x${option.height}`}>
                          {option.width}x{option.is_optional_height ? 'İsteğe Bağlı' : option.height} cm (Stok: {option.stockAreaM2} m²)
                        </option>
                      )) : (
                        <option value={`${selectedProduct.width}x${selectedProduct.height}`}>
                          {selectedProduct.width}x{selectedProduct.height} cm
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Özel Yükseklik */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Özel Yükseklik (cm)</label>
                    <input
                      type="number"
                      value={productForm.height}
                      onChange={(e) => setProductForm(prev => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                      placeholder="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {productForm.width}x{productForm.height} cm olarak hesaplanacak
                    </p>
                  </div>

                  {/* Kesim Türü */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Kesim Türü</label>
                    <select
                      value={productForm.cutType}
                      onChange={(e) => setProductForm(prev => ({ ...prev, cutType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                    >
                      {('cutTypes' in selectedProduct) ? selectedProduct.cutTypes.map((ct, index) => (
                        <option key={index} value={ct.name}>{ct.name}</option>
                      )) : (
                        <option value="standart">Standart</option>
                      )}
                    </select>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                    <p className="text-sm text-gray-600">{selectedProduct.name}</p>
                  </div>

                  {/* Fiyat Bilgileri */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Metrekare Fiyatı:</span>
                      <span className="font-semibold text-[#00365a]">
                        {('pricing' in selectedProduct) ? `${selectedProduct.pricing.price} ${selectedProduct.pricing.currency}/m²` : 'Fiyat bilgisi yok'}
                      </span>
                    </div>
                    
                    <div className="bg-blue-100 rounded-lg p-3 mb-4">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-[#00365a]">
                          {('pricing' in selectedProduct) ? 
                            `${(selectedProduct.pricing.price * (productForm.width * productForm.height / 10000) * productForm.quantity).toFixed(2)} ${selectedProduct.pricing.currency}` :
                            'Fiyat hesaplanamıyor'
                          }
                        </span>
                        <p className="text-xs text-gray-600 mt-1">
                          {productForm.width} cm genişlik x {productForm.height} cm yükseklik (özel) x {productForm.quantity} adet için hesaplandı
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Miktar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Miktar</label>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setProductForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={productForm.quantity}
                        onChange={(e) => setProductForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="w-16 text-center px-2 py-1 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => setProductForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Saçak Seçeneği */}
                  {('canHaveFringe' in selectedProduct) && selectedProduct.canHaveFringe && (
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={productForm.hasFringe}
                          onChange={(e) => setProductForm(prev => ({ ...prev, hasFringe: e.target.checked }))}
                          className="rounded border-gray-300 text-[#00365a] focus:ring-[#00365a]"
                        />
                        <span className="text-sm font-medium text-gray-700">Saçak Ekle</span>
                      </label>
                    </div>
                  )}

                  {/* Özel Notlar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Özel Notlar (Opsiyonel)</label>
                    <textarea
                      value={productForm.notes}
                      onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Özel kesim notları veya diğer istekleriniz..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => handleAddToAdminCart(selectedProduct)}
                className="w-full bg-[#00365a] hover:bg-[#004170] text-white py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
              >
                Sepete Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSiparisOlustur; 