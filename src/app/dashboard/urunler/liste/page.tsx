"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FaTrash } from "react-icons/fa";

export default function ProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("id_asc");
  const [collections, setCollections] = useState<{collectionId: string, name: string}[]>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const didFetch = useRef(false);
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetch("https://pasha-backend-production.up.railway.app/api/products")
      .then(res => res.json())
      .then(data => setProducts(data.data || data || []));
    fetch("https://pasha-backend-production.up.railway.app/api/collections/")
      .then(res => res.json())
      .then(data => {
        setCollections(data.data?.map((col: any) => ({ collectionId: col.collectionId, name: col.name })) || []);
      });
  }, []);

  const filteredProducts = products.filter(product =>
    (!selectedCollection || product.collectionId === selectedCollection) &&
    (product.name.toLowerCase().includes(search.toLowerCase()) ||
     product.description.toLowerCase().includes(search.toLowerCase()))
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
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

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/products/${deleteId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Ürün silinemedi");
      setProducts(products.filter(p => p.productId !== deleteId));
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  function AddProductModal({ open, onClose, onSuccess, collections }: { open: boolean, onClose: () => void, onSuccess: (newProduct: any) => void, collections: {collectionId: string, name: string}[] }) {
    const [form, setForm] = useState({
      name: "",
      description: "",
      price: "",
      stock: "",
      width: "",
      height: "",
      cut: "false",
      collectionId: "",
      currency: "TRY",
      productImage: null as File | null
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
        const res = await fetch("https://pasha-backend-production.up.railway.app/api/products", {
          method: "POST",
          body: fd
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Ürün eklenemedi");
        onSuccess(data.data);
        onClose();
        setForm({
          name: "",
          description: "",
          price: "",
          stock: "",
          width: "",
          height: "",
          cut: "false",
          collectionId: "",
          currency: "TRY",
          productImage: null
        });
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
          <h2 className="text-xl font-bold mb-4 text-black">Yeni Ürün Ekle</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Ad" className="border rounded px-3 py-2 text-black" />
            <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Açıklama" className="border rounded px-3 py-2 text-black" />
            <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required placeholder="Fiyat" className="border rounded px-3 py-2 text-black" />
            <input name="stock" type="number" value={form.stock} onChange={handleChange} required placeholder="Stok" className="border rounded px-3 py-2 text-black" />
            <input name="width" type="number" step="0.01" value={form.width} onChange={handleChange} required placeholder="Genişlik" className="border rounded px-3 py-2 text-black" />
            <input name="height" type="number" step="0.01" value={form.height} onChange={handleChange} required placeholder="Yükseklik" className="border rounded px-3 py-2 text-black" />
            <select name="cut" value={form.cut} onChange={handleChange} className="border rounded px-3 py-2 text-black">
              <option value="false">Kesim Yok</option>
              <option value="true">Kesim Var</option>
            </select>
            <select name="collectionId" value={form.collectionId} onChange={handleChange} required className="border rounded px-3 py-2 text-black">
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
              {loading ? "Ekleniyor..." : "Ekle"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Ürün Listesi</h1>
        </div>
        <div className="flex gap-2">
          <button className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2" onClick={() => setModalOpen(true)}>
            <span>Yeni Ürün</span>
          </button>
          <button className="bg-white border border-gray-300 rounded-full px-3 py-2 flex items-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select className="border rounded px-3 py-2 text-sm text-black focus:outline-none focus:ring-0 focus:border-gray-300" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="id_asc">Kayıt No (A-Z)</option>
          <option value="id_desc">Kayıt No (Z-A)</option>
          <option value="name_asc">Ürün Kodu (A-Z)</option>
          <option value="name_desc">Ürün Kodu (Z-A)</option>
          <option value="date_asc">Tarih (Artan)</option>
          <option value="date_desc">Tarih (Azalan)</option>
        </select>
        <select className="border rounded px-3 py-2 text-sm text-black focus:outline-none focus:ring-0 focus:border-gray-300" value={selectedCollection} onChange={e => setSelectedCollection(e.target.value)}>
          <option value="">Tüm Koleksiyonlar</option>
          {collections.map(col => (
            <option key={col.collectionId} value={col.collectionId}>{col.name}</option>
          ))}
        </select>
        <div className="relative">
          <input
            type="text"
            className="border rounded px-3 py-2 text-sm pl-8 text-black focus:outline-none focus:ring-0 focus:border-gray-300"
            placeholder="Ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedProducts.map((product) => (
          <div key={product.productId} className="bg-white rounded-xl shadow p-3 flex flex-col h-full cursor-pointer hover:bg-gray-100 transition-colors duration-200" onClick={() => router.push(`/dashboard/urunler/${product.productId}`)}>
            <div className="relative mb-2 aspect-[250/390]">
              <img 
                src={product.productImage || product.imageUrl || "https://placehold.co/250x390"} 
                alt={product.name} 
                className="rounded-lg w-full h-full object-cover" 
              />
              <span className="absolute top-2 left-2 bg-blue-900 text-white text-xs px-3 py-1 rounded-full font-semibold">
                {product.collection_name || collections.find(c => c.collectionId === product.collectionId)?.name || "-"}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-black text-base line-clamp-1">{product.name}</span>
            </div>
            <div className="text-sm text-black line-clamp-2">{product.description}</div>
            <div className="flex justify-end mt-auto">
              <button
                className="text-red-600 hover:text-red-800 z-10"
                title="Sil"
                onClick={e => { e.stopPropagation(); setDeleteId(product.productId); setConfirmOpen(true); }}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-6 text-sm text-gray-500">
        <span>{products.length} Kayıttan 1 - {sortedProducts.length} arası gösterilmektedir.</span>
        <select className="border rounded px-2 py-1">
          <option>12</option>
          <option>24</option>
          <option>48</option>
        </select>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
            <h2 className="text-lg font-bold mb-4 text-black">Onay</h2>
            <div className="mb-6 text-black">Bu ürünü silmek istediğinize emin misiniz?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={() => { setConfirmOpen(false); setDeleteId(null); }}>Vazgeç</button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={handleDelete} disabled={deleteLoading}>Evet</button>
            </div>
            {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
          </div>
        </div>
      )}
      <AddProductModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={newProduct => setProducts([newProduct, ...products])} collections={collections} />
    </div>
  );
} 