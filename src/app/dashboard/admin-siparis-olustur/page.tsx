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
  const { isAdmin, user, isLoading: authLoading } = useAuth();
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
    // Kimlik doğrulama yüklemesi tamamlandığında yalnızca admin kontrolü
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında veri çek
    if (!authLoading && user && storeId && userId) {
      fetchOrderCreateInfo();
      fetchAdminCart();
      fetchStoreAddresses();
    }
  }, [user, authLoading, isAdmin, router, storeId, userId]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-8 py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]/70" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">Yetkilendirme Kontrol Ediliyor</h3>
          <p className="mt-1 text-xs text-slate-500">Lütfen bekleyiniz...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı doğrulaması - giriş yapmış herkes sipariş verebilir
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="max-w-md rounded-xl border border-slate-200/80 bg-white px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">Giriş Gerekli</h3>
          <p className="mt-2 text-sm text-slate-500">Sipariş verebilmek için lütfen giriş yapınız.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="rounded-xl border border-slate-200/80 bg-white px-8 py-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]/70" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">Sipariş Bilgileri Yükleniyor</h3>
          <p className="mt-1 text-xs text-slate-500">Lütfen bekleyiniz...</p>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="max-w-md rounded-xl border border-slate-200/80 bg-white px-8 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
            <svg className="h-7 w-7 text-rose-600/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900">Bilgi Bulunamadı</h3>
          <p className="mt-2 text-sm text-slate-500">Sipariş oluşturma bilgileri alınamadı. Lütfen tekrar deneyiniz.</p>
          <button
            onClick={() => router.push('/dashboard/magazalar')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
          >
            Mağazalara Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Page Header */}
        <div className="mb-5 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="mb-2 flex w-full items-center justify-center gap-3 sm:justify-start">
                <button
                  onClick={() => router.push(`/dashboard/magazalar/${storeId}/kullanicilar`)}
                  className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 ease-out hover:bg-stone-200/70 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20"
                  aria-label="Geri"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                  Admin Sipariş Oluştur
                </h1>
              </div>
              <div className="mt-1 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-2" />
            </div>
          </div>
        </div>

        {/* Minimal Sepet — başlığın hemen altında */}
        <div className="mb-5 rounded-xl border border-slate-200/80 bg-white shadow-sm">
          {/* Mağaza bilgisi — sepet bu mağazaya ait */}
          <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Mağaza</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium text-slate-800">{orderData.store.kurum_adi}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">
                {orderData.user.name} {orderData.user.surname}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">{orderData.priceList.name}</span>
            </div>
          </div>

          <div className="border-b border-slate-100 px-3 py-2.5 sm:px-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sepet
                <span className="ml-1 font-medium tabular-nums text-slate-400">({adminCart?.totalItems || 0})</span>
              </span>
              {adminCart && adminCart.items.length > 0 && (
                <span className="text-xs font-semibold tabular-nums text-[#00365a]">
                  {getTotalPrice().toLocaleString('tr-TR')} ₺
                </span>
              )}
            </div>

            {cartLoading ? (
              <p className="text-xs text-slate-400">Yükleniyor...</p>
            ) : !adminCart || adminCart.items.length === 0 ? (
              <p className="text-xs text-slate-400">Boş</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[minmax(0,2fr)_7rem_5.5rem_6.5rem_8.5rem_2.25rem] items-center gap-x-3 border-b border-slate-100 pb-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    <span>Ürün</span>
                    <span className="text-right">Ölçü</span>
                    <span className="text-right">m²</span>
                    <span className="text-right">Fiyat</span>
                    <span className="text-center">Adet</span>
                    <span className="sr-only">Sil</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {adminCart.items.map((item) => (
                      <li
                        key={item.id}
                        className="grid grid-cols-[minmax(0,2fr)_7rem_5.5rem_6.5rem_8.5rem_2.25rem] items-center gap-x-3 py-2"
                      >
                        <span className="min-w-0 truncate text-xs font-medium text-slate-900">
                          {item.product?.name || 'Ürün'}
                        </span>
                        <span className="text-right text-xs tabular-nums text-slate-600">
                          {item.width}x{item.height}
                        </span>
                        <span className="text-right text-xs tabular-nums text-slate-600">
                          {item.area_m2} m²
                        </span>
                        <span className="text-right text-xs font-medium tabular-nums text-slate-800">
                          {item.total_price.toLocaleString('tr-TR')} ₺
                        </span>
                        <div className="flex justify-center">
                          <div className="flex h-8 overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(1, (item.quantity || 1) - 1);
                                handleUpdateAdminCartItem(item.id, { quantity: next });
                              }}
                              disabled={item.quantity <= 1}
                              className="flex h-full w-8 items-center justify-center text-slate-500 transition-colors duration-150 hover:bg-stone-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Adedi azalt"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1;
                                handleUpdateAdminCartItem(item.id, { quantity: newQuantity });
                              }}
                              className="h-full w-12 border-x border-slate-200 bg-transparent px-1 text-center text-sm font-medium tabular-nums text-slate-900 outline-none focus:bg-stone-50/50"
                              title="Adedi güncelle"
                              aria-label="Adet"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleUpdateAdminCartItem(item.id, { quantity: (item.quantity || 1) + 1 });
                              }}
                              className="flex h-full w-8 items-center justify-center text-slate-500 transition-colors duration-150 hover:bg-stone-50 hover:text-slate-800"
                              aria-label="Adedi artır"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromAdminCart(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center justify-self-end rounded-md border border-slate-200/80 bg-stone-50 text-slate-400 transition-colors duration-150 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Sepetten çıkar"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {adminCart && adminCart.items.length > 0 && (
            <div className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4 sm:px-4">
              <div className="sm:col-span-1 lg:col-span-1">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  <span className="text-rose-500">*</span> Teslimat Adresi
                </label>
                <div className="relative dropdown-container">
                  <button
                    type="button"
                    onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                    disabled={addressesLoading}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-left text-xs text-slate-800 transition-all duration-200 ease-out hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={selectedAddressId ? 'text-slate-800' : 'text-slate-400'}>
                      {selectedAddressId
                        ? (() => {
                            const selectedAddress = storeAddresses.find(addr => addr.id === selectedAddressId);
                            return selectedAddress
                              ? `${selectedAddress.title} - ${selectedAddress.address.substring(0, 40)}${selectedAddress.address.length > 40 ? '...' : ''}`
                              : 'Teslimat adresi seçin';
                          })()
                        : 'Teslimat adresi seçin'}
                    </span>
                  </button>
                  {addressDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm">
                      {storeAddresses.length > 0 ? (
                        storeAddresses
                          .filter(addr => addr.is_active)
                          .map((address) => (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => {
                                setSelectedAddressId(address.id);
                                setAddressDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs transition-colors duration-150 hover:bg-stone-50 ${
                                selectedAddressId === address.id ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                              }`}
                            >
                              <div className="font-medium">{address.title}</div>
                              <div className="mt-0.5 text-slate-500">{address.address}</div>
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-4 text-center text-xs text-slate-400">Henüz adres bulunamadı</div>
                      )}
                    </div>
                  )}
                </div>
                {!selectedAddressId && (
                  <p className="mt-1 text-[10px] text-rose-600/80">Lütfen bir teslimat adresi seçin</p>
                )}
              </div>

              <div className="sm:col-span-1 lg:col-span-2">
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Sipariş Notları</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Sipariş notları..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs text-slate-800 transition-all duration-200 ease-out placeholder:text-slate-400 hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00365a]/15"
                />
              </div>

              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <button
                  onClick={handleClearAdminCart}
                  className="rounded-lg border border-slate-200/80 bg-stone-50 px-3 py-2 text-xs font-medium text-slate-600 transition-all duration-200 ease-out hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/20 active:scale-[0.98]"
                >
                  Temizle
                </button>
                <button
                  onClick={handleCreateOrderFromAdminCart}
                  disabled={orderLoading || !adminCart || adminCart.items.length === 0}
                  className="flex-1 rounded-lg bg-[#00365a] px-3 py-2 text-xs font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {orderLoading ? 'İşleniyor...' : 'Siparişi Tamamla'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filtreler */}
        <div className="mb-5 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Filtreler</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ürün adına göre ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 transition-all duration-200 ease-out placeholder:text-slate-400 hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                />
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              </div>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Koleksiyon</label>
              <div className="relative dropdown-container">
                <button
                  type="button"
                  onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition-all duration-200 ease-out hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  {selectedCollection === 'all' ? 'Tüm Koleksiyonlar' : selectedCollection}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${collectionDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {collectionDropdownOpen && (
                  <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm scrollbar-hide">
                    <div
                      className={`cursor-pointer px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                        selectedCollection === 'all' ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
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
                        className={`cursor-pointer px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          selectedCollection === collection ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
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
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Stok Durumu</label>
              <div className="relative dropdown-container">
                <button
                  type="button"
                  onClick={() => setStockFilterDropdownOpen(!stockFilterDropdownOpen)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition-all duration-200 ease-out hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  {stockFilter === 'all' ? 'Tüm Ürünler' :
                   stockFilter === 'inStock' ? 'Stokta Olanlar' :
                   stockFilter === 'outOfStock' ? 'Stokta Olmayanlar' : 'Stok Durumu'}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform duration-200 ${stockFilterDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {stockFilterDropdownOpen && (
                  <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200/80 bg-white py-1 shadow-sm scrollbar-hide">
                    {[
                      { key: 'all', label: 'Tüm Ürünler' },
                      { key: 'inStock', label: 'Stokta Olanlar' },
                      { key: 'outOfStock', label: 'Stokta Olmayanlar' },
                    ].map(opt => (
                      <div
                        key={opt.key}
                        className={`cursor-pointer px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-stone-50 ${
                          stockFilter === opt.key ? 'bg-stone-100 text-slate-900' : 'text-slate-700'
                        }`}
                        onClick={() => {
                          setStockFilter(opt.key);
                          setStockFilterDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ürün Listesi — 2 kolon */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Ürünler</h3>
            <span className="text-xs text-slate-400">({filteredProducts.length} ürün)</span>
          </div>

          <div className="p-3 sm:p-4 lg:p-5">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
                {filteredProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="group overflow-hidden rounded-xl border border-slate-200/80 bg-white transition-all duration-200 ease-out hover:border-slate-300/90"
                  >
                    <div className="relative">
                      <div className="absolute left-3 top-3 z-10">
                        <span className="rounded-md bg-[#00365a]/90 px-2 py-1 text-[11px] font-medium text-white">
                          {('collectionName' in product) ? product.collectionName : product.collection?.name || 'Koleksiyon'}
                        </span>
                      </div>
                      <div className="relative overflow-hidden bg-slate-50 aspect-[350/400]">
                        {product.productImage && (
                          <img
                            src={product.productImage}
                            alt={product.name}
                            className="h-full w-full object-contain p-3 transition duration-300 ease-out group-hover:scale-[1.02]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 p-3.5 sm:p-4">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-medium text-slate-900">{product.name}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.description}</p>
                        <div className="mt-1.5 text-[11px] text-slate-400">
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
                      <button
                        onClick={() => openAddProductModal(product)}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#00365a] px-3.5 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Ekle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-14 text-center">
                <p className="text-sm font-medium text-slate-900">Ürün Bulunamadı</p>
                <p className="mt-1 text-xs text-slate-500">Arama kriterlerinize uygun ürün bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ürün Ekleme Modal */}
      {showAddProductModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            {/* Header */}
            <div className="relative shrink-0 border-b border-slate-200/80 bg-stone-50/90 px-5 py-4">
              <button 
                className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-all duration-200 ease-out hover:bg-stone-200/70 hover:text-slate-700" 
                onClick={() => setShowAddProductModal(false)}
              >
                &times;
              </button>
              
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">Sepete Ekle</h2>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto p-4 sm:p-5 max-h-[calc(90vh-120px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                    {('collection' in selectedProduct && selectedProduct.collection?.name) || 'Koleksiyon'} - {selectedProduct.name}
                  </h1>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="w-full md:w-1/2">
                    <div className="relative aspect-[350/400] overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img 
                        src={selectedProduct.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                        alt={selectedProduct.name}
                        className="h-full w-full object-contain p-3"
                      />
                    </div>
                    {/* Stok Durumu */}
                    {('sizeOptions' in selectedProduct) && selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                      <div className="mt-4 rounded-lg border border-slate-200/80 bg-stone-50/70 p-3.5">
                        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Stok Durumu</h3>
                        <div className="space-y-2">
                          {selectedProduct.sizeOptions.map((size: any, index: number) => {
                            const isOptionalHeight = size.is_optional_height;
                            const stockValue = isOptionalHeight 
                              ? `${(size.stockAreaM2 || 0).toFixed(1)} m²`
                              : `${size.stockQuantity || 0} adet`;
                            const stockColor = (isOptionalHeight ? (size.stockAreaM2 || 0) : (size.stockQuantity || 0)) > 0 
                              ? 'text-emerald-700/80' 
                              : 'text-rose-700/80';
                            
                            return (
                              <div key={size.id || index} className="flex items-center justify-between text-sm">
                                <span className="text-slate-700">
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
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Boyut</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ? (
                            selectedProduct.sizeOptions.map((option: any) => {
                              const isSelected = option.is_optional_height
                                ? productForm.width === option.width && (productForm.height === '' || productForm.height === null || productForm.height === undefined)
                                : productForm.width === option.width && (
                                    productForm.height === option.height || Number(productForm.height) === option.height
                                  );
                              const label = option.is_optional_height
                                ? `${option.width} × Özel`
                                : `${option.width} × ${option.height}`;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => {
                                    setProductForm(prev => ({
                                      ...prev,
                                      width: option.width,
                                      height: option.is_optional_height ? '' : option.height
                                    }));
                                    setSizeDropdownOpen(false);
                                  }}
                                  className={`rounded-md border px-2.5 py-1.5 text-xs tabular-nums transition-all duration-200 ease-out active:scale-[0.98] ${
                                    isSelected
                                      ? 'border-[#00365a] bg-[#00365a] font-medium text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-stone-50'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400">Bu ürün için boyut seçenekleri mevcut değil</span>
                          )}
                        </div>

                        {productForm.width && (('sizeOptions' in selectedProduct) ? selectedProduct.sizeOptions?.find((s: any) => s.width === productForm.width && s.is_optional_height) : false) && (
                          <div className="mt-1 flex items-center gap-2">
                            <label className="shrink-0 text-xs text-slate-500">Boy</label>
                            <div className="flex h-9 max-w-[120px] items-center overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#00365a]/20">
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
                                className="h-full w-full bg-transparent px-2.5 text-sm tabular-nums text-slate-900 outline-none"
                                aria-label="Boy (cm)"
                              />
                              <span className="pr-2.5 text-xs text-slate-400">cm</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Kesim Türü</span>
                        <div className="flex flex-wrap gap-1.5">
                          {('cutTypes' in selectedProduct) && selectedProduct.cutTypes?.length ? (
                            selectedProduct.cutTypes.map((ct: any) => {
                              const isSelected = ct.name === productForm.cutType;
                              return (
                                <button
                                  key={ct.id}
                                  type="button"
                                  onClick={() => {
                                    setProductForm(prev => ({ ...prev, cutType: ct.name }));
                                    setCutTypeDropdownOpen(false);
                                  }}
                                  className={`rounded-md border px-2.5 py-1.5 text-xs transition-all duration-200 ease-out active:scale-[0.98] ${
                                    isSelected
                                      ? 'border-[#00365a] bg-[#00365a] font-medium text-white'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-stone-50'
                                  }`}
                                >
                                  {ct.name.charAt(0).toUpperCase() + ct.name.slice(1)}
                                </button>
                              );
                            })
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setProductForm(prev => ({ ...prev, cutType: 'standart' }));
                                setCutTypeDropdownOpen(false);
                              }}
                              className={`rounded-md border px-2.5 py-1.5 text-xs transition-all duration-200 ease-out active:scale-[0.98] ${
                                productForm.cutType === 'standart'
                                  ? 'border-[#00365a] bg-[#00365a] font-medium text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-stone-50'
                              }`}
                            >
                              Standart
                            </button>
                          )}
                        </div>
                      </div>

                      {('canHaveFringe' in selectedProduct) && selectedProduct.canHaveFringe && (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-slate-700">Saçak</span>
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="fringe"
                                checked={productForm.hasFringe === true}
                                onChange={() => setProductForm(prev => ({ ...prev, hasFringe: true }))}
                                className="text-[#00365a] focus:ring-[#00365a]"
                              />
                              <span className="text-sm text-slate-700">Saçaklı</span>
                            </label>
                            <label className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="fringe"
                                checked={productForm.hasFringe === false}
                                onChange={() => setProductForm(prev => ({ ...prev, hasFringe: false }))}
                                className="text-[#00365a] focus:ring-[#00365a]"
                              />
                              <span className="text-sm text-slate-700">Saçaksız</span>
                            </label>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-500">Açıklama</span>
                        <p className="text-slate-800">{selectedProduct.description}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-slate-500">Metrekare Fiyatı</span>
                        <span className="font-medium text-slate-800">
                          {('pricing' in selectedProduct) ? `${selectedProduct.pricing.price} ${selectedProduct.pricing.currency}/m²` : 'Fiyat bilgisi yok'}
                        </span>
                      </div>
                      
                      <div className="rounded-lg border border-slate-200/80 bg-stone-50/80 p-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-700">Toplam Tutar</span>
                          <span className="text-base font-semibold tabular-nums text-[#00365a]">
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
                          <div className="mt-1 text-xs text-slate-500">
                            {productForm.width} cm genişlik × {typeof productForm.height === 'string' ? (parseFloat(productForm.height) || 100) : (productForm.height || 100)} cm Boy × {productForm.quantity} adet için hesaplandı
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Miktar</label>
                            <div className="flex">
                              <button 
                                type="button"
                                className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-slate-500 hover:bg-gray-50"
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
                                className="w-16 border-y border-gray-300 py-1 px-2 text-center text-slate-800"
                              />
                              <button 
                                type="button"
                                className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-slate-500 hover:bg-gray-50"
                                onClick={() => setProductForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-700">Özel Notlar (Opsiyonel)</label>
                            <textarea
                              value={productForm.notes}
                              onChange={(e) => setProductForm(prev => ({ ...prev, notes: e.target.value }))}
                              placeholder="Özel kesim notları veya diğer istekleriniz..."
                              className="w-full border border-gray-300 rounded-md p-2 text-slate-800 text-sm"
                              rows={3}
                            />
                          </div>
                          
                          <button
                            type="button"
                            className="mt-2 flex w-full items-center justify-center rounded-lg bg-[#00365a] py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200/80 bg-white">
            <div className="p-6 text-center">
              {/* Başarı İkonu */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <svg className="h-8 w-8 text-emerald-700/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              {/* Başlık */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Ürün sepete eklendi
              </h3>
              
              {/* Kapat Butonu */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200/80 bg-white">
            <div className="p-6 text-center">
              {/* Uyarı İkonu */}
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                <svg className="h-8 w-8 text-rose-700/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              {/* Başlık */}
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Lütfen teslimat adresi seçiniz
              </h3>
              
              {/* Açıklama */}
              <p className="mb-6 text-sm text-slate-500">
                Sipariş verebilmek için önce bir teslimat adresi seçmeniz gerekmektedir.
              </p>
              
              {/* Kapat Butonu */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAddressWarningPopup(false)}
                  className="rounded-lg bg-[#00365a] px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-[#004170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 active:scale-[0.98]"
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
