"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";
import { useAuth } from '@/app/context/AuthContext';
import { API_BASE_URL } from '@/services/api';
import { useToken } from '@/app/hooks/useToken';

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const token = useToken();
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
  const { isAdmin } = useAuth();
  
  // Ürün seçimleri için state'ler
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [selectedCutType, setSelectedCutType] = useState<any>(null);
  const [selectedHasFringe, setSelectedHasFringe] = useState<boolean | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [customHeight, setCustomHeight] = useState<number>(100);  // Varsayılan 100 cm yükseklik
  const [quantity, setQuantity] = useState<number>(1);  // Ürün adedi

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
    if (product && selectedSize && quantity > 0) {
      // Fiyat hesaplama
      const basePrice = selectedSize.price || 0;
      const totalArea = (parseFloat(selectedSize.width) * parseFloat(selectedSize.height)) / 10000; // m2 cinsinden
      const totalPrice = basePrice * totalArea * quantity;
      setTotalPrice(totalPrice);
    }
  }, [product, selectedSize, quantity]);

  const fetchProduct = async () => {
    try {
      const authToken = token;
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${params.productId}`, {
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
      const res = await fetch("https://pasha-backend-production.up.railway.app/api/collections/", {
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
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
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
            <input name="price" type="text" value={form.price} onChange={handleChange} placeholder="Fiyat" className="border rounded px-3 py-2 text-black" />
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
            <select name="currency" value={form.currency} onChange={handleChange} className="border rounded px-3 py-2 text-black">
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
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
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
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
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/urunler/liste')} className="flex items-center gap-2 text-blue-900 hover:text-blue-700 font-semibold text-lg">
          <FaArrowLeft /> Geri
        </button>
      </div>
      
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black">{product.collection?.name} - {product.name}</h1>
          <button 
            onClick={() => setModalOpen(true)} 
            className="bg-blue-900 text-white rounded-full px-4 py-2 text-sm font-semibold"
          >
            Düzenle
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2">
            <img 
              src={product.productImage || "https://tebi.io/pashahome/products/ornek-urun.jpg"} 
              alt={product.name} 
              className="w-full rounded-lg shadow-md border border-gray-200 object-cover aspect-[250/390]" 
            />
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="grid grid-cols-1 gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500">Boyut Seçimi</span>
                <select 
                  className="border rounded-md p-2 text-black"
                  value={selectedSize?.id}
                  onChange={handleSizeChange}
                >
                  {product.sizeOptions?.map((size: any) => (
                    <option key={size.id} value={size.id}>
                      {size.width}x{size.is_optional_height ? 'İsteğe Bağlı' : size.height} cm 
                      (Stok: {size.stockQuantity})
                    </option>
                  ))}
                </select>
                
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
                            setCustomHeight(10);
                          } else {
                            setCustomHeight(Number(value) || 10);
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
              
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500">Kesim Türü</span>
                <select 
                  className="border rounded-md p-2 text-black"
                  value={selectedCutType?.id}
                  onChange={handleCutTypeChange}
                >
                  {product.cutTypes?.map((cutType: any) => (
                    <option key={cutType.id} value={cutType.id}>
                      {cutType.name.charAt(0).toUpperCase() + cutType.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {product.canHaveFringe && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-500">Saçak</span>
                  <select 
                    className="border rounded-md p-2 text-black"
                    value={selectedHasFringe?.toString()}
                    onChange={handleFringeChange}
                  >
                    <option value="true">Saçaklı</option>
                    <option value="false">Saçaksız</option>
                  </select>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500">Adet</span>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-l-md text-gray-500 hover:bg-gray-50"
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
                      const newQuantity = value === '' ? 1 : Math.max(1, parseInt(value) || 1);
                      setQuantity(newQuantity);
                    }}
                    className="w-16 border-y border-gray-300 py-1 px-2 text-center text-black"
                  />
                  <button 
                    type="button"
                    className="w-8 h-8 border border-gray-300 flex items-center justify-center rounded-r-md text-gray-500 hover:bg-gray-50"
                    onClick={() => {
                      setQuantity(quantity + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm text-gray-500">Açıklama</span>
                <p className="text-black">{product.description}</p>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm text-gray-500">Metrekare Fiyatı</span>
                <span className="font-medium text-black">
                  {product.pricing?.price} {product.pricing?.currency}/m²
                </span>
              </div>
              
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
                {/* DEBUG: Quantity değerini göster */}
                <div className="text-xs mt-1 text-red-600 font-mono">
                  DEBUG: quantity = {quantity}, typeof = {typeof quantity}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ürün Stok Durumu */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-black mb-4">Ürün Stok Durumu</h2>
          <div className="text-sm text-gray-600 mb-2">{product.collection?.name} - {product.name}</div>
          
          {product.sizeOptions && product.sizeOptions.length > 0 ? (
            <div className="space-y-4">
              {product.sizeOptions.map((size: any, index: number) => (
                <div 
                  key={size.id || index} 
                  className={`border-b pb-4 ${selectedSize?.id === size.id ? 'bg-blue-50 p-2 rounded' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black">
                      {size.width} x {size.is_optional_height ? '10000' : size.height}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 relative rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-blue-900 rounded-full"
                        style={{ width: `${Math.min(100, (size.width / 200) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm">
                      {size.width} / 660 M²
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Stok: {size.stockQuantity} adet
                  </div>
                </div>
              ))}
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
    </div>
  );
} 