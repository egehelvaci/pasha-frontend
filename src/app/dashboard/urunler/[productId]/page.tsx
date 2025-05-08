"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";
import { FaArrowLeft } from "react-icons/fa";

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const didFetch = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetch(`https://pasha-backend-production.up.railway.app/api/products/${params.productId}`)
      .then(res => {
        if (!res.ok) throw new Error("Ürün bulunamadı");
        return res.json();
      })
      .then(data => setProduct(data.data || data))
      .catch(err => setError(err.message || "Bir hata oluştu"))
      .finally(() => setLoading(false));
    fetch("https://pasha-backend-production.up.railway.app/api/collections/")
      .then(res => res.json())
      .then(data => setCollections(data.data || []));
  }, [params.productId]);

  function UpdateProductModal({ open, onClose, product, collections, onSuccess }: { open: boolean, onClose: () => void, product: any, collections: any[], onSuccess: (updated: any) => void }) {
    const [form, setForm] = useState({
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || "",
      stock: product?.stock || "",
      width: product?.width || "",
      height: product?.height || "",
      cut: product?.cut ? "true" : "false",
      collectionId: product?.collectionId || "",
      currency: product?.currency || "TRY",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      setForm({
        name: product?.name || "",
        description: product?.description || "",
        price: product?.price || "",
        stock: product?.stock || "",
        width: product?.width || "",
        height: product?.height || "",
        cut: product?.cut ? "true" : "false",
        collectionId: product?.collectionId || "",
        currency: product?.currency || "TRY",
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
        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => {
          if (value !== null && value !== "") fd.append(key, value as any);
        });
        const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
          method: "PUT",
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
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${product.productId}`, {
        method: "DELETE"
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
      <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col md:flex-row gap-10 items-center relative">
        <img src={product.productImage || product.imageUrl || "https://placehold.co/350x500"} alt={product.name} className="w-[350px] h-[500px] object-cover rounded-xl shadow-md border border-gray-200" />
        <div className="flex-1 flex flex-col gap-6 h-full">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-black break-words">{product.name}</h1>
          </div>
          <div className="text-lg text-black whitespace-pre-line">{product.description}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
            <div><span className="font-semibold text-black">Fiyat:</span> <span className="text-black">{product.price} {product.currency}</span></div>
            <div><span className="font-semibold text-black">Stok:</span> <span className="text-black">{product.stock}</span></div>
            <div><span className="font-semibold text-black">Koleksiyon:</span> <span className="text-black">{product.collection_name}</span></div>
            <div><span className="font-semibold text-black">Kayıt No:</span> <span className="text-black">{product.productId}</span></div>
            <div><span className="font-semibold text-black">Genişlik:</span> <span className="text-black">{product.width}</span></div>
            <div><span className="font-semibold text-black">Yükseklik:</span> <span className="text-black">{product.height}</span></div>
            <div><span className="font-semibold text-black">Kesim:</span> <span className="text-black">{product.cut ? "Var" : "Yok"}</span></div>
            <div><span className="font-semibold text-black">Eklenme Tarihi:</span> <span className="text-black">{new Date(product.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
          <div className="flex justify-between items-end mt-8">
            <button className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold w-fit" onClick={() => setModalOpen(true)}>
              Güncelle
            </button>
            <button className="text-red-600 hover:text-red-800 text-2xl" title="Sil" onClick={() => setDeleteOpen(true)}>
              <FaTrash />
            </button>
          </div>
        </div>
      </div>
      {deleteOpen && (
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
      <UpdateProductModal open={modalOpen} onClose={() => setModalOpen(false)} product={product} collections={collections} onSuccess={setProduct} />
    </div>
  );
} 