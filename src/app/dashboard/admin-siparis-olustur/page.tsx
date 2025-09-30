'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
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
  Product,
  getStoreAddresses,
  StoreAddress,
  createStoreAddress,
  CreateStoreAddressRequest
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
  const { isAdmin, isAdminOrEditor, user, isLoading: authLoading } = useAuth();
  const { refreshCart } = useCart();
  
  const [orderData, setOrderData] = useState<AdminOrderCreateData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
  const [stockFilter, setStockFilter] = useState('all');
  const [stockFilterDropdownOpen, setStockFilterDropdownOpen] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminOrderProduct | Product | null>(null);
  const [productForm, setProductForm] = useState({
    quantity: 1,
    width: 80,
    height: 100 as number | string,
    hasFringe: false,
    cutType: '',
    notes: ''
  });
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [adminCart, setAdminCart] = useState<AdminCart | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Adres state'leri
  const [storeAddresses, setStoreAddresses] = useState<StoreAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddress, setNewAddress] = useState<CreateStoreAddressRequest>({
    title: '',
    address: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false
  });
  const [addingAddress, setAddingAddress] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showAddressWarningPopup, setShowAddressWarningPopup] = useState(false);
  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  


  const storeId = searchParams.get('storeId');
  const userId = searchParams.get('userId');
  const userName = searchParams.get('userName');

  // URL parametrelerini kontrol et
  useEffect(() => {
    // Normal kullanıcı seçimi modu
    if (!storeId || !userId || userId === 'undefined') {
      alert('Geçersiz URL parametreleri. Lütfen tekrar deneyiniz.');
      router.push('/dashboard/magazalar');
      return;
    }
  }, [storeId, userId, userName, router]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setCollectionDropdownOpen(false);
        setStockFilterDropdownOpen(false);
        setSizeDropdownOpen(false);
        setCutTypeDropdownOpen(false);
        setAddressDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Modal açıkken body scroll'unu engelle
  useEffect(() => {
    if (showAddProductModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddProductModal]);

  useEffect(() => {
    // Kimlik doğrulama yüklemesi tamamlandığında admin/editör kontrolü
    if (!authLoading && !isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında veri çek
    if (!authLoading && user && storeId && userId) {
      fetchOrderCreateInfo();
      fetchAdminCart();
      fetchStoreAddresses();
    }
  }, [user, authLoading, isAdminOrEditor, router, storeId, userId]);

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
      setProducts(productList.data);
      
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
        totalProducts: productList.data.length,
        availableCollections: [...new Set(productList.data.map(p => p.collection?.name).filter(Boolean))]
      });
    } catch (error: any) {
      console.error('Ürünler alınamadı:', error);
    }
  };

  // Mağaza adreslerini getir
  const fetchStoreAddresses = async () => {
    if (!storeId) return;
    
    try {
      setAddressesLoading(true);
      // Admin için spesifik mağaza adreslerini getir
      const response = await getStoreAddresses(storeId);
      if (response.success) {
        setStoreAddresses(response.data);
        
        // Varsayılan adres seçimi kaldırıldı - kullanıcı manuel seçmeli
      }
    } catch (error) {
      console.error('Adres listesi getirme hatası:', error);
    } finally {
      setAddressesLoading(false);
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

  // Stok kontrolü kaldırıldı - artık tüm ürünler stokta varsayılıyor
  const hasStock = () => {
    return true; // Her zaman true döndür
  };

  // Filtreleme
  const filteredProducts = (orderData?.products && orderData.products.length > 0)
    ? orderData.products.filter(product => {
        const searchTermUpper = searchTerm.trim().toUpperCase();
        const productNameUpper = (product.name || '').toUpperCase();
        
        const matchesSearch = searchTermUpper === "" || 
          productNameUpper.includes(searchTermUpper);
        
        const matchesCollection = selectedCollection === 'all' || 
          product.collectionName === selectedCollection;
        
        const matchesStock = stockFilter === 'all' || 
          (stockFilter === 'inStock' && hasStock()) ||
          (stockFilter === 'outOfStock' && !hasStock());
        
        return matchesSearch && matchesCollection && matchesStock;
      })
    : products.filter(product => {
        const searchTermUpper = searchTerm.trim().toUpperCase();
        const productNameUpper = (product.name || '').toUpperCase();
        
        const matchesSearch = searchTermUpper === "" || 
          productNameUpper.includes(searchTermUpper);
        
        const matchesCollection = selectedCollection === 'all' || 
          product.collection?.name === selectedCollection;
        
        const matchesStock = stockFilter === 'all' || 
          (stockFilter === 'inStock' && hasStock()) ||
          (stockFilter === 'outOfStock' && !hasStock());
        
        return matchesSearch && matchesCollection && matchesStock;
      });

  const handleAddToAdminCart = async () => {
    if (!storeId || !userId || !selectedProduct) return;
    
    try {
      // AdminOrderProduct tipinde ise
      if ('pricing' in selectedProduct) {
        const sizeOption = selectedProduct.sizeOptions[0];
        if (!sizeOption) {
          alert('Bu ürün için boyut seçeneği bulunamadı');
          return;
        }

        await addToAdminCart({
          targetUserId: userId,
          storeId: storeId,
          productId: selectedProduct.productId,
          quantity: productForm.quantity,
          width: productForm.width,
          height: typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100),
          hasFringe: productForm.hasFringe,
          cutType: productForm.cutType,
          notes: productForm.notes
        });
      } else {
        // Normal Product tipinde ise
        await addToAdminCart({
          targetUserId: userId,
          storeId: storeId,
          productId: selectedProduct.productId,
          quantity: productForm.quantity,
          width: productForm.width,
          height: typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100),
          hasFringe: productForm.hasFringe,
          cutType: productForm.cutType,
          notes: productForm.notes
        });
      }

      // Sepeti yenile
      await fetchAdminCart();
      
      // Header'daki sepeti de yenile
      await refreshCart();
      
      // Başarı pop-up'ını göster
      setShowSuccessPopup(true);
      
      // Popup'ı kapat ve form'u sıfırla
      setShowAddProductModal(false);
      setSelectedProduct(null);
      setProductForm({
        quantity: 1,
        width: 80,
        height: '',
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
      height: isAdminProduct ? (product.sizeOptions[0]?.is_optional_height ? '' : product.sizeOptions[0]?.height || 100) : product.height || 100,
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

  // Yeni adres ekleme (Admin için)
  const handleAddNewAddress = async () => {
    if (!newAddress.title || !newAddress.address || !storeId) {
      alert('Lütfen adres başlığı ve tam adres bilgilerini giriniz.');
      return;
    }

    try {
      setAddingAddress(true);
      const payload = { 
        ...newAddress, 
        store_id: storeId // Admin için store_id ekliyoruz 
      };
      const response = await createStoreAddress(payload);
      if (response.success) {
        alert('Yeni adres başarıyla eklendi!');
        setShowAddressModal(false);
        setNewAddress({
          title: '',
          address: '',
          city: '',
          district: '',
          postal_code: '',
          is_default: false
        });
        // Adres listesini yenile
        await fetchStoreAddresses();
        // Yeni eklenen adresi seç
        if (response.data) {
          setSelectedAddressId(response.data.id);
        }
      }
    } catch (error: any) {
      alert(error.message || 'Adres eklenirken bir hata oluştu.');
    } finally {
      setAddingAddress(false);
    }
  };

  const handleCreateOrderFromAdminCart = async () => {
    if (!storeId) return;
    
    // Kullanıcı seçimi gerekli
    if (!userId) {
      alert('Sipariş vermek için kullanıcı seçimi gerekli.');
      return;
    }
    
    // Sepet boş mu kontrol et
    if (!adminCart || adminCart.items.length === 0) {
      alert('Sepet boş! Lütfen önce ürün ekleyin.');
      return;
    }

    // Adres seçim kontrolü
    if (!selectedAddressId) {
      setShowAddressWarningPopup(true);
      return;
    }
    
    try {
      setOrderLoading(true);
      
      // Debug: Seçilen adres bilgilerini log'la
      const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);

      const result = await createOrderFromAdminCart({
        targetUserId: userId,
        storeId: storeId,
        notes: orderNotes,
        address_id: selectedAddressId
      });
      
      alert('Sipariş başarıyla oluşturuldu!');
      router.push('/dashboard/siparisler');
    } catch (error: any) {
      
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

  // Kullanıcı doğrulaması - giriş yapmış herkes sipariş verebilir
  if (!user) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Giriş Gerekli</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Sipariş verebilmek için lütfen giriş yapınız.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
            </svg>
            Giriş Yap
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
                  Admin Sipariş Oluştur
                </h1>
              </div>
              <div className="text-gray-600">
                <p className="text-lg font-semibold">{orderData.store.kurum_adi}</p>
                <p className="text-sm">Kullanıcı: {orderData.user.name} {orderData.user.surname}</p>
                <p className="text-sm">Fiyat Listesi: {orderData.priceList.name}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Arama</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ürün adına göre ara..."
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
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Koleksiyon</label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors text-left bg-white"
                    >
                      <span className="text-gray-900">
                        {selectedCollection === 'all' ? 'Tüm Koleksiyonlar' : selectedCollection}
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${collectionDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {collectionDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedCollection === 'all' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setSelectedCollection('all');
                            setCollectionDropdownOpen(false);
                          }}
                        >
                          Tüm Koleksiyonlar
                        </div>
                        {orderData.availableCollections.map(collection => (
                          <div
                            key={collection}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                              selectedCollection === collection ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => {
                              setSelectedCollection(collection);
                              setCollectionDropdownOpen(false);
                            }}
                          >
                            {collection}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stok Durumu</label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => setStockFilterDropdownOpen(!stockFilterDropdownOpen)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-colors text-left bg-white"
                    >
                      <span className="text-gray-900">
                        {stockFilter === 'all' ? 'Tüm Ürünler' : 
                         stockFilter === 'inStock' ? 'Stokta Olanlar' : 
                         stockFilter === 'outOfStock' ? 'Stokta Olmayanlar' : 'Stok Durumu'}
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${stockFilterDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {stockFilterDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            stockFilter === 'all' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setStockFilter('all');
                            setStockFilterDropdownOpen(false);
                          }}
                        >
                          Tüm Ürünler
                        </div>
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            stockFilter === 'inStock' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setStockFilter('inStock');
                            setStockFilterDropdownOpen(false);
                          }}
                        >
                          Stokta Olanlar
                        </div>
                        <div
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                            stockFilter === 'outOfStock' ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setStockFilter('outOfStock');
                            setStockFilterDropdownOpen(false);
                          }}
                        >
                          Stokta Olmayanlar
                        </div>
                      </div>
                    )}
                  </div>
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
                  <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                    {filteredProducts.map((product) => {
                      return (
                        <div 
                          key={product.productId} 
                          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative cursor-pointer" 
                          style={{ width: '350px', height: '550px' }}
                        >
                          
                          {/* Koleksiyon adı - sol üst */}
                          <div className="absolute top-3 left-3 z-10">
                            <span className="bg-[#00365a] text-white text-xs px-2 py-1 rounded-md font-medium">
                              {('collectionName' in product) ? product.collectionName : product.collection?.name || 'Koleksiyon'}
                            </span>
                          </div>
                          
                          {/* Ürün görseli - daha büyük alan */}
                          <div className="relative overflow-hidden bg-gray-50" style={{ height: '400px' }}>
                            {product.productImage && (
                              <img 
                                src={product.productImage} 
                                alt={product.name}
                                className="w-full h-full object-contain p-3"
                              />
                            )}
                          </div>
                          
                          {/* Ürün bilgileri - kompakt alan */}
                          <div className="p-4 h-[150px] flex flex-col justify-between">
                            <div className="flex-1">
                              <h3 className="text-black font-medium text-sm mb-2 line-clamp-2">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                {product.description}
                              </p>
                              {/* Stok bilgisi debug */}
                              <div className="text-xs text-gray-400 mt-1">
                                {('sizeOptions' in product) ? (
                                  <span>
                                    Stok: {product.sizeOptions?.some(opt => 
                                      opt.is_optional_height ? (opt.stockAreaM2 || 0) > 0 : (opt.stockQuantity || 0) > 0
                                    ) ? 'Var' : 'Yok'}
                                  </span>
                                ) : (
                                  <span>Stok: {product.stock || 0} adet</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openAddProductModal(product)}
                                className="flex-1 px-3 py-2 rounded-md flex items-center justify-center gap-2 text-sm shadow-sm transition-colors font-semibold bg-[#00365a] hover:bg-[#004170] text-white hover:shadow-md"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                Ekle
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 bg-orange-600 sticky top-0 z-10">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold text-white">Sepet</h3>
                  <span className="ml-auto text-orange-100 text-sm">({adminCart?.totalItems || 0} ürün)</span>
                </div>
              </div>

              <div className="p-6 flex flex-col h-full">
                {cartLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#00365a] mx-auto mb-4"></div>
                    <p className="text-gray-600">Sepet yükleniyor...</p>
                  </div>
                ) : adminCart && adminCart.items.length > 0 ? (
                  <>
                    <div className="space-y-4 mb-6 flex-1 overflow-y-auto">
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

                    <div className="border-t border-gray-200 pt-4 flex-shrink-0">
                      {/* Teslimat Adresi Seçimi */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="text-red-500">*</span> Teslimat Adresi
                        </label>
                        
                        {/* Custom Dropdown */}
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                            disabled={addressesLoading}
                            className="w-full px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-[#00365a] transition-all duration-200 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                <span className={`${selectedAddressId ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                  {selectedAddressId ? 
                                    (() => {
                                      const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);
                                      return selectedAddress ? `${selectedAddress.title} - ${selectedAddress.address.substring(0, 50)}${selectedAddress.address.length > 50 ? '...' : ''}` : 'Teslimat adresi seçin';
                                    })() 
                                    : 'Teslimat adresi seçin'
                                  }
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {addressesLoading && (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#00365a] border-t-transparent"></div>
                                )}
                                <svg
                                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${addressDropdownOpen ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </button>

                          {/* Dropdown Options */}
                          {addressDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                              {storeAddresses.length > 0 ? (
                                <>
                                  <div className="py-1">
                                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50">
                                      Kayıtlı Adresler
                                    </div>
                                  </div>
                                  {storeAddresses
                                    .filter(addr => addr.is_active)
                                    .map((address) => (
                                      <button
                                        key={address.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedAddressId(address.id);
                                          setAddressDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                                          selectedAddressId === address.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                            selectedAddressId === address.id ? 'bg-blue-500' : 'bg-gray-300'
                                          }`}></div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-gray-900">{address.title}</span>
                                              {address.is_default && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                  Varsayılan
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                                            {(address.city || address.district) && (
                                              <p className="text-xs text-gray-500 mt-1">
                                                {address.district && address.district + ', '}
                                                {address.city}
                                                {address.postal_code && ' - ' + address.postal_code}
                                              </p>
                                            )}
                                          </div>
                                          {selectedAddressId === address.id && (
                                            <div className="flex-shrink-0">
                                              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M9 16.17L5.53 12.7a.996.996 0 10-1.41 1.41L9 19l11-11a.996.996 0 10-1.41-1.41L9 16.17z"/>
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    ))
                                  }
                                </>
                              ) : (
                                <div className="px-4 py-6 text-center">
                                  <div className="text-gray-400 mb-2">
                                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-sm text-gray-600 font-medium">Henüz adres bulunamadı</p>
                                  <p className="text-xs text-gray-500 mt-1">Yeni adres ekleyebilirsiniz</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {!selectedAddressId && (
                          <p className="text-red-500 text-sm mt-1">Lütfen bir teslimat adresi seçin</p>
                        )}
                        
                        {/* Seçilen adres bilgilerini göster */}
                        {selectedAddressId && (() => {
                          const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);
                          return selectedAddress ? (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="text-sm">
                                <div className="font-medium text-blue-900 mb-1">{selectedAddress.title}</div>
                                <div className="text-blue-800">{selectedAddress.address}</div>
                                <div className="text-blue-700">
                                  {selectedAddress.district && selectedAddress.district + ', '}
                                  {selectedAddress.city}
                                  {selectedAddress.postal_code && ' - ' + selectedAddress.postal_code}
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>

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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
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
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl shadow-lg relative overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#00365a] rounded-t-xl px-6 py-4 relative">
              <button 
                className="absolute top-3 right-3 text-white hover:text-gray-200 text-3xl font-bold" 
                onClick={() => setShowAddProductModal(false)}
              >
                &times;
              </button>
              
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Sepete Ekle</h2>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-2xl font-bold text-black">
                    {('collection' in selectedProduct && selectedProduct.collection?.name) || 'Koleksiyon'} - {selectedProduct.name}
                  </h1>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/2">
                    <div className="aspect-[4/3] relative overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                      <img 
                        src={selectedProduct.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                        alt={selectedProduct.name}
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                    {/* Stok Durumu */}
                    {('sizeOptions' in selectedProduct) && selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Stok Durumu</h3>
                        <div className="space-y-2">
                          {selectedProduct.sizeOptions.map((size: any, index: number) => {
                            const isOptionalHeight = size.is_optional_height;
                            const stockValue = isOptionalHeight 
                              ? `${(size.stockAreaM2 || 0).toFixed(1)} m²`
                              : `${size.stockQuantity || 0} adet`;
                            const stockColor = (isOptionalHeight ? (size.stockAreaM2 || 0) : (size.stockQuantity || 0)) > 0 
                              ? 'text-green-600' 
                              : 'text-red-600';
                            
                            return (
                              <div key={size.id || index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">
                                  {size.width}x{isOptionalHeight ? 'İsteğe Bağlı' : size.height} cm
                                </span>
                                <span className={`font-medium ${stockColor}`}>
                                  {stockValue}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="w-full md:w-1/2">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="flex flex-col gap-2 dropdown-container">
                        <span className="text-sm font-medium text-gray-700">Boyut Seçimi</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          >
                            <span className={productForm.width ? "text-gray-900" : "text-gray-500"}>
                              {productForm.width 
                                ? (() => {
                                    if (selectedProduct.sizeOptions) {
                                      const selectedOption = selectedProduct.sizeOptions?.find((opt: any) => 
                                        opt.width === productForm.width
                                      );
                                      if (selectedOption) {
                                        const displayHeight = selectedOption.is_optional_height ? (productForm.height ? `${productForm.height} cm` : 'İsteğe Bağlı') : (typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100));
                                        return `${productForm.width}x${displayHeight} cm (Stok: ${selectedOption.is_optional_height ? `${(selectedOption.stockAreaM2 || 0).toFixed(1)} m²` : `${selectedOption.stockQuantity || 0} adet`})`;
                                      }
                                    }
                                    return `${productForm.width}x${(typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100)).toFixed(2)} cm (Stok: ${('stock' in selectedProduct ? selectedProduct.stock : 0) || 0} adet)`;
                                  })()
                                : "Boyut Seçin"
                              }
                            </span>
                            <svg 
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${sizeDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {sizeDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              <div 
                                className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                onClick={() => {
                                  setProductForm(prev => ({ ...prev, width: 0, height: '' }));
                                  setSizeDropdownOpen(false);
                                }}
                              >
                                Boyut Seçin
                              </div>
                              {selectedProduct.sizeOptions?.map((option: any) => (
                                <div
                                  key={option.id}
                                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    option.width === productForm.width ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                  }`}
                                  onClick={() => {
                                    setProductForm(prev => ({ 
                                      ...prev, 
                                      width: option.width, 
                                      height: option.is_optional_height ? '' : option.height 
                                    }));
                                    setSizeDropdownOpen(false);
                                  }}
                                >
                                  {option.width}x{option.is_optional_height ? 'İsteğe Bağlı' : option.height} cm (Stok: {option.is_optional_height ? `${(option.stockAreaM2 || 0).toFixed(1)} m²` : `${option.stockQuantity || 0} adet`})
                                </div>
                              ))}
                              {(!selectedProduct.sizeOptions || selectedProduct.sizeOptions.length === 0) && (
                                <div className="px-3 py-2 text-gray-500">
                                  Bu ürün için boyut seçenekleri mevcut değil
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {productForm.width && (('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions?.find((s: any) => s.width === productForm.width && s.is_optional_height) : false) && (
                          <div className="mt-2">
                            <label className="text-sm text-gray-500 block mb-1">Özel Boy (cm)</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="10"
                                max="10000"
                                value={productForm.height}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setProductForm(prev => ({ ...prev, height: value }));
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || Number(value) < 10) {
                                    setProductForm(prev => ({ ...prev, height: '' }));
                                  }
                                }}
                                className="border rounded-md p-2 text-black w-24"
                              />
                              <span className="text-sm text-gray-500">cm</span>
                            </div>
                            <span className="text-xs text-gray-500 block mt-1">
                              {productForm.width}x{typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100)} cm olarak hesaplanacak
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 dropdown-container">
                        <span className="text-sm font-medium text-gray-700">Kesim Türü</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCutTypeDropdownOpen(!cutTypeDropdownOpen)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          >
                            <span className={productForm.cutType ? "text-gray-900" : "text-gray-500"}>
                              {productForm.cutType 
                                ? productForm.cutType.charAt(0).toUpperCase() + productForm.cutType.slice(1)
                                : "Kesim Türü Seçin"
                              }
                            </span>
                            <svg 
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${cutTypeDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {cutTypeDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              <div 
                                className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                onClick={() => {
                                  setProductForm(prev => ({ ...prev, cutType: '' }));
                                  setCutTypeDropdownOpen(false);
                                }}
                              >
                                Kesim Türü Seçin
                              </div>
                              {('cutTypes' in selectedProduct) ? selectedProduct.cutTypes?.map((ct: any) => (
                                <div
                                  key={ct.id}
                                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    ct.name === productForm.cutType ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                  }`}
                                  onClick={() => {
                                    setProductForm(prev => ({ ...prev, cutType: ct.name }));
                                    setCutTypeDropdownOpen(false);
                                  }}
                                >
                                  {ct.name.charAt(0).toUpperCase() + ct.name.slice(1)}
                                </div>
                              )) : (
                                <div
                                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    'standart' === productForm.cutType ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                  }`}
                                  onClick={() => {
                                    setProductForm(prev => ({ ...prev, cutType: 'standart' }));
                                    setCutTypeDropdownOpen(false);
                                  }}
                                >
                                  Standart
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {('canHaveFringe' in selectedProduct) && selectedProduct.canHaveFringe && (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-gray-700">Saçak</span>
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="fringe"
                                checked={productForm.hasFringe === true}
                                onChange={() => setProductForm(prev => ({ ...prev, hasFringe: true }))}
                                className="text-[#00365a] focus:ring-[#00365a]"
                              />
                              <span className="text-sm text-gray-700">Saçaklı</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="fringe"
                                checked={productForm.hasFringe === false}
                                onChange={() => setProductForm(prev => ({ ...prev, hasFringe: false }))}
                                className="text-[#00365a] focus:ring-[#00365a]"
                              />
                              <span className="text-sm text-gray-700">Saçaksız</span>
                            </label>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Açıklama</span>
                        <p className="text-black">{selectedProduct.description}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-500">Metrekare Fiyatı</span>
                        <span className="font-medium text-black">
                          {('pricing' in selectedProduct) ? `${selectedProduct.pricing.price} ${selectedProduct.pricing.currency}/m²` : 'Fiyat bilgisi yok'}
                        </span>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-900">Toplam Tutar</span>
                          <span className="text-lg font-bold text-blue-900">
                            {('pricing' in selectedProduct) && productForm.width && (productForm.height || (('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions.find((s: any) => s.width === productForm.width && s.is_optional_height) : false)) ? 
                              (() => {
                                const height = typeof productForm.height === 'string' ? parseFloat(productForm.height) || 100 : (productForm.height || 100);
                                const areaM2 = (productForm.width * height) / 10000;
                                const totalPrice = selectedProduct.pricing.price * areaM2 * productForm.quantity;
                                return `${totalPrice.toFixed(2)} ${selectedProduct.pricing.currency}`;
                              })() :
                              'Fiyat hesaplanamıyor'
                            }
                          </span>
                        </div>
                        {productForm.width && (productForm.height || (('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions?.find((s: any) => s.width === productForm.width && s.is_optional_height) : false)) && (
                          <div className="text-xs mt-1 text-blue-700">
                            {productForm.width} cm genişlik × {typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100)} cm Boy × {productForm.quantity} adet için hesaplandı
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">Miktar</label>
                            <div className="flex">
                              <button 
                                type="button"
                                className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50"
                                onClick={() => productForm.quantity > 1 && setProductForm(prev => ({ ...prev, quantity: prev.quantity - 1 }))}
                              >
                                -
                              </button>
                              <input 
                                type="number" 
                                min="1" 
                                value={productForm.quantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '') {
                                    setProductForm(prev => ({ ...prev, quantity: 0 }));
                                  } else {
                                    const numValue = parseInt(value);
                                    if (numValue >= 1) {
                                      setProductForm(prev => ({ ...prev, quantity: numValue }));
                                    }
                                  }
                                }}
                                onBlur={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || parseInt(value) < 1) {
                                    setProductForm(prev => ({ ...prev, quantity: 1 }));
                                  }
                                }}
                                className="w-16 border-y border-gray-300 py-1 px-2 text-center text-black"
                              />
                              <button 
                                type="button"
                                className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50"
                                onClick={() => setProductForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-gray-700">Özel Notlar (Opsiyonel)</label>
                            <textarea
                              value={productForm.notes}
                              onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Özel kesim notları veya diğer istekleriniz..."
                              className="w-full border border-gray-300 rounded-md p-2 text-black text-sm"
                              rows={3}
                            />
                          </div>
                          
                          <button
                            type="button"
                            className="mt-2 w-full py-3 bg-[#00365a] text-white rounded-md font-semibold flex items-center justify-center disabled:opacity-70 hover:bg-[#004170] transition-colors"
                            onClick={handleAddToAdminCart}
                            disabled={!productForm.width || (!productForm.height && !(('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions?.find((s: any) => s.width === productForm.width && s.is_optional_height) : false)) || !productForm.cutType || productForm.quantity < 1 || (typeof productForm.height === 'string' && productForm.height !== '' && parseFloat(productForm.height) < 10)}
                          >
                            Sepete Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Başarı Pop-up */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6 text-center">
              {/* Başarı İkonu */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Başlık */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ürün sepete eklendi
              </h3>
              
              {/* Kapat Butonu */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adres Uyarı Pop-up */}
      {showAddressWarningPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6 text-center">
              {/* Uyarı İkonu */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              {/* Başlık */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Lütfen teslimat adresi seçiniz
              </h3>
              
              {/* Açıklama */}
              <p className="text-gray-600 mb-6">
                Sipariş verebilmek için önce bir teslimat adresi seçmeniz gerekmektedir.
              </p>
              
              {/* Kapat Butonu */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAddressWarningPopup(false)}
                  className="bg-[#00365a] hover:bg-[#004170] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSiparisOlustur; 