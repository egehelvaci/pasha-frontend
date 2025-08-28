'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToken } from '@/app/hooks/useToken';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

// Sayfalama Komponenti
const Pagination = ({ pagination, onPageChange, searchTerm = '' }: {
  pagination: any;
  onPageChange: (page: number, search?: string) => void;
  searchTerm?: string;
}) => {
  if (!pagination) return null;

  return (
    <div style={{
      marginTop: '20px',
      textAlign: 'center',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px'
    }}>
      <button
        disabled={pagination.page <= 1}
        onClick={() => onPageChange(pagination.page - 1, searchTerm)}
        style={{
          padding: '8px 16px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
          opacity: pagination.page <= 1 ? 0.5 : 1,
          backgroundColor: pagination.page <= 1 ? '#f5f5f5' : '#fff'
        }}
      >
        ← Önceki
      </button>

      <span style={{
        fontSize: '14px',
        color: '#666',
        minWidth: '200px'
      }}>
        Sayfa {pagination.page} / {pagination.totalPages}
        (Toplam {pagination.total} ürün)
      </span>

      <button
        disabled={!pagination.hasMore}
        onClick={() => onPageChange(pagination.page + 1, searchTerm)}
        style={{
          padding: '8px 16px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: !pagination.hasMore ? 'not-allowed' : 'pointer',
          opacity: !pagination.hasMore ? 0.5 : 1,
          backgroundColor: !pagination.hasMore ? '#f5f5f5' : '#fff'
        }}
      >
        Sonraki →
      </button>
    </div>
  );
};

// Loading Spinner Komponenti
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#666'
  }}>
    <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
    <div style={{ marginLeft: '15px' }}>Ürünler yükleniyor...</div>
  </div>
);

// Responsive sayfa boyutu fonksiyonu
const getPageSize = () => {
  if (typeof window === 'undefined') return 20;
  const width = window.innerWidth;
  if (width < 768) return 10;      // Mobil: 10 ürün
  if (width < 1024) return 15;     // Tablet: 15 ürün
  return 20;                       // Desktop: 20 ürün
};

interface Collection {
  collectionId: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CutType {
  id: number;
  name: string;
}

interface SizeOption {
  id: number;
  width: number;
  height: number;
  is_optional_height: boolean;
  stockQuantity: number;
  stockAreaM2: number;
  pieceAreaM2: number;
}

interface Variation {
  width: number;
  height: number;
  stockQuantity: number;
}

interface Product {
  productId: string;
  name: string;
  description: string;
  productImage: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  rule_id: number;
  collection: Collection;
  canHaveFringe: boolean;
  hasFringe: boolean;
  cutTypes: CutType[];
  sizeOptions: SizeOption[];
  variations: Variation[];
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface ProductDetailResponse {
  success: boolean;
  data: Product;
  message?: string;
}

interface StockUpdateRequest {
  width: number;
  height: number;
  quantity: number;
  areaM2?: number;
  updateMode?: 'add' | 'set'; // 'add' stok ekleme, 'set' stok güncelleme
  areaM2ForFixed?: number; // Hazır kesim için m² girişi
}

interface StockUpdateResponse {
  success: boolean;
  data: Product;
  message?: string;
}

export default function StokPage() {
  const { user, isLoading, isAdmin, isAdminOrEditor } = useAuth();
  const token = useToken();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSizeOption, setSelectedSizeOption] = useState<SizeOption | null>(null);
  const [stockForm, setStockForm] = useState<StockUpdateRequest>({
    width: 0,
    height: 0,
    quantity: 0,
    areaM2: 0,
    updateMode: 'add', // Varsayılan olarak stok ekleme modu
    areaM2ForFixed: 0
  });

  // Input değerleri için string state'ler (silme sorunu için)
  const [inputValues, setInputValues] = useState({
    height: '',
    areaM2: '',
    quantity: '',
    areaM2ForFixed: ''
  });
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [isLoadingProductDetail, setIsLoadingProductDetail] = useState(false);

  // Debounce timer için ref
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Opsiyonel yükseklik ürünlerde boy değiştiğinde m² hesaplama
  useEffect(() => {
    if (selectedProduct && selectedSizeOption) {
      const productType = getProductType(selectedProduct.sizeOptions || []);
      if (productType === 'optional_height' && stockForm.width > 0 && stockForm.height > 0) {
        const calculatedAreaM2 = (stockForm.width * stockForm.height) / 10000; // cm² -> m²
        setStockForm(prev => ({
          ...prev,
          areaM2: calculatedAreaM2
        }));
      }
    }
  }, [stockForm.width, stockForm.height, selectedProduct, selectedSizeOption]);

  // Component unmount olduğunda body scroll'unu geri aç
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    // Auth loading tamamlandığında user yoksa login'e yönlendir
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  // Admin ve Editör kontrolü
  useEffect(() => {
    // Auth loading tamamlandığında admin/editör kontrolü yap
    if (!isLoading && user && !isAdminOrEditor) {
      router.push('/dashboard');
    }
  }, [user, isAdminOrEditor, isLoading, router]);

  useEffect(() => {
    if (!token) return;
    fetchProducts();
  }, [token]); // fetchProducts fonksiyonu stable olmadığı için dependency'ye eklenmemiştir

  // Arama değiştiğinde debounce ile API çağrısı
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1); // Arama değiştiğinde ilk sayfaya dön
      fetchProducts(1, search);
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]); // fetchProducts fonksiyonu stable olmadığı için dependency'ye eklenmemiştir

  // Optimizasyonlu ürün getirme fonksiyonu
  const fetchProducts = async (page: number = 1, searchQuery: string = '') => {
    try {
      setIsLoadingProducts(true);
      const limit = getPageSize();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery })
      });

      const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ProductsResponse = await response.json();
        if (data.success) {
          const sortedProducts = data.data.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
          setProducts(sortedProducts);
          setPagination(data.pagination); // Yeni pagination bilgisi
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Ürünler çekme hatası:', error);
      setProducts([]);
      setPagination(null);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Sayfa değişikliği handler'ı
  const handlePageChange = (newPage: number, search: string = searchTerm) => {
    fetchProducts(newPage, search);
  };

  // Ürün detaylarını GET ile çek
  const fetchProductDetail = async (productId: string): Promise<Product | null> => {
    try {
      setIsLoadingProductDetail(true);

      const normalUrl = `${API_BASE_URL}/api/products/${productId}`;

      const response = await fetch(normalUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ProductDetailResponse = await response.json();

        if (data.success && data.data) {
          return data.data;
        } else {
          console.error('❌ GET başarısız veya data boş:', data);

          // Eğer normal endpoint çalışmazsa variations endpoint'ini deneyelim
          return await fetchProductDetailVariations(productId);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ GET HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });

        // Normal endpoint başarısızsa variations endpoint'ini deneyelim
        return await fetchProductDetailVariations(productId);
      }
    } catch (error) {
      console.error('❌ GET Network Error:', error);

      // Network hatası durumunda da variations endpoint'ini deneyelim
      return await fetchProductDetailVariations(productId);
    } finally {
      setIsLoadingProductDetail(false);
    }
  };

  // Variations endpoint'ini deneyen yardımcı fonksiyon
  const fetchProductDetailVariations = async (productId: string): Promise<Product | null> => {
    try {
      const variationsUrl = `${API_BASE_URL}/api/products/${productId}/variations`;

      const response = await fetch(variationsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: ProductDetailResponse = await response.json();

        if (data.success && data.data) {
          return data.data;
        } else {
          console.error('❌ Variations GET başarısız veya data boş:', data);
          alert(`Ürün detayları alınırken hata oluştu: ${data.message || 'Bilinmeyen hata'}`);
          return null;
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Variations HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });
        alert(`Ürün detayları alınırken hata oluştu! Status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Variations Network Error:', error);
      alert('Ürün detayları alınırken hata oluştu!');
      return null;
    }
  };

  const openStockModal = async (product: Product) => {
    if (!product.productId) {
      console.error('❌ KRITIK HATA: Gelen product ID undefined!', product);
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    const detailedProduct = await fetchProductDetail(product.productId);

    let productToUse: Product;

    if (!detailedProduct || !detailedProduct.productId) {
      productToUse = product;
    } else {
      productToUse = detailedProduct;
    }

    setSelectedProduct(productToUse);

    if (productToUse.sizeOptions && productToUse.sizeOptions.length > 0) {
      const firstOption = productToUse.sizeOptions[0];
      const productType = getProductType(productToUse.sizeOptions);

      setSelectedSizeOption(firstOption);

      if (productType === 'optional_height') {
        setStockForm({
          width: firstOption.width,
          height: 10000, // Opsiyonel ürünlerde height sabit 10000
          quantity: 0,
          areaM2: 0,
          updateMode: 'add' // Varsayılan olarak ekleme modu
        });
      } else {
        setStockForm({
          width: firstOption.width,
          height: firstOption.height,
          quantity: 0,
          areaM2: 0,
          areaM2ForFixed: 0,
          updateMode: 'add' // Varsayılan olarak ekleme modu
        });
      }
    } else if (productToUse.variations && productToUse.variations.length > 0) {
      const firstVariation = productToUse.variations[0];
      setSelectedSizeOption(null);
      setStockForm({
        width: firstVariation.width,
        height: firstVariation.height,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      });
    } else {
      setSelectedSizeOption(null);
      setStockForm({
        width: 100,
        height: 100,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      });
    }

    setIsModalOpen(true);
    // Modal açıldığında body scroll'u engelle
    document.body.style.overflow = 'hidden';
  };

  const closeStockModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedSizeOption(null);
    setStockForm({ width: 0, height: 0, quantity: 0, areaM2: 0, updateMode: 'add', areaM2ForFixed: 0 });
    setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    // Modal kapandığında body scroll'u geri aç
    document.body.style.overflow = 'auto';
  };

  // Ürün tipini belirleme fonksiyonu
  const getProductType = (sizeOptions: SizeOption[]) => {
    if (sizeOptions.length === 0) return 'unknown';

    const hasOptionalHeight = sizeOptions.some(so => so.is_optional_height === true);

    if (hasOptionalHeight) {
      return 'optional_height';
    } else {
      return 'fixed_size';
    }
  };

  // m²'den adet hesaplama fonksiyonu
  const calculateQuantityFromArea = (areaM2: number, pieceAreaM2: number): number => {
    if (pieceAreaM2 <= 0) return 0;
    return Math.floor(areaM2 / pieceAreaM2);
  };

  const handleSizeOptionChange = (sizeOption: SizeOption) => {
    setSelectedSizeOption(sizeOption);

    const productType = getProductType(selectedProduct?.sizeOptions || []);

    if (productType === 'optional_height') {
      // Opsiyonel yükseklik: m² bazlı
      setStockForm(prev => ({
        ...prev,
        width: sizeOption.width,
        height: 10000, // Opsiyonel ürünlerde height sabit 10000
        quantity: 0,
        areaM2: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      }));
      setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    } else {
      // Hazır kesim: adet bazlı
      setStockForm(prev => ({
        ...prev,
        width: sizeOption.width,
        height: sizeOption.height,
        quantity: 0,
        areaM2: 0,
        areaM2ForFixed: 0,
        updateMode: 'add' // Varsayılan olarak ekleme modu
      }));
      setInputValues({ height: '', areaM2: '', quantity: '', areaM2ForFixed: '' });
    }
  };

  const updateStock = async () => {
    if (!selectedProduct || !token) {
      console.error('updateStock: selectedProduct veya token eksik', {
        selectedProduct: !!selectedProduct,
        token: !!token
      });
      return;
    }

    if (!selectedProduct.productId) {
      console.error('❌ KRITIK HATA: Product ID undefined!', {
        selectedProduct: selectedProduct,
        productId: selectedProduct.productId
      });
      alert('Ürün ID\'si bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
      return;
    }

    // Editör kullanıcılar sadece 'add' modunu kullanabilir
    if (!isAdmin && stockForm.updateMode === 'set') {
      alert('Bu işlem için yetkiniz bulunmuyor! Sadece stok ekleme yapabilirsiniz.');
      return;
    }

    const productType = getProductType(selectedProduct.sizeOptions || []);
    let apiUrl: string;
    let requestBody: any;

    if (productType === 'optional_height') {
      // Opsiyonel yükseklik: m² bazlı stok işlemi
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock-area`;

      if (stockForm.width <= 0 || stockForm.height <= 0 || (stockForm.areaM2 || 0) < 0) {
        alert('Lütfen geçerli boyut ve m² değerleri girin!');
        return;
      }

      let finalAreaM2 = stockForm.areaM2 || 0;
      
      if (stockForm.updateMode === 'add' && selectedSizeOption) {
        // EKLEME MODU: Mevcut stok + eklenen miktar
        const currentStock = selectedSizeOption.stockAreaM2 || 0;
        finalAreaM2 = currentStock + (stockForm.areaM2 || 0);
        console.log('🔄 Stok Ekleme - M²:', {
          mode: stockForm.updateMode,
          currentStock,
          addingAmount: stockForm.areaM2,
          finalAmount: finalAreaM2
        });
      } else if (stockForm.updateMode === 'set') {
        // GÜNCELLEME MODU: Direkt yazılan değer
        finalAreaM2 = stockForm.areaM2 || 0;
        console.log('🔄 Stok Güncelleme - M²:', {
          mode: stockForm.updateMode,
          newValue: finalAreaM2
        });
      }

      requestBody = {
        width: stockForm.width,
        height: 10000,
        areaM2: finalAreaM2,
        updateMode: stockForm.updateMode
      };
    } else {
      // Hazır kesim: adet bazlı stok işlemi
      apiUrl = `${API_BASE_URL}/api/products/${selectedProduct.productId}/stock`;

      if (stockForm.width <= 0 || stockForm.height <= 0 || stockForm.quantity < 0) {
        alert('Lütfen geçerli boyut ve adet değerleri girin!');
        return;
      }

      let finalQuantity = stockForm.quantity;
      
      if (stockForm.updateMode === 'add') {
        // EKLEME MODU: Mevcut stok + eklenen miktar
        let currentStock = 0;
        
        if (selectedSizeOption) {
          // Size option kullanılan durum
          currentStock = selectedSizeOption.stockQuantity || 0;
        } else if (selectedProduct.variations && selectedProduct.variations.length > 0) {
          // Variations kullanılan durum - aynı boyuttaki variation'ı bul
          const matchingVariation = selectedProduct.variations.find(
            v => v.width === stockForm.width && v.height === stockForm.height
          );
          currentStock = matchingVariation?.stockQuantity || 0;
        }
        
        finalQuantity = currentStock + stockForm.quantity;
        console.log('🔄 Stok Ekleme - Adet:', {
          mode: stockForm.updateMode,
          currentStock,
          addingAmount: stockForm.quantity,
          finalAmount: finalQuantity,
          hasSelectedOption: !!selectedSizeOption,
          hasVariations: selectedProduct.variations?.length > 0
        });
      } else if (stockForm.updateMode === 'set') {
        // GÜNCELLEME MODU: Direkt yazılan değer
        finalQuantity = stockForm.quantity;
        console.log('🔄 Stok Güncelleme - Adet:', {
          mode: stockForm.updateMode,
          newValue: finalQuantity
        });
      }

      requestBody = {
        width: stockForm.width,
        height: stockForm.height,
        quantity: finalQuantity,
        updateMode: stockForm.updateMode
      };
    }

    setIsUpdatingStock(true);
    
    console.log('📤 API İsteği:', {
      url: apiUrl,
      method: 'PATCH',
      body: requestBody,
      mode: stockForm.updateMode,
      productType
    });
    
    try {
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        try {
          const data: StockUpdateResponse = await response.json();

          if (data.success) {
            setProducts(prevProducts =>
              prevProducts.map(product =>
                product.productId === selectedProduct.productId
                  ? data.data
                  : product
              )
            );

            setSelectedProduct(data.data);

            // Seçili boyut seçeneğini de güncelle
            if (selectedSizeOption && data.data.sizeOptions) {
              const updatedSizeOption = data.data.sizeOptions.find(
                (option: SizeOption) => option.id === selectedSizeOption.id
              );
              if (updatedSizeOption) {
                setSelectedSizeOption(updatedSizeOption);
                console.log('🔄 SizeOption güncellendi:', {
                  oldStock: selectedSizeOption.is_optional_height 
                    ? selectedSizeOption.stockAreaM2 
                    : selectedSizeOption.stockQuantity,
                  newStock: updatedSizeOption.is_optional_height 
                    ? updatedSizeOption.stockAreaM2 
                    : updatedSizeOption.stockQuantity
                });
              }
            }

            setStockForm(prev => ({
              ...prev,
              quantity: 0,
              areaM2: 0,
              areaM2ForFixed: 0
            }));

            // Input değerlerini de sıfırla
            setInputValues({
              height: '',
              areaM2: '',
              quantity: '',
              areaM2ForFixed: ''
            });

            const successMessage = stockForm.updateMode === 'add' 
              ? `Stok başarıyla eklendi! (${productType === 'optional_height' ? `+${stockForm.areaM2} m²` : `+${stockForm.quantity} adet`})`
              : `Stok başarıyla güncellendi! (${productType === 'optional_height' ? `${stockForm.areaM2} m²` : `${stockForm.quantity} adet`})`;
            alert(successMessage);
          } else {
            console.error('API success false:', data.message);
            alert(`Stok güncellenirken hata oluştu: ${data.message || 'Bilinmeyen hata'}`);
          }
        } catch (parseError) {
          console.error('JSON parse hatası:', parseError);
          alert('Sunucu yanıtı işlenirken hata oluştu!');
        }
      } else {
        const errorText = await response.text();
        console.error('HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          response: errorText
        });

        if (response.status === 404) {
          alert('Ürün bulunamadı! Lütfen sayfayı yenileyip tekrar deneyin.');
        } else if (response.status === 401) {
          alert('Yetkilendirme hatası! Lütfen tekrar giriş yapın.');
        } else if (response.status === 403) {
          alert('Bu işlem için yetkiniz bulunmuyor!');
        } else {
          alert(`Stok güncellenirken hata oluştu! Status: ${response.status}, Mesaj: ${errorText}`);
        }
      }
    } catch (error) {
      console.error('=== NETWORK/FETCH ERROR ===');
      console.error('Error details:', error);
      alert('Ağ hatası! Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const getTotalStock = (product: Product) => {
    let total = 0;

    if (product.sizeOptions && Array.isArray(product.sizeOptions)) {
      total += product.sizeOptions.reduce((sum, option) => sum + (option.stockQuantity || 0), 0);
    }

    if (product.variations && Array.isArray(product.variations)) {
      total += product.variations.reduce((sum, variation) => sum + (variation.stockQuantity || 0), 0);
    }

    return total;
  };

  // Auth yüklenirken loading göster
  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
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

  if (isLoading || !user) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#00365a]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#00365a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Sistem Yükleniyor</h3>
              <p className="text-sm text-gray-500 mt-1">Lütfen bekleyiniz...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin veya Editör olmayan kullanıcılar için erişim engeli
  if (!isAdminOrEditor) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Erişim Reddedildi</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">Bu sayfaya erişim yetkiniz bulunmamaktadır. Stok yönetimi sadece admin ve editör kullanıcılar tarafından kullanılabilir.</p>
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
              <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Stok Yönetimi
          </h1>
          <p className="text-gray-600 mt-2">Ürün stoklarını görüntüleyin ve güncelleyin</p>
        </div>

        {/* Ürünler Listesi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#00365a]">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-lg font-semibold text-white">Tüm Ürünler</h2>
            </div>
          </div>

          {/* Arama ve Filtreler */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-4">
              <div className="w-full md:w-auto">
                <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                  Ara
                </label>
                <div className="relative">
                  <input
                    id="search-input"
                    type="text"
                    className="w-full md:w-80 lg:w-96 border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 text-sm"
                    placeholder="Ürün adı, açıklama veya ID ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>

              {search && (
                <div className="w-full md:w-auto flex items-end">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                    onClick={() => setSearch("")}
                  >
                    Filtreleri Temizle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            {isLoadingProducts ? (
              <LoadingSpinner />
            ) : products.length > 0 ? (
              <>
                {/* Arama Sonuçları Bilgisi */}
                {searchTerm && pagination && (
                  <div className="mb-4 p-3 border-b text-sm text-gray-600 bg-blue-50 rounded-lg">
                    <span className="font-medium">{pagination.total}</span> adet ürün bulundu
                    {searchTerm && <span> (arama: <span className="italic">"{searchTerm}"</span>)</span>}
                    <span className="ml-2 text-xs text-gray-500">
                      (Sayfa {pagination.page}/{pagination.totalPages})
                    </span>
                  </div>
                )}

                {/* Desktop Tablo Görünümü */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[800px] table-auto divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/2">
                          Ürün
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                          Koleksiyon
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-1/4">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => (
                        <tr key={product.productId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-14 w-14 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden shadow-sm">
                                {product.productImage ? (
                                  <img
                                    src={product.productImage}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                    <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">{product.description}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</div>
                            <div className="text-sm text-gray-500">{product.collection?.code || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => openStockModal(product)}
                              disabled={isLoadingProductDetail}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoadingProductDetail ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                  <span>Yükleniyor...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                  <span>{isAdmin ? 'Stok Yönetimi' : 'Stok Ekle'}</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobil Kart Görünümü */}
                <div className="md:hidden space-y-4">
                  {products.map((product) => (
                    <div key={product.productId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-start space-x-4">
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                          {product.productImage ? (
                            <img
                              src={product.productImage}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{product.name}</div>
                          <div className="text-sm text-gray-500 truncate">{product.description}</div>
                          <div className="mt-1">
                            <span className="text-xs font-medium text-gray-900">{product.collection?.name || 'Koleksiyon Yok'}</span>
                            <span className="text-xs text-gray-500 ml-2">{product.collection?.code || '-'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => openStockModal(product)}
                          disabled={isLoadingProductDetail}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-[#00365a] hover:bg-[#004170] text-white rounded-md text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingProductDetail ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                              <span>...</span>
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span>{isAdmin ? 'Yönet' : 'Ekle'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    searchTerm={searchTerm}
                  />
                )}
              </>
            ) : (
              <div className="py-16 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-600">Ürün bulunamadı</p>
                <p className="mt-2 text-gray-500">
                  {searchTerm && 'Arama kriterlerinize uygun ürün bulunamadı. '}
                  Lütfen farklı filtreler deneyin.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Gelişmiş Stok Ayarlama Modalı */}
        {isModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 overflow-y-auto">
            <div className="min-h-screen px-2 py-4 flex items-center justify-center">
              <div className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-[#00365a] to-[#004170] text-white px-6 py-6 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="bg-white bg-opacity-20 rounded-xl p-3">
                          <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">
                            {isAdmin ? 'Stok Yönetimi' : 'Stok Ekle'}: {selectedProduct.name}
                          </h3>
                          <p className="text-blue-100 text-sm mt-1">
                            Koleksiyon: {selectedProduct.collection?.name || 'Koleksiyon Yok'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={closeStockModal}
                      className="ml-4 text-blue-100 hover:text-white p-3 hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Boyut Seçimi */}
                    {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                          <h4 className="text-lg font-semibold text-gray-800">Boyut Seçeneği</h4>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {selectedProduct.sizeOptions.map((option) => (
                            <div
                              key={option.id}
                              onClick={() => handleSizeOptionChange(option)}
                              className={`cursor-pointer border-2 rounded-lg p-3 transition-all duration-200 min-h-[120px] flex flex-col justify-between ${selectedSizeOption?.id === option.id
                                  ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                                }`}
                            >
                              <div className="text-center flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="font-bold text-sm text-gray-900 mb-1">
                                    {option.width} × {option.height}
                                  </div>
                                  <div className="text-xs text-gray-500">cm</div>
                                </div>

                                <div className={`text-xs font-medium px-2 py-1 rounded-full mx-auto my-2 ${option.is_optional_height
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700'
                                  }`}>
                                  {option.is_optional_height ? 'Ops.' : 'Hazır'}
                                </div>

                                <div className="bg-gray-100 rounded py-1 px-2">
                                  <div className="text-xs text-gray-600">Stok</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {option.is_optional_height
                                      ? `${(option.stockAreaM2 || 0).toFixed(1)} m²`
                                      : `${option.stockQuantity || 0} adet`
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Manuel boyut girişi */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Genişlik (cm)
                          </label>
                          <input
                            type="number"
                            value={stockForm.width}
                            onChange={(e) => setStockForm(prev => ({ ...prev, width: e.target.value === '' ? 0 : Number(e.target.value) }))}
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Genişlik"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Yükseklik (cm)
                          </label>
                          <input
                            type="number"
                            value={stockForm.height}
                            onChange={(e) => setStockForm(prev => ({ ...prev, height: e.target.value === '' ? 0 : Number(e.target.value) }))}
                            className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Yükseklik"
                            min="1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Mod seçimi - Admin için seçim, Editör için bilgi */}
                    {isAdmin ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div
                            onClick={() => setStockForm(prev => ({ ...prev, updateMode: 'add' }))}
                            className={`cursor-pointer border-2 rounded-lg p-4 transition-all duration-200 ${stockForm.updateMode === 'add'
                                ? 'border-green-500 bg-green-500 text-white shadow-lg ring-2 ring-green-200'
                                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50 hover:shadow-md'
                              }`}
                          >
                            <div className="text-center">
                              <div className={`font-bold text-sm mb-1 ${stockForm.updateMode === 'add' ? 'text-white' : 'text-gray-900'}`}>
                                Stok Ekleme
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() => {
                              if (isAdmin) {
                                setStockForm(prev => ({ ...prev, updateMode: 'set' }))
                              }
                            }}
                            className={`${isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} border-2 rounded-lg p-4 transition-all duration-200 ${stockForm.updateMode === 'set'
                                ? 'border-blue-500 bg-blue-500 text-white shadow-lg ring-2 ring-blue-200'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
                              }`}
                          >
                            <div className="text-center">
                              <div className={`font-bold text-sm mb-1 ${stockForm.updateMode === 'set' ? 'text-white' : 'text-gray-900'}`}>
                                Stok Güncelleme
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )}

                    {/* Stok Ayarlama Formu - Ürün Tipine Göre */}
                    {selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 && (
                      (() => {
                        const productType = getProductType(selectedProduct.sizeOptions);
                        const isOptionalHeight = productType === 'optional_height';

                        return (
                          <div className="bg-white border border-gray-200 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <h4 className="text-lg font-semibold text-gray-800">
                                {stockForm.updateMode === 'add' 
                                  ? (isOptionalHeight ? 'Eklenecek Stok (m²)' : 'Eklenecek Stok (Adet)') 
                                  : (isOptionalHeight ? 'Yeni Stok Değeri (m²)' : 'Yeni Stok Değeri (Adet)')
                                }
                              </h4>
                            </div>
                            {isOptionalHeight ? (
                              <div className="space-y-3">
                                {/* Boy girişi */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Boy (cm):
                                  </label>
                                  <p className="text-xs text-gray-500 mb-2">
                                    Opsiyonel yükseklik ürünlerde boy değeri girin. m² otomatik hesaplanacaktır.
                                  </p>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={inputValues.height}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    onChange={(e) => {
                                      const heightValue = e.target.value;
                                      const height = heightValue === '' ? 0 : Math.max(0, Number(heightValue));
                                      setInputValues(prev => ({ ...prev, height: heightValue }));
                                      setStockForm(prev => ({
                                        ...prev,
                                        height: height,
                                        quantity: 0
                                      }));
                                    }}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Boy değeri (cm)"
                                  />
                                </div>

                                {/* m² girişi */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    m² (Manuel giriş için):
                                  </label>
                                  <p className="text-xs text-gray-500 mb-2">
                                    Boy değiştiğinde m² otomatik hesaplanır. Manuel giriş yapabilirsiniz.
                                  </p>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={inputValues.areaM2}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    onChange={(e) => {
                                      const areaM2Value = e.target.value;
                                      const areaM2 = areaM2Value === '' ? 0 : Math.max(0, Number(areaM2Value));
                                      setInputValues(prev => ({ ...prev, areaM2: areaM2Value }));
                                      setStockForm(prev => ({
                                        ...prev,
                                        areaM2: areaM2,
                                        quantity: 0
                                      }));
                                    }}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Manuel m² girişi"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Adet girişi */}
                                <div>
                                  <input
                                    type="number"
                                    min="0"
                                    value={inputValues.quantity}
                                    onChange={(e) => {
                                      const quantityValue = e.target.value;
                                      const quantity = quantityValue === '' ? 0 : Math.max(0, Number(quantityValue));
                                      setInputValues(prev => ({ ...prev, quantity: quantityValue }));
                                      setStockForm(prev => ({
                                        ...prev,
                                        quantity: quantity,
                                        areaM2: 0,
                                        areaM2ForFixed: 0
                                      }));
                                    }}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Eklenecek stok miktarı"
                                  />
                                </div>

                                {/* m² girişi */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Eklenecek Stok (m²) - Adet olarak hesaplanır:
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={inputValues.areaM2ForFixed}
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    onChange={(e) => {
                                      const areaM2Value = e.target.value;
                                      const areaM2 = areaM2Value === '' ? 0 : Math.max(0, Number(areaM2Value));
                                      const calculatedQuantity = calculateQuantityFromArea(areaM2, selectedSizeOption?.pieceAreaM2 || 0);
                                      setInputValues(prev => ({ ...prev, areaM2ForFixed: areaM2Value }));
                                      setStockForm(prev => ({
                                        ...prev,
                                        areaM2ForFixed: areaM2,
                                        quantity: calculatedQuantity,
                                        areaM2: 0
                                      }));
                                    }}
                                    className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Eklenecek stok m² miktarı"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}

                    {/* Manuel boyut için miktar */}
                    {(!selectedProduct.sizeOptions || selectedProduct.sizeOptions.length === 0) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {stockForm.updateMode === 'add' ? 'Eklenecek Stok (Adet):' : 'Yeni Stok Değeri (Adet):'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={inputValues.quantity}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          onChange={(e) => {
                            const quantityValue = e.target.value;
                            const quantity = quantityValue === '' ? 0 : Math.max(0, Number(quantityValue));
                            setInputValues(prev => ({ ...prev, quantity: quantityValue }));
                            setStockForm(prev => ({
                              ...prev,
                              quantity: quantity,
                              areaM2: 0
                            }));
                          }}
                          className="w-full px-3 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={stockForm.updateMode === 'add' ? 'Eklenecek stok miktarı' : 'Yeni stok değeri'}
                        />
                      </div>
                    )}

                    {/* Seçilen boyut özeti */}
                    {selectedSizeOption && (
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
                        <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                          📋 İşlem Özeti
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Seçilen boyut:</span>
                            <span className="ml-1 text-gray-900">{stockForm.width}x{stockForm.height} cm</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Ürün tipi:</span>
                            <span className="ml-1 text-gray-900">
                              {selectedSizeOption.is_optional_height ? 'Opsiyonel Yükseklik' : 'Hazır Kesim'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Mevcut stok:</span>
                            <span className="ml-1 text-gray-900">
                              {selectedSizeOption.is_optional_height
                                ? `${(selectedSizeOption.stockAreaM2 || 0).toFixed(1)} m²`
                                : `${selectedSizeOption.stockQuantity || 0} adet`
                              }
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              {stockForm.updateMode === 'add' ? 'Eklenecek:' : 'Yeni değer:'}
                            </span>
                            <span className="ml-1 text-gray-900">
                              {selectedSizeOption.is_optional_height
                                ? `${stockForm.areaM2 || 0} m² (${stockForm.width}x${stockForm.height} cm)`
                                : `${stockForm.quantity} adet`
                              }
                            </span>
                          </div>
                          {!selectedSizeOption.is_optional_height && stockForm.areaM2ForFixed && stockForm.areaM2ForFixed > 0 && (
                            <div>
                              <span className="font-medium text-gray-700">Hesaplanan:</span>
                              <span className="ml-1 text-blue-600">
                                {stockForm.areaM2ForFixed} m² = {stockForm.quantity} adet
                              </span>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={closeStockModal}
                      className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      ❌ İptal
                    </button>
                    <button
                      onClick={updateStock}
                      disabled={
                        isUpdatingStock ||
                        stockForm.width <= 0 ||
                        stockForm.height <= 0 ||
                        (selectedProduct.sizeOptions && selectedProduct.sizeOptions.length > 0 ?
                          (getProductType(selectedProduct.sizeOptions) === 'optional_height' ?
                            (stockForm.areaM2 || 0) < 0 :
                            stockForm.quantity < 0
                          ) :
                          stockForm.quantity < 0
                        )
                      }
                      className="w-full sm:w-auto px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-600 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                    >
                      {isUpdatingStock ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Güncelleniyor...
                        </span>
                      ) : (
                        stockForm.updateMode === 'add' ? '✅ Stok Ekle' : '✅ Stok Güncelle'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
} 