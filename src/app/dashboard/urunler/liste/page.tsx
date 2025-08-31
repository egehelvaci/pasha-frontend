"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { FaTrash } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';
import { getProductRules, ProductRule } from '@/services/api';
import { useToken } from '@/app/hooks/useToken';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

// Sayfalama Komponenti
const Pagination = ({ pagination, onPageChange, searchTerm = '', collectionId = '' }: {
  pagination: any;
  onPageChange: (page: number, search?: string, collection?: string) => void;
  searchTerm?: string;
  collectionId?: string;
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    if (searchTerm) params.set('search', searchTerm);
    if (collectionId) params.set('collection', collectionId);
    
    router.push(`/dashboard/urunler/liste?${params.toString()}`);
    onPageChange(page, searchTerm, collectionId);
  };

  if (!pagination || pagination.totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, pagination.page - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center space-x-2 py-6">
      <button
        onClick={() => handlePageChange(pagination.page - 1)}
        disabled={pagination.page <= 1}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Önceki
      </button>
      
      {startPage > 1 && (
        <>
          <button
            onClick={() => handlePageChange(1)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            1
          </button>
          {startPage > 2 && (
            <span className="px-2 text-gray-500">...</span>
          )}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          className={`px-3 py-2 border rounded-md text-sm font-medium ${
            page === pagination.page
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      {endPage < pagination.totalPages && (
        <>
          {endPage < pagination.totalPages - 1 && (
            <span className="px-2 text-gray-500">...</span>
          )}
          <button
            onClick={() => handlePageChange(pagination.totalPages)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {pagination.totalPages}
          </button>
        </>
      )}
      
      <button
        onClick={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page >= pagination.totalPages}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Sonraki
      </button>
    </div>
  );
};

// Loading Spinner Komponenti
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Responsive sayfa boyutu fonksiyonu
const getPageSize = () => {
  if (typeof window !== 'undefined') {
    const width = window.innerWidth;
    if (width < 768) return 12; // Mobile
    if (width < 1024) return 15; // Tablet
    if (width < 1280) return 18; // Small desktop
    return 24; // Large desktop
  }
  return 24; // Default
};

export default function ProductList() {
  const token = useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  // URL'den parametreleri al
  const urlPage = parseInt(searchParams.get('page') || '1');
  const urlSearch = searchParams.get('search') || '';
  const urlCollection = searchParams.get('collection') || '';
  
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [search, setSearch] = useState(urlSearch);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("id_asc");
  const [collections, setCollections] = useState<{collectionId: string, name: string}[]>([]);
  const [selectedCollection, setSelectedCollection] = useState(urlCollection);
  const [stockFilter, setStockFilter] = useState("all");
  const productsFetchedRef = useRef(false);
  const collectionsFetchedRef = useRef(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverProductId, setHoverProductId] = useState<string | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedProductForUpdate, setSelectedProductForUpdate] = useState<any>(null);
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const { isAdmin, isAdminOrEditor } = useAuth();
  
  // Custom dropdown state'leri
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [collectionFilterDropdownOpen, setCollectionFilterDropdownOpen] = useState(false);
  const [stockFilterDropdownOpen, setStockFilterDropdownOpen] = useState(false);
  
  // Debounce timer için ref
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Stok kontrolü kaldırıldı - artık tüm ürünler stokta varsayılıyor
  const hasStock = (): boolean => {
    return true; // Her zaman true döndür
  };

  // Sıralama için frontend-side sıralama (sayfalı veri olduğu için)
  const sortedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case "id_asc":
          return a.productId.localeCompare(b.productId);
        case "id_desc":
          return b.productId.localeCompare(a.productId);
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [products, sortBy]);

  // Stok filtresine göre ürünleri filtrele
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter(product => {
      if (stockFilter === "all") return true;
      if (stockFilter === "inStock") return hasStock();
      if (stockFilter === "outOfStock") return !hasStock();
      return true;
    });
  }, [sortedProducts, stockFilter]);

  // URL parametreleri değiştiğinde state'leri güncelle
  useEffect(() => {
    setCurrentPage(urlPage);
    setSearch(urlSearch);
    setSearchTerm(urlSearch);
    setSelectedCollection(urlCollection);
  }, [urlPage, urlSearch, urlCollection]);

  useEffect(() => {
    if (!productsFetchedRef.current) {
      productsFetchedRef.current = true;
      // URL'den gelen parametrelerle ilk yükleme
      fetchProducts(urlPage, urlSearch, urlCollection);
    }
    
    if (!collectionsFetchedRef.current) {
      collectionsFetchedRef.current = true;
      fetchCollections();
    }
    
    fetchProductRules();
  }, [urlPage, urlSearch, urlCollection]);

  // Dropdown'ların dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setSortDropdownOpen(false);
        setCollectionFilterDropdownOpen(false);
        setStockFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Arama değiştiğinde debounce ile API çağrısı
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(search);
      // Sadece kullanıcı arama yaptığında sayfa 1'e dön
      if (search !== urlSearch) {
        setCurrentPage(1);
        fetchProducts(1, search, selectedCollection);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, urlSearch, selectedCollection]);

  // Koleksiyon filtresi değiştiğinde
  useEffect(() => {
    // Sadece kullanıcı koleksiyon değiştirdiğinde sayfa 1'e dön
    if (selectedCollection !== urlCollection) {
      setCurrentPage(1);
      fetchProducts(1, searchTerm, selectedCollection);
    }
  }, [selectedCollection, urlCollection, searchTerm]);

  // Stok filtresi değiştiğinde
  useEffect(() => {
    if (stockFilter === "all") {
      // Stok filtresi "all" ise mevcut sayfa ve parametrelerle çalış
      fetchProducts(currentPage, searchTerm, selectedCollection);
    } else {
      // Stok filtresi aktifse tüm ürünleri getir
      fetchAllProducts(searchTerm, selectedCollection);
    }
  }, [stockFilter, currentPage, searchTerm, selectedCollection]);

  // Tüm ürünleri getiren fonksiyon (stok filtresi için)
  const fetchAllProducts = async (searchQuery: string = '', collectionId: string = '') => {
    try {
      setLoading(true);
      const authToken = token;
      
      const params = new URLSearchParams({
        limit: '1000', // Tüm ürünleri getir
        page: '1',
        ...(searchQuery && { search: searchQuery }),
        ...(collectionId && { collectionId: collectionId })
      });
      
      const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.data);
        setPagination(null); // Sayfalama bilgisini temizle
        setCurrentPage(1);
      } else {
        console.error('Ürünler yüklenemedi:', result.message);
        setProducts([]);
        setPagination(null);
      }
    } catch (error) {
      console.error('API hatası:', error);
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  // Optimizasyonlu ürün getirme fonksiyonu
  const fetchProducts = async (page: number = 1, searchQuery: string = '', collectionId: string = '') => {
    try {
      setLoading(true);
      const authToken = token;
      const limit = getPageSize();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(collectionId && { collectionId: collectionId })
      });
      
      const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setProducts(result.data);
        setPagination(result.pagination); // Yeni pagination bilgisi
        setCurrentPage(page);
      } else {
        console.error('Ürünler yüklenemedi:', result.message);
        setProducts([]);
        setPagination(null);
      }
    } catch (error) {
      console.error('API hatası:', error);
      setProducts([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCollections(data.data.map((col: any) => ({ 
          collectionId: col.collectionId, 
          name: col.name 
        })));
      } else {
        setCollections([]);
      }
    } catch (error) {
      setCollections([]);
    }
  };

  const fetchProductRules = async () => {
    try {
      console.log('🔄 Ürün kuralları çekiliyor...');
      const rules = await getProductRules();
      console.log('✅ Ürün kuralları başarıyla çekildi:', rules);
      setProductRules(rules);
    } catch (error) {
      console.error('❌ Ürün kuralları yüklenirken hata:', error);
      setProductRules([]);
    }
  };

  // Sayfa değişikliği handler'ı
  const handlePageChange = (newPage: number, search: string = searchTerm, collectionId: string = selectedCollection) => {
    setCurrentPage(newPage);
    fetchProducts(newPage, search, collectionId);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${deleteId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Ürün silinemedi");
      
      // Silme başarılıysa mevcut sayfayı yenile
      fetchProducts(currentPage, searchTerm, selectedCollection);
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  function AddProductModal({ open, onClose, onSuccess, collections, productRules }: { open: boolean, onClose: () => void, onSuccess: (newProduct: any) => void, collections: {collectionId: string, name: string}[], productRules: ProductRule[] }) {
    const [form, setForm] = useState({
      name: "",
      description: "",
      collectionId: "",
      rule_id: "",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Custom dropdown state'leri
    const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
    const [ruleDropdownOpen, setRuleDropdownOpen] = useState(false);
    
    // Modal açıkken body scroll'unu engelle
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup function
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "file") {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        handleImageFile(file);
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleImageFile = (file: File | null) => {
      setForm({ ...form, productImage: file });
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
        } else {
          setError("Lütfen sadece resim dosyası yükleyin");
        }
      }
    };

    const removeImage = () => {
      setForm({ ...form, productImage: null });
      setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Validasyon
      if (!form.name.trim()) {
        setError("Ürün adı zorunludur");
        return;
      }
      if (!form.description.trim()) {
        setError("Ürün açıklaması zorunludur");
        return;
      }
      if (!form.collectionId) {
        setError("Koleksiyon seçimi zorunludur");
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const authToken = token;
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('collectionId', form.collectionId);
        
        if (form.rule_id) {
          const ruleIdNumber = parseInt(form.rule_id);
          if (!isNaN(ruleIdNumber)) {
            fd.append('rule_id', ruleIdNumber.toString());
          }
        }
        
        if (form.productImage) {
          fd.append('productImage', form.productImage);
        }
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Ürün eklenemedi");
        }
        
        onSuccess(data.data);
        onClose();
        
        // Formu sıfırla
        setForm({
          name: "",
          description: "",
          collectionId: "",
          rule_id: "",
          productImage: null
        });
        setImagePreview(null);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (!open) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-6xl shadow-lg relative overflow-y-auto max-h-[90vh]">
          <button 
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl" 
            onClick={onClose}
          >
            &times;
          </button>
          
          <h2 className="text-xl font-bold mb-6 text-black">Yeni Ürün Ekle</h2>
          
          <div className="flex gap-6">
            {/* Sol taraf - Form */}
            <div className="w-1/2">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Adı <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                    placeholder="Ürün adını girin"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Açıklaması <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 min-h-[100px]"
                    placeholder="Ürün açıklamasını girin"
                  />
                </div>
                
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Koleksiyon <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                    >
                      <span className={form.collectionId ? "text-gray-900" : "text-gray-500"}>
                        {form.collectionId 
                          ? collections.find(col => col.collectionId === form.collectionId)?.name || "Koleksiyon Seçin"
                          : "Koleksiyon Seçin"
                        }
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
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !form.collectionId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setForm({ ...form, collectionId: "" });
                            setCollectionDropdownOpen(false);
                          }}
                        >
                          Koleksiyon Seçin
                        </div>
                  {collections.map(col => (
                          <div
                            key={col.collectionId}
                            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                              form.collectionId === col.collectionId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                            }`}
                            onClick={() => {
                              setForm({ ...form, collectionId: col.collectionId });
                              setCollectionDropdownOpen(false);
                            }}
                          >
                        {col.name}
                          </div>
                  ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kural ID
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setRuleDropdownOpen(!ruleDropdownOpen)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors text-left bg-white"
                    >
                      <span className={form.rule_id ? "text-gray-900" : "text-gray-500"}>
                        {form.rule_id 
                          ? productRules.find(rule => rule.id.toString() === form.rule_id) 
                              ? `${productRules.find(rule => rule.id.toString() === form.rule_id)?.id} - ${productRules.find(rule => rule.id.toString() === form.rule_id)?.name}`
                              : "Kural Seçin"
                          : "Kural Seçin"
                        }
                      </span>
                      <svg 
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${ruleDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {ruleDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto scrollbar-hide">
                        <div
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            !form.rule_id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            setForm({ ...form, rule_id: "" });
                            setRuleDropdownOpen(false);
                          }}
                        >
                          Kural Seçin
                        </div>
                        {productRules
                          .sort((a, b) => a.id - b.id) // ID'ye göre sırala
                          .map(rule => (
                            <div
                              key={rule.id}
                              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                form.rule_id === rule.id.toString() ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                              }`}
                              onClick={() => {
                                setForm({ ...form, rule_id: rule.id.toString() });
                                setRuleDropdownOpen(false);
                              }}
                            >
                        {rule.id} - {rule.name}
                            </div>
                    ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ürün Görseli
                  </label>
                  
                  {/* Drag & Drop Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : imagePreview 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      name="productImage"
                      onChange={handleChange}
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {imagePreview ? (
                                              <div className="space-y-3">
                        <div className="relative inline-block">
                          <Image 
                            src={imagePreview} 
                            alt="Önizleme" 
                            width={96}
                            height={96}
                            className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                        <div>
                          <p className="text-sm text-green-600 font-medium">✓ Görsel yüklendi</p>
                          <p className="text-xs text-gray-500">Değiştirmek için yeni bir dosya seçin</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="mx-auto w-12 h-12 text-gray-400">
                          <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-gray-600">
                            <span className="font-medium text-blue-600">Dosya seçmek için tıklayın</span> ya da sürükleyip bırakın
                          </p>
                          <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF - Max 10MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {error && (
                  <div className="text-red-500 text-sm mt-1">{error}</div>
                )}
                
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-70"
                  >
                  {loading ? "Ekleniyor..." : "Ekle"}
                </button>
                </div>
              </form>
            </div>
            
            {/* Sağ taraf - Kural Tablosu */}
            <div className="w-1/2">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kural ID Açıklamaları</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Kural Açıklaması</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {productRules.map(rule => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-medium text-blue-600">{rule.id}</td>
                          <td className="px-3 py-3">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{rule.name}</div>
                              <div className="text-xs text-gray-600">• {rule.canHaveFringe ? 'Saçaklı/Saçaksız seçenekler' : 'Saçak yok'}</div>
                              {rule.sizeOptions && rule.sizeOptions.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  • {rule.sizeOptions.some(size => size.isOptionalHeight) 
                                    ? 'Standart En + Opsiyonel Boy' 
                                    : rule.sizeOptions.length === 1 
                                      ? `Tek Ebat: ${rule.sizeOptions[0].width}×${rule.sizeOptions[0].height}` 
                                      : rule.sizeOptions.map(size => `${size.width}×${size.isOptionalHeight ? 'Ops' : size.height}`).join(', ')}
                                </div>
                              )}
                              {rule.cutTypes && rule.cutTypes.length > 0 && (
                                <div className="text-xs text-gray-600">
                                  • Kesim: {rule.cutTypes.map(cut => cut.name.charAt(0).toUpperCase() + cut.name.slice(1)).join(', ')}
                                </div>
                              )}
                              {rule.description && (
                                <div className="text-xs text-gray-600">• {rule.description}</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function ProductDetailModal({ open, onClose, productId }: { open: boolean, onClose: () => void, productId: string | null }) {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSize, setSelectedSize] = useState<any>(null);
    const [selectedCutType, setSelectedCutType] = useState<any>(null);
    const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [customHeight, setCustomHeight] = useState<number | string>(100);  // Varsayılan 100 cm yükseklik
    const [quantity, setQuantity] = useState<number>(1);
    const [notes, setNotes] = useState<string>("");
    const [addToCartLoading, setAddToCartLoading] = useState(false);
    const [addToCartSuccess, setAddToCartSuccess] = useState(false);
    const [addToCartError, setAddToCartError] = useState("");
    
    // Custom dropdown state'leri
    const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
    const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
    const [fringeDropdownOpen, setFringeDropdownOpen] = useState(false);
    
    const addToCartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Modal açıkken body scroll'unu engelle
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup function
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    // Dropdown'ların dışına tıklandığında kapanması
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container')) {
          setSizeDropdownOpen(false);
          setCutTypeDropdownOpen(false);
          setFringeDropdownOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    // Sepete ekleme başarılı mesajını 3 saniye sonra kaldır
    useEffect(() => {
      if (addToCartSuccess) {
        addToCartTimeoutRef.current = setTimeout(() => {
          setAddToCartSuccess(false);
        }, 3000);
      }
      
      return () => {
        if (addToCartTimeoutRef.current) {
          clearTimeout(addToCartTimeoutRef.current);
        }
      };
    }, [addToCartSuccess]);

    useEffect(() => {
      if (open && productId) {
        fetchProductDetail(productId);
      } else {
        setProduct(null);
        setLoading(false);
      }
    }, [open, productId]);

    // Ürün detayları değiştiğinde default seçimleri ayarla
    useEffect(() => {
      if (product) {
        // Default olarak ilk boyut seçeneğini seç
        if (product.sizeOptions && product.sizeOptions.length > 0) {
          setSelectedSize(product.sizeOptions[0]);
        }
        
        // Default olarak ilk kesim türünü seç
        if (product.cutTypes && product.cutTypes.length > 0) {
          setSelectedCutType(product.cutTypes[0]);
        }
        
        // Default saçak değerini ayarla
        setSelectedHasFringe(product.hasFringe);
      }
    }, [product]);
    
    // Seçimler değiştiğinde fiyat hesaplama
    useEffect(() => {
      const quantityNum = parseInt(quantity.toString()) || 0;
      if (product && selectedSize && quantityNum > 0) {
        // Metrekare hesapla
        let squareMeters;
        if (selectedSize.is_optional_height) {
          // İsteğe bağlı yükseklik için kullanıcının girdiği değeri kullan
          const heightValue = parseFloat(customHeight.toString()) || 100;
          squareMeters = (selectedSize.width * heightValue) / 10000; // cm² -> m²
        } else {
          // Sabit yükseklik için metrekare hesapla
          squareMeters = (selectedSize.width * selectedSize.height) / 10000; // cm² -> m²
        }
        
        // Birim fiyat ve toplam fiyat hesapla (quantity ile çarp)
        const unitPrice = product.pricing?.price || 0;
        const calculatedPrice = squareMeters * unitPrice * quantityNum;
        
        setTotalPrice(calculatedPrice);
      } else {
        setTotalPrice(0);
      }
    }, [product, selectedSize, customHeight, quantity]);

    const fetchProductDetail = async (id: string) => {
      setLoading(true);
      setError("");
      try {
        const authToken = token;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error("Ürün bulunamadı");
        const data = await res.json();
        setProduct(data.data || data);
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    // Boyut değişimi
    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sizeId = parseInt(e.target.value);
      const size = product.sizeOptions.find((s: any) => s.id === sizeId);
      setSelectedSize(size);
      
      // İsteğe bağlı yükseklik seçilince varsayılan değeri 100cm olarak ayarla
      if (size && size.is_optional_height) {
        setCustomHeight(100);
      }
    };
    
    // Kesim türü değişimi
    const handleCutTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const cutTypeId = parseInt(e.target.value);
      const cutType = product.cutTypes.find((c: any) => c.id === cutTypeId);
      setSelectedCutType(cutType);
    };
    
    // Saçak değişimi
    const handleFringeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedHasFringe(e.target.value === "true");
    };

    const addToCart = async () => {
      // Validasyon kontrolleri
      if (!product || !selectedSize || !selectedCutType) {
        setAddToCartError("Ürün detayları eksik");
        return;
      }
      
      const quantityNum = parseInt(quantity.toString()) || 0;
      if (quantityNum <= 0) {
        setAddToCartError("Lütfen geçerli bir miktar girin");
        return;
      }
      
      // Kesim türünü API isteğine uygun formata dönüştür
      let cutTypeValue = "rectangle"; // Varsayılan
      if (selectedCutType.name === "oval") {
        cutTypeValue = "oval";
      } else if (selectedCutType.name === "daire") {
        cutTypeValue = "round";
      } else if (selectedCutType.name === "custom") {
        cutTypeValue = "custom";
      } else if (selectedCutType.name === "post kesim") {
        cutTypeValue = "post kesim";
      }
      
      setAddToCartLoading(true);
      setAddToCartError("");
      setAddToCartSuccess(false);
      
      try {
        const authToken = token;
        
        // Yükseklik değerini belirle
        const heightValue = selectedSize.is_optional_height ? parseFloat(customHeight.toString()) || 100 : selectedSize.height;
        
        const requestBody = {
          productId: product.productId,
          quantity: quantityNum,
          width: selectedSize.width,
          height: heightValue,
          hasFringe: selectedHasFringe === true,
          cutType: cutTypeValue,
          notes: notes.trim() || undefined // Boşsa undefined olacak, API'ye gönderilmeyecek
        };
        
        const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          // Veritabanı bağlantı hatası için özel mesaj
          if (data.message && data.message.includes("too many clients")) {
            throw new Error("Sunucu şu anda yoğun. Lütfen daha sonra tekrar deneyin.");
          }
          throw new Error(data.message || "Ürün sepete eklenemedi");
        }
        
        // Başarılı
        setAddToCartSuccess(true);
        setQuantity(1); // Miktar sıfırla
        setNotes(""); // Notları temizle
      } catch (err: any) {
        setAddToCartError(err.message || "Sepete eklerken bir hata oluştu");
      } finally {
        setAddToCartLoading(false);
      }
    };

    if (!open) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-6xl shadow-lg relative overflow-hidden max-h-[90vh]">
          {/* Header */}
          <div className="bg-[#00365a] rounded-t-xl px-6 py-4 relative">
          <button 
              className="absolute top-3 right-3 text-white hover:text-gray-200 text-3xl font-bold" 
            onClick={onClose}
          >
            &times;
          </button>
          
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Sepete Ekle</h2>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-600">Ürün detayları yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500">{error}</div>
            </div>
          ) : product ? (
              <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-black">{product.collection?.name} - {product.name}</h1>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2">
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-50 rounded-lg border border-gray-200">
                    <Image 
                      src={product.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
                      alt={product.name} 
                      width={400}
                      height={300}
                      className="w-full h-full object-contain p-4" 
                    />
                  </div>
                  {/* Stok Durumu */}
                    {product.sizeOptions && product.sizeOptions.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Stok Durumu</h3>
                        <div className="space-y-2">
                          {product.sizeOptions.map((size: any, index: number) => {
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
                          <span className={selectedSize ? "text-gray-900" : "text-gray-500"}>
                            {selectedSize 
                              ? `${selectedSize.width}x${selectedSize.is_optional_height ? 'İsteğe Bağlı' : selectedSize.height} cm (Stok: ${selectedSize.is_optional_height ? `${(selectedSize.stockAreaM2 || 0).toFixed(1)} m²` : `${selectedSize.stockQuantity || 0} adet`})`
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
                                setSelectedSize(null);
                                setSizeDropdownOpen(false);
                              }}
                            >
                              Boyut Seçin
                            </div>
                        {product.sizeOptions?.map((size: any) => (
                              <div
                                key={size.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedSize?.id === size.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                                onClick={() => {
                                  setSelectedSize(size);
                                  setSizeDropdownOpen(false);
                                }}
                              >
                            {size.width}x{size.is_optional_height ? 'İsteğe Bağlı' : size.height} cm 
                                (Stok: {size.is_optional_height ? `${(size.stockAreaM2 || 0).toFixed(1)} m²` : `${size.stockQuantity || 0} adet`})
                              </div>
                        ))}
                          </div>
                        )}
                      </div>
                      
                      {selectedSize && selectedSize.is_optional_height && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-500 block mb-1">Özel Yükseklik (cm)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="10"
                              max="10000"
                              value={customHeight}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  setCustomHeight('');
                                } else {
                                  const numValue = Number(value);
                                  if (numValue >= 10) {
                                    setCustomHeight(numValue);
                                  } else if (value.length <= 1) {
                                    setCustomHeight(value);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === '' || Number(value) < 10) {
                                  setCustomHeight(100);
                                }
                              }}
                              className="border rounded-md p-2 text-black w-24"
                            />
                            <span className="text-sm text-gray-500">cm</span>
                          </div>
                          <span className="text-xs text-gray-500 block mt-1">
                            {selectedSize.width}x{customHeight} cm olarak hesaplanacak
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
                          <span className={selectedCutType ? "text-gray-900" : "text-gray-500"}>
                            {selectedCutType 
                              ? selectedCutType.name.charAt(0).toUpperCase() + selectedCutType.name.slice(1)
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
                                setSelectedCutType(null);
                                setCutTypeDropdownOpen(false);
                              }}
                            >
                              Kesim Türü Seçin
                            </div>
                        {product.cutTypes?.map((cutType: any) => (
                              <div
                                key={cutType.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedCutType?.id === cutType.id ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                                onClick={() => {
                                  setSelectedCutType(cutType);
                                  setCutTypeDropdownOpen(false);
                                }}
                              >
                            {cutType.name.charAt(0).toUpperCase() + cutType.name.slice(1)}
                              </div>
                        ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {product.canHaveFringe && (
                      <div className="flex flex-col gap-2 dropdown-container">
                        <span className="text-sm font-medium text-gray-700">Saçak</span>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setFringeDropdownOpen(!fringeDropdownOpen)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                          >
                            <span className={selectedHasFringe !== null ? "text-gray-900" : "text-gray-500"}>
                              {selectedHasFringe === true 
                                ? "Saçaklı"
                                : selectedHasFringe === false
                                ? "Saçaksız"
                                : "Saçak Seçin"
                              }
                            </span>
                            <svg 
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${fringeDropdownOpen ? 'rotate-180' : ''}`}
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          
                          {fringeDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              <div 
                                className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                onClick={() => {
                                  setSelectedHasFringe(null);
                                  setFringeDropdownOpen(false);
                                }}
                              >
                                Saçak Seçin
                              </div>
                              <div
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedHasFringe === true ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                                onClick={() => {
                                  setSelectedHasFringe(true);
                                  setFringeDropdownOpen(false);
                                }}
                              >
                                Saçaklı
                              </div>
                              <div
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedHasFringe === false ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                                onClick={() => {
                                  setSelectedHasFringe(false);
                                  setFringeDropdownOpen(false);
                                }}
                              >
                                Saçaksız
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Açıklama</span>
                      <p className="text-black">{product.description}</p>
                    </div>
                    
                    {user?.canSeePrice && (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-500">Metrekare Fiyatı</span>
                        <span className="font-medium text-black">
                          {product.pricing?.price} {product.pricing?.currency}/m²
                        </span>
                      </div>
                    )}
                    
                    {user?.canSeePrice && (
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-900">Toplam Tutar</span>
                          <span className="text-lg font-bold text-blue-900">
                            {totalPrice.toFixed(2)} {product.pricing?.currency}
                          </span>
                        </div>
                        {selectedSize && (
                          <div className="text-xs mt-1 text-blue-700">
                            {selectedSize.width} cm genişlik × 
                            {selectedSize.is_optional_height 
                              ? ` ${customHeight} cm yükseklik (özel)` 
                              : ` ${selectedSize.height} cm yükseklik`} 
                            × {quantity} adet için hesaplandı
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-5">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">Miktar</label>
                          <div className="flex">
                            <button 
                              type="button"
                              className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50"
                              onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                            >
                              -
                            </button>
                            <input 
                              type="number" 
                              min="1" 
                              value={quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  setQuantity(0);
                                } else {
                                  const numValue = parseInt(value);
                                  if (numValue >= 1) {
                                    setQuantity(numValue);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value === '' || parseInt(value) < 1) {
                                  setQuantity(1);
                                }
                              }}
                              className="w-16 border-y border-gray-300 py-1 px-2 text-center text-black"
                            />
                            <button 
                              type="button"
                              className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50"
                              onClick={() => setQuantity(quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-700">Özel Notlar (Opsiyonel)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Özel kesim notları veya diğer istekleriniz..."
                            className="w-full border border-gray-300 rounded-md p-2 text-black text-sm"
                            rows={3}
                          />
                        </div>
                        
                        {addToCartError && (
                          <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
                            {addToCartError}
                          </div>
                        )}
                        
                        {addToCartSuccess && (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-md text-green-600 text-sm">
                            Ürün başarıyla sepete eklendi!
                          </div>
                        )}
                        
                        <button
                          type="button"
                          className="mt-2 w-full py-3 bg-blue-900 text-white rounded-md font-semibold flex items-center justify-center disabled:opacity-70"
                          onClick={addToCart}
                          disabled={addToCartLoading}
                        >
                          {addToCartLoading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              İşleniyor...
                            </>
                          ) : (
                            "Sepete Ekle"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-black">Ürün bulunamadı</div>
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  function UpdateProductModal({ open, onClose, product, collections, productRules, onSuccess }: { open: boolean, onClose: () => void, product: any, collections: {collectionId: string, name: string}[], productRules: ProductRule[], onSuccess: (updatedProduct: any) => void }) {
    const [form, setForm] = useState({
      name: "",
      description: "",
      collectionId: "",
      rule_id: "",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    
    // Custom dropdown state'leri
    const [collectionDropdownOpen, setCollectionDropdownOpen] = useState(false);
    const [ruleDropdownOpen, setRuleDropdownOpen] = useState(false);
    
    // Modal açıkken body scroll'unu engelle
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      
      // Cleanup function
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    // Dropdown'ların dışına tıklandığında kapanması
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container')) {
          setCollectionDropdownOpen(false);
          setRuleDropdownOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    useEffect(() => {
      if (product) {
        setForm({
          name: product.name || "",
          description: product.description || "",
          collectionId: product.collectionId || "",
          rule_id: product.rule_id?.toString() || "",
          productImage: null
        });
        setImagePreview(null); // Yeni dosya yüklenene kadar önizleme gösterme
      }
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "file") {
        const file = (e.target as HTMLInputElement).files?.[0] || null;
        handleImageFile(file);
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleImageFile = (file: File | null) => {
      setForm({ ...form, productImage: file });
      
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
    };

    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
        } else {
          setError("Lütfen sadece resim dosyası yükleyin");
        }
      }
    };

    const removeImage = () => {
      setForm({ ...form, productImage: null });
      setImagePreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!product?.productId) {
        setError("Ürün ID'si bulunamadı");
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const authToken = token;
        const fd = new FormData();
        
        // Sadece değişen alanları gönder
        if (form.name !== product.name) {
          fd.append('name', form.name);
        }
        
        if (form.description !== product.description) {
          fd.append('description', form.description);
        }
        
        if (form.collectionId !== product.collectionId) {
          fd.append('collectionId', form.collectionId);
        }
        
        if (form.rule_id !== (product.rule_id?.toString() || "")) {
          if (form.rule_id && form.rule_id.trim() !== "") {
            const ruleIdNumber = parseInt(form.rule_id);
            if (!isNaN(ruleIdNumber)) {
              fd.append('rule_id', ruleIdNumber.toString());
            }
          } else {
            // Boş string gönder (rule_id'yi kaldırmak için)
            fd.append('rule_id', '');
          }
        }
        
        if (form.productImage) {
          fd.append('productImage', form.productImage);
        }
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: fd
        });
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Ürün güncellenemedi");
        }
        
        onSuccess(data.data);
        onClose();
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    const handleDelete = async () => {
      if (!product?.productId) return;
      
      setDeleteLoading(true);
      
      try {
        const authToken = token;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
          method: "DELETE",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error("Ürün silinemedi");
        
        onSuccess({ ...product, deleted: true });
        onClose();
      } catch (err: any) {
        setError(err.message || "Silme işlemi sırasında bir hata oluştu");
      } finally {
        setDeleteLoading(false);
        setShowDeleteConfirm(false);
      }
    };

    if (!open) return null;
    
    if (showDeleteConfirm) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">
            <h2 className="text-xl font-bold mb-4 text-black">Ürünü Sil</h2>
            <p className="text-gray-600 mb-6">
              <b>{product.name}</b> ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                İptal
              </button>
              <button 
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 text-red-500 text-sm">{error}</div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-6xl shadow-lg relative overflow-hidden max-h-[90vh]">
          {/* Header */}
          <div className="bg-[#00365a] rounded-t-xl px-6 py-4 relative">
            <button 
              className="absolute top-3 right-3 text-white hover:text-gray-200 text-3xl font-bold" 
              onClick={onClose}
            >
              &times;
            </button>
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Ürünü Düzenle</h2>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex gap-6">
              {/* Sol taraf - Form */}
              <div className="w-1/2">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Adı
                    </label>
                    <input 
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900"
                      placeholder="Ürün adını girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Açıklaması
                    </label>
                    <textarea 
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-900 min-h-[100px]"
                      placeholder="Ürün açıklamasını girin"
                    />
                  </div>
                  
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Koleksiyon
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCollectionDropdownOpen(!collectionDropdownOpen)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      >
                        <span className={form.collectionId ? "text-gray-900" : "text-gray-500"}>
                          {form.collectionId 
                            ? collections.find(col => col.collectionId === form.collectionId)?.name || "Koleksiyon Seçin"
                            : "Koleksiyon Seçin"
                          }
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
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div 
                            className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => {
                              setForm({ ...form, collectionId: "" });
                              setCollectionDropdownOpen(false);
                            }}
                          >
                            Koleksiyon Seçin
                          </div>
                      {collections.map(col => (
                            <div
                              key={col.collectionId}
                              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                form.collectionId === col.collectionId ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                              }`}
                              onClick={() => {
                                setForm({ ...form, collectionId: col.collectionId });
                                setCollectionDropdownOpen(false);
                              }}
                            >
                          {col.name}
                            </div>
                      ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kural ID
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setRuleDropdownOpen(!ruleDropdownOpen)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-left bg-white"
                      >
                        <span className={form.rule_id ? "text-gray-900" : "text-gray-500"}>
                          {form.rule_id 
                            ? productRules.find(rule => rule.id.toString() === form.rule_id) 
                                ? `${productRules.find(rule => rule.id.toString() === form.rule_id)?.id} - ${productRules.find(rule => rule.id.toString() === form.rule_id)?.name}`
                                : "Kural Seçin"
                            : "Kural Seçin"
                          }
                        </span>
                        <svg 
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${ruleDropdownOpen ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {ruleDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div 
                            className="px-3 py-2 text-gray-500 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => {
                              setForm({ ...form, rule_id: "" });
                              setRuleDropdownOpen(false);
                            }}
                          >
                            Kural Seçin
                          </div>
                          {productRules
                            .sort((a, b) => a.id - b.id)
                            .map(rule => (
                              <div
                                key={rule.id}
                                className={`px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  form.rule_id === rule.id.toString() ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                                }`}
                                onClick={() => {
                                  setForm({ ...form, rule_id: rule.id.toString() });
                                  setRuleDropdownOpen(false);
                                }}
                              >
                          {rule.id} - {rule.name}
                              </div>
                  ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ürün Görseli
                    </label>
                    
                    {/* Drag & Drop Area */}
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        dragActive 
                          ? 'border-blue-500 bg-blue-50' 
                          : imagePreview 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        type="file"
                        name="productImage"
                        onChange={handleChange}
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {imagePreview ? (
                        <div className="space-y-3">
                          <div className="relative inline-block">
                            <Image 
                              src={imagePreview} 
                              alt="Yeni görsel önizleme" 
                              width={96}
                              height={96}
                              className="h-24 w-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                          <div>
                            <p className="text-sm text-green-600 font-medium">✓ Yeni görsel seçildi</p>
                            <p className="text-xs text-gray-500">Güncellemek için "Güncelle" butonuna tıklayın</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="mx-auto w-12 h-12 text-gray-400">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium text-blue-600">Yeni görsel seçmek için tıklayın</span> ya da sürükleyip bırakın
                            </p>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF - Max 10MB</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Mevcut görsel */}
                    {product?.productImage && !imagePreview && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">Mevcut görsel:</p>
                        <Image 
                          src={product.productImage} 
                          alt={product.name} 
                          width={80}
                          height={80}
                          className="h-20 w-20 object-cover rounded-md border border-gray-300"
                        />
                        <p className="text-xs text-gray-500 mt-1">Değiştirmek için yukarıya yeni bir görsel yükleyin</p>
                      </div>
                    )}
                  </div>
                  
                  {error && (
                    <div className="text-red-500 text-sm mt-1">{error}</div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                    >
                      <FaTrash size={14} />
                      Ürünü Sil
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-70"
                      >
                        {loading ? "Güncelleniyor..." : "Güncelle"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Sağ taraf - Kural Tablosu */}
              <div className="w-1/2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Kural ID Açıklamaları</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">ID</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 border-b">Kural Açıklaması</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {productRules.map(rule => (
                          <tr key={rule.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 font-medium text-blue-600">{rule.id}</td>
                            <td className="px-3 py-3">
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900">{rule.name}</div>
                                <div className="text-xs text-gray-600">• {rule.canHaveFringe ? 'Saçaklı/Saçaksız seçenekler' : 'Saçak yok'}</div>
                                {rule.sizeOptions && rule.sizeOptions.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    • {rule.sizeOptions.some(size => size.isOptionalHeight) 
                                      ? 'Standart En + Opsiyonel Boy' 
                                      : rule.sizeOptions.length === 1 
                                        ? `Tek Ebat: ${rule.sizeOptions[0].width}×${rule.sizeOptions[0].height}` 
                                        : rule.sizeOptions.map(size => `${size.width}×${size.isOptionalHeight ? 'Ops' : size.height}`).join(', ')}
                                  </div>
                                )}
                                {rule.cutTypes && rule.cutTypes.length > 0 && (
                                  <div className="text-xs text-gray-600">
                                    • Kesim: {rule.cutTypes.map(cut => cut.name.charAt(0).toUpperCase() + cut.name.slice(1)).join(', ')}
                                  </div>
                                )}
                                {rule.description && (
                                  <div className="text-xs text-gray-600">• {rule.description}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
