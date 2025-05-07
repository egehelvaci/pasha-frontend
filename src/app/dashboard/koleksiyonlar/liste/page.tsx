"use client";
import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa";

interface Product {
  productId: string;
  name: string;
}

interface Collection {
  collectionId: string;
  name: string;
  description: string;
  code: string;
  coverImageUrl: string | null;
  products: Product[];
  createdAt: string;
}

function AddCollectionModal({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    code: "",
    coverImageUrl: "",
    catalogOrder: 1,
    price: "",
    currency: "TRY"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://pasha-backend-production.up.railway.app/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          catalogOrder: Number(form.catalogOrder),
          price: Number(form.price)
        })
      });
      if (!res.ok) throw new Error("Koleksiyon eklenemedi");
      onSuccess();
      onClose();
      setForm({
        name: "",
        description: "",
        code: "",
        coverImageUrl: "",
        catalogOrder: 1,
        price: "",
        currency: "TRY"
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
        <h2 className="text-xl font-bold mb-4">Yeni Koleksiyon Ekle</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Ad" className="border rounded px-3 py-2" />
          <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Açıklama" className="border rounded px-3 py-2" />
          <input name="code" value={form.code} onChange={handleChange} required placeholder="Kod" className="border rounded px-3 py-2" />
          <input name="coverImageUrl" value={form.coverImageUrl} onChange={handleChange} placeholder="Kapak Görseli URL" className="border rounded px-3 py-2" />
          <input name="catalogOrder" type="number" min={1} value={form.catalogOrder} onChange={handleChange} required placeholder="Katalog Sırası" className="border rounded px-3 py-2" />
          <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} required placeholder="Fiyat" className="border rounded px-3 py-2" />
          <select name="currency" value={form.currency} onChange={handleChange} className="border rounded px-3 py-2">
            <option value="TRY">TRY</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold mt-2">
            {loading ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, text }: { open: boolean, onClose: () => void, onConfirm: () => void, text: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-lg relative">
        <h2 className="text-lg font-bold mb-4">Onay</h2>
        <div className="mb-6">{text}</div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Vazgeç</button>
          <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={onConfirm}>Evet</button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionList() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const fetchCollections = () => {
    setLoading(true);
    fetch("https://pasha-backend-production.up.railway.app/api/collections/")
      .then(res => res.json())
      .then(data => {
        setCollections(data.data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const filtered = collections.filter(col =>
    col.name.toLowerCase().includes(search.toLowerCase()) ||
    col.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`https://pasha-backend-production.up.railway.app/api/collections/${deleteId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Koleksiyon silinemedi");
      setConfirmOpen(false);
      setDeleteId(null);
      fetchCollections();
    } catch (err: any) {
      setDeleteError(err.message || "Bir hata oluştu");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6">
      <AddCollectionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCollections} />
      <ConfirmModal
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
        onConfirm={handleDelete}
        text="Bu koleksiyonu silmek istediğinize emin misiniz?"
      />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Koleksiyonlar Listesi</h1>
          <div className="text-sm text-gray-400 mt-1">
            Dashboard &nbsp;|&nbsp; Koleksiyonlar &nbsp;|&nbsp; <span className="text-gray-700">Koleksiyonlar Listesi</span>
          </div>
        </div>
        <button className="bg-blue-900 text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2" onClick={() => setModalOpen(true)}>
          + Yeni Koleksiyon
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select className="border rounded px-3 py-2 text-sm">
          <option>Sıralama</option>
        </select>
        <div className="relative">
          <input
            type="text"
            className="border rounded px-3 py-2 text-sm pl-8"
            placeholder="Ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-transparent">
          <thead>
            <tr className="text-gray-400 text-xs">
              <th className="py-3 px-2 text-left font-semibold">AD</th>
              <th className="py-3 px-2 text-left font-semibold">Açıklama</th>
              <th className="py-3 px-2 text-left font-semibold">Koleksiyon Kodu</th>
              <th className="py-3 px-2 text-center font-semibold">Ekli Ürün Adedi</th>
              <th className="py-3 px-2 text-center font-semibold">Eklenme Tarihi</th>
              <th className="py-3 px-2 text-center font-semibold">Seç</th>
              <th className="py-3 px-2 text-center font-semibold">Sil</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8">Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8">Koleksiyon bulunamadı.</td></tr>
            ) : (
              filtered.map(col => (
                <tr key={col.collectionId} className="bg-white rounded-xl shadow mb-2 align-top">
                  <td className="py-4 px-2 font-semibold flex items-center gap-3 min-w-[200px]">
                    <img
                      src={col.coverImageUrl || 'https://placehold.co/80x80'}
                      alt={col.name}
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                    <span>{col.name}</span>
                  </td>
                  <td className="py-4 px-2 text-sm text-gray-600 min-w-[200px]">{col.description}</td>
                  <td className="py-4 px-2 text-sm text-gray-600 min-w-[120px]">{col.code}</td>
                  <td className="py-4 px-2 text-center text-sm min-w-[80px]">{col.products.length}</td>
                  <td className="py-4 px-2 text-center text-sm min-w-[180px]">
                    {new Date(col.createdAt).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-4 px-2 text-center min-w-[40px]">
                    <input type="checkbox" />
                  </td>
                  <td className="py-4 px-2 text-center min-w-[40px]">
                    <button
                      className="text-red-600 hover:text-red-800"
                      title="Sil"
                      onClick={() => { setDeleteId(col.collectionId); setConfirmOpen(true); }}
                      disabled={deleteLoading}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
      </div>
    </div>
  );
} 