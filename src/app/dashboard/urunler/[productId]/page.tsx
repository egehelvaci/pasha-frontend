"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FaTrash } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { API_BASE_URL } from '@/services/api';
import { useToken } from '@/app/hooks/useToken';
import Image from 'next/image';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const token = useToken();
  const { refreshCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const productFetchedRef = useRef(false);
  const collectionsFetchedRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { isAdmin, user } = useAuth();
  
  // Sepete ekleme için state'ler
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [addToCartError, setAddToCartError] = useState("");
  
  // Ön sipariş için state'ler
  const [preorderLoading, setPreorderLoading] = useState(false);
  const [preorderSuccess, setPreorderSuccess] = useState(false);
  const [preorderError, setPreorderError] = useState("");
  const [notes, setNotes] = useState<string>("");
  
  // Ürün seçimleri için state'ler
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedCutType, setSelectedCutType] = useState<any>(null);
  const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [customHeight, setCustomHeight] = useState<number | string>(100);  // Varsayılan 100 cm boy
  const [quantity, setQuantity] = useState<number>(1);  // Ürün adedi

  // Custom dropdown state'leri
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [cutTypeDropdownOpen, setCutTypeDropdownOpen] = useState(false);
  const [fringeDropdownOpen, setFringeDropdownOpen] = useState(false);



  useEffect(() => {
    if (!productFetchedRef.current) {
      productFetchedRef.current = true;
      fetchProduct();
    }
    
    if (!collectionsFetchedRef.current) {
      collectionsFetchedRef.current = true;
      fetchCollections();
    }
  }, [params.productId]);

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
    const quantityNum = quantity || 0;
    if (product && selectedSize && quantityNum > 0) {
      // Metrekare fiyatı
      const pricePerSquareMeter = parseFloat(product.pricing?.price) || 0;
      
      // Boy değerini belirle (özel boy varsa onu kullan)
      const heightValue = selectedSize.is_optional_height ? parseFloat(customHeight.toString()) || 100 : parseFloat(selectedSize.height);
      const widthValue = parseFloat(selectedSize.width);
      
      // Alan hesaplama (cm² -> m²)
      const totalArea = (widthValue * heightValue) / 10000;
      
      // Toplam fiyat hesaplama
      const calculatedPrice = pricePerSquareMeter * totalArea * quantityNum;
      setTotalPrice(calculatedPrice || 0);
      
    } else {
      setTotalPrice(0);
    }
  }, [product, selectedSize, quantity, customHeight]);

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

  const fetchProduct = async () => {
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${params.productId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
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

  const fetchCollections = async () => {
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      setCollections(data.data || []);
    } catch (error) {
      console.error("Koleksiyonlar yüklenirken hata oluştu:", error);
    }
  };

  // Boyut değişimi
  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sizeId = parseInt(e.target.value);
    const size = product.sizeOptions.find((s: any) => s.id === sizeId);
    setSelectedSize(size);
    
    // İsteğe bağlı boy seçilince varsayılan değeri 100cm olarak ayarla
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

  // Stok durumu kontrolü
  const isOutOfStock = () => {
    if (!product || !selectedSize) return false;
    
    if (selectedSize.is_optional_height) {
      return (selectedSize.stockAreaM2 || 0) <= 0;
    } else {
      return (selectedSize.stockQuantity || 0) <= 0;
    }
  };

  // Ön sipariş fonksiyonu
  const addToPreorder = async () => {
    // Validasyon kontrolleri
    if (!product || !selectedSize || !selectedCutType) {
      setPreorderError("Ürün detayları eksik");
      return;
    }
    
    const quantityNum = parseInt(quantity.toString()) || 0;
    if (quantityNum <= 0) {
      setPreorderError("Lütfen geçerli bir miktar girin");
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
    
    setPreorderLoading(true);
    setPreorderError("");
    setPreorderSuccess(false);
    
    try {
      const authToken = token;
      
      // Boy değerini belirle
      const heightValue = selectedSize.is_optional_height ? customHeight : selectedSize.height;
      
      const requestBody = {
        productId: product.productId,
        quantity: quantityNum,
        width: selectedSize.width,
        height: heightValue,
        hasFringe: selectedHasFringe === true,
        cutType: cutTypeValue,
        notes: notes.trim() || undefined,
        isPreorder: true // Ön sipariş işareti
      };
      
      // Ön sipariş için aynı sepet API'sini kullanıyoruz, sadece isPreorder flag'i ekliyoruz
      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
        throw new Error(data.message || "Ön sipariş verilemedi");
      }
      
      // Başarılı
      setPreorderSuccess(true);
      setQuantity(1); // Miktar sıfırla
      setNotes(""); // Notları temizle
      
      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setPreorderSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      setPreorderError(err.message || "Ön sipariş verirken bir hata oluştu");
    } finally {
      setPreorderLoading(false);
    }
  };

  // Sepete ekleme fonksiyonu
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
      
      // Boy değerini belirle
      const heightValue = selectedSize.is_optional_height ? customHeight : selectedSize.height;
      
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
          'Authorization': `Bearer ${authToken}`,
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
      setShowSuccessPopup(true);
      setQuantity(1); // Miktar sıfırla
      setNotes(""); // Notları temizle
      
      // Sepeti yenile
      await refreshCart();
      
      // 3 saniye sonra başarı mesajını temizle
      setTimeout(() => {
        setAddToCartSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      setAddToCartError(err.message || "Sepete eklerken bir hata oluştu");
    } finally {
      setAddToCartLoading(false);
    }
  };

  function UpdateProductModal({ open, onClose, product, collections, onSuccess }: { open: boolean, onClose: () => void, product: any, collections: any[], onSuccess: (updated: any) => void }) {
    const [form, setForm] = useState({
      name: product?.name || "",
      description: product?.description || "",
      price: product?.pricing?.price || "",
      stock: product?.sizeOptions?.[0]?.stockQuantity || "",
      width: product?.sizeOptions?.[0]?.width || "",
      height: product?.sizeOptions?.[0]?.height || "",
      cut: product?.cutTypes?.[0]?.name === "standart" ? "true" : "false",
      collectionId: product?.collectionId || "",
      currency: product?.pricing?.currency || "TRY",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      setForm({
        name: product?.name || "",
        description: product?.description || "",
        price: product?.pricing?.price || "",
        stock: product?.sizeOptions?.[0]?.stockQuantity || "",
        width: product?.sizeOptions?.[0]?.width || "",
        height: product?.sizeOptions?.[0]?.height || "",
        cut: product?.cutTypes?.[0]?.name === "standart" ? "true" : "false",
        collectionId: product?.collectionId || "",
        currency: product?.pricing?.currency || "TRY",
        productImage: null
      });
    }, [product]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      if (type === "file") {
        setForm({ ...form, productImage: (e.target as HTMLInputElement).files?.[0] || null });
      } else {
        setForm({ ...form, [name]: value });
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      try {
        const authToken = token;
        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value !== null && value !== "") fd.append(key, value as any);
        });
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: fd
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Ürün güncellenemedi");
        onSuccess(data.data);
        onClose();
      } catch (err: any) {
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-lg relative">
          <button className="absolute top-2 right-3 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
          <h2 className="text-xl font-bold mb-4 text-black">Ürünü Güncelle</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input name="name" value={form.name} onChange={handleChange} placeholder="Ad" className="border rounded px-3 py-2 text-black" />
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Açıklama" className="border rounded px-3 py-2 text-black" />
            {user?.canSeePrice && (
              <input name="price" type="text" value={form.price} onChange={handleChange} placeholder="Fiyat" className="border rounded px-3 py-2 text-black" />
            )}
            <input name="stock" type="text" value={form.stock} onChange={handleChange} placeholder="Stok" className="border rounded px-3 py-2 text-black" />
            <input name="width" type="text" value={form.width} onChange={handleChange} placeholder="Genişlik" className="border rounded px-3 py-2 text-black" />
            <input name="height" type="text" value={form.height} onChange={handleChange} placeholder="Yükseklik" className="border rounded px-3 py-2 text-black" />
            <select name="cut" value={form.cut} onChange={handleChange} className="border rounded px-3 py-2 text-black">
              <option value="false">Kesim Yok</option>
              <option value="true">Kesim Var</option>
            </select>
            <select name="collectionId" value={form.collectionId} onChange={handleChange} className="border rounded px-3 py-2 text-black">
              <option value="">Koleksiyon Seç</option>
              {collections.map(col => (
                <option key={col.collectionId} value={col.collectionId}>{col.name}</option>
              ))}
            </select>
            {user?.canSeePrice && (
              <select name="currency" value={form.currency} onChange={handleChange} className="border rounded px-3 py-2 text-black">
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            )}
            <input name="productImage" type="file" accept="image/*" onChange={handleChange} className="border rounded px-3 py-2 text-black" />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold mt-2">
              {loading ? "Güncelleniyor..." : "Güncelle"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const authToken = token;
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/products/${product.productId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Ürün silinemedi");
      router.push("/dashboard/urunler/liste");
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-black">Yükleniyor...</div>;
  }
  if (error || !product) {
    return <div className="p-6 text-center text-red-500">{error || "Ürün bulunamadı"}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-[#00365a] rounded-t-xl px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/urunler/liste')} 
              className="flex items-center gap-2 text-white hover:text-gray-200 font-semibold text-lg transition-colors"
            >
              <FaArrowLeft /> Geri
            </button>
            <h1 className="text-xl font-bold text-white">{product.collection?.name} - {product.name}</h1>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setModalOpen(true)}
              className="bg-green-600 text-white rounded-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-green-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Düzenle
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="bg-white rounded-b-xl shadow-lg overflow-hidden">
        <div className="p-8">
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            {product.productImage ? (
              <Image 
                src={product.productImage} 
                alt={product.name} 
                width={400}
                height={624}
                className="w-full rounded-lg shadow-md border border-gray-200 object-cover aspect-[250/390]" 
              />
            ) : (
              <div className="w-full rounded-lg shadow-md border border-gray-200 bg-gray-50 aspect-[250/390] flex flex-col items-center justify-center p-6">
                <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center mb-4">
                  <Image 
                    src="/logo.svg" 
                    alt="Paşa Home Logo" 
                    width={80}
                    height={80}
                    className="opacity-80"
                  />
                </div>
                <p className="text-gray-500 text-sm text-center font-medium">
                  Ürün görseli<br />hazırlanıyor
                </p>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ürün Seçenekleri</h3>
              <div className="grid grid-cols-1 gap-5">
              <div className="flex flex-col gap-2 dropdown-container bg-blue-50 rounded-lg p-6 border border-blue-200">
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
                  <div className="mt-3 p-4">
                    <label className="text-sm font-medium text-gray-700 block mb-2">Özel Boy (cm) - Elle Girilebilir</label>
                    <div className="flex items-center gap-3">
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
                            setCustomHeight(10);
                          }
                        }}
                        className="border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors w-32"
                      />
                      <span className="text-sm text-gray-600">cm</span>
                    </div>
                    <span className="text-xs text-blue-600 block mt-2">
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
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Adet</span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    className="w-10 h-10 border border-gray-300 flex items-center justify-center rounded-l-lg text-gray-500 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      if (quantity > 1) {
                        setQuantity(quantity - 1);
                      }
                    }}
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
                    className="w-20 border-y border-gray-300 py-2 px-3 text-center text-gray-900 focus:outline-none"
                  />
                  <button 
                    type="button"
                    className="w-10 h-10 border border-gray-300 flex items-center justify-center rounded-r-lg text-gray-500 hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setQuantity(quantity + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Açıklama</span>
                <p className="text-gray-800 leading-relaxed">{product.description}</p>
              </div>
              
              {user?.canSeePrice && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-700">Metrekare Fiyatı</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {product.pricing?.price} {product.pricing?.currency}/m²
                  </span>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Notlar (Opsiyonel)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ürün için özel notlarınızı yazabilirsiniz..."
                  className="border border-gray-300 rounded-lg p-3 text-gray-900 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {user?.canSeePrice && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-lg font-semibold text-blue-900">Toplam Tutar</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {totalPrice.toFixed(2)} {product.pricing?.currency}
                    </span>
                  </div>
                  {selectedSize && (
                    <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Hesaplama Detayı:</span>
                        <span>
                          {selectedSize.width} cm genişlik × 
                          {selectedSize.is_optional_height 
                            ? ` ${customHeight} cm boy (özel)` 
                            : ` ${selectedSize.height} cm boy`} 
                          × {quantity} adet
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sepete Ekle / Ön Sipariş Butonu */}
              <div className="mt-4">
                {/* Stok Uyarısı */}
                {selectedSize && isOutOfStock() && (
                  <div className="mb-3 p-3 bg-orange-100 border border-orange-300 rounded-md text-orange-700 text-sm">
                    ⚠️ Bu ürün şu anda stokta bulunmamaktadır. Ön sipariş verebilirsiniz.
                  </div>
                )}
                
                {/* Başarı Mesajları */}
                {addToCartSuccess && (
                  <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-md text-green-700 text-sm">
                    ✅ Ürün başarıyla sepete eklendi!
                  </div>
                )}
                
                {preorderSuccess && (
                  <div className="mb-3 p-3 bg-blue-100 border border-blue-300 rounded-md text-blue-700 text-sm">
                    Sepetinize eklendi!
                  </div>
                )}
                
                {/* Hata Mesajları */}
                {addToCartError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
                    ❌ {addToCartError}
                  </div>
                )}
                
                {preorderError && (
                  <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
                    ❌ {preorderError}
                  </div>
                )}
                
                {selectedSize && isOutOfStock() ? (
                  // Ön Sipariş Butonu
                  <button
                    type="button"
                    className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-70 shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={addToPreorder}
                    disabled={preorderLoading || !selectedSize || !selectedCutType}
                  >
                    {preorderLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Ön Sipariş Ver
                      </>
                    )}
                  </button>
                ) : (
                  // Normal Sepete Ekle Butonu
                  <button
                    type="button"
                    className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-70 shadow-lg hover:shadow-xl transform hover:scale-[1.02] bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                    onClick={addToCart}
                    disabled={addToCartLoading || !selectedSize || !selectedCutType}
                  >
                    {addToCartLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        İşleniyor...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Sepete Ekle
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
        
        {/* Ürün Stok Durumu */}
        <div className="mt-10 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Ürün Stok Durumu</h2>
          
          {product.sizeOptions && product.sizeOptions.length > 0 ? (
            <div className="space-y-3">
              {product.sizeOptions.map((size: any, index: number) => {
                const isOptionalHeight = size.is_optional_height;
                const stockValue = isOptionalHeight 
                  ? `${(size.stockAreaM2 || 0).toFixed(1)} m²`
                  : `${size.stockQuantity || 0} adet`;
                const hasStock = (isOptionalHeight ? (size.stockAreaM2 || 0) : (size.stockQuantity || 0)) > 0;
                const stockColor = hasStock ? 'text-green-600' : 'text-red-600';
                const isSelected = selectedSize?.id === size.id;
                
                return (
                  <div 
                    key={size.id || index} 
                    className={`p-3 rounded-lg border ${
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {size.width}x{isOptionalHeight ? 'İsteğe Bağlı' : size.height} cm
                        
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${stockColor}`}>
                          {stockValue}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500">Bu ürün için boyut seçeneği bulunmamaktadır.</div>
          )}
        </div>
        
        {isAdmin && (
          <div className="mt-8 flex justify-end">
            <button 
              className="text-red-600 hover:text-red-800 flex items-center gap-1" 
              title="Sil" 
              onClick={() => setDeleteOpen(true)}
            >
              <FaTrash /> Ürünü Sil
            </button>
          </div>
        )}
        </div>
      </div>
      
      {deleteOpen && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Onay</h2>
            <div className="mb-6 text-black">Bu ürünü silmek istediğinize emin misiniz?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => setDeleteOpen(false)}>Vazgeç</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDelete} disabled={deleteLoading}>Evet</button>
            </div>
            {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
          </div>
        </div>
      )}
      
      {modalOpen && isAdmin && (
        <UpdateProductModal open={modalOpen} onClose={() => setModalOpen(false)} product={product} collections={collections} onSuccess={setProduct} />
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
              
              {/* Butonlar */}
              <div className="flex flex-col gap-3 mt-6">
                <Link
                  href="/dashboard/sepetim"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  Sepete Git
                </Link>
                
                <Link
                  href="/dashboard/urunler/liste"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold transition-colors"
                  onClick={() => setShowSuccessPopup(false)}
                >
                  Alışverişe Devam Et
                </Link>
                
                <button
                  onClick={() => setShowSuccessPopup(false)}
                  className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg font-semibold transition-colors"
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
} 