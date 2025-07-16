"use client";
import React, { useEffect, useState, useRef } from "react";
import { FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from '@/app/context/AuthContext';

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
    code: ""
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
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Koleksiyon eklenemedi");
      onSuccess();
      onClose();
      setForm({
        name: "",
        description: "",
        code: ""
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
        <h2 className="text-xl font-bold mb-4 text-black">Yeni Koleksiyon Ekle</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input name="name" value={form.name} onChange={handleChange} required placeholder="Ad" className="border rounded px-3 py-2 text-black" />
          <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Açıklama" className="border rounded px-3 py-2 text-black" />
          <input name="code" value={form.code} onChange={handleChange} required placeholder="Kod" className="border rounded px-3 py-2 text-black" />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="bg-[#00365a] text-white rounded-full px-6 py-2 font-semibold mt-2">
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
        <h2 className="text-lg font-bold mb-4 text-black">Onay</h2>
        <div className="mb-6 text-black">{text}</div>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-200 text-black" onClick={onClose}>Vazgeç</button>
          <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={onConfirm}>Evet</button>
        </div>
      </div>
    </div>
  );
}

export default function CollectionList() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [sortBy, setSortBy] = useState<string>("name_asc");
  const didFetch = useRef(false);
  const { isAdmin } = useAuth();

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
    if (didFetch.current) return;
    didFetch.current = true;
    fetchCollections();
  }, []);

  const filtered = collections.filter(col =>
    col.name.toLowerCase().includes(search.toLowerCase()) ||
    col.code.toLowerCase().includes(search.toLowerCase())
  );

  const sortedCollections = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "products_asc":
        return a.products.length - b.products.length;
      case "products_desc":
        return b.products.length - a.products.length;
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {isAdmin && <AddCollectionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCollections} />}
      {isAdmin && (
        <ConfirmModal
          open={confirmOpen}
          onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
          onConfirm={handleDelete}
          text="Bu koleksiyonu silmek istediğinize emin misiniz?"
        />
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-black">Koleksiyonlar Listesi</h1>
        </div>
        {isAdmin && (
          <button className="bg-[#00365a] text-white rounded-full px-6 py-2 font-semibold flex items-center gap-2" onClick={() => setModalOpen(true)}>
            + Yeni Koleksiyon
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <select 
          className="border rounded px-3 py-2 text-sm text-black focus:outline-none focus:ring-0 focus:border-gray-300"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name_asc">Koleksiyon Adı (A-Z)</option>
          <option value="name_desc">Koleksiyon Adı (Z-A)</option>
          <option value="products_asc">Ürün Adedi (Artan)</option>
          <option value="products_desc">Ürün Adedi (Azalan)</option>
          <option value="date_asc">Eklenme Tarihi (Eskiden Yeniye)</option>
          <option value="date_desc">Eklenme Tarihi (Yeniden Eskiye)</option>
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
      <div className="overflow-x-auto">
        <table className="min-w-full bg-transparent">
          <thead>
            <tr className="text-gray-400 text-xs">
              <th className="py-3 px-2 text-left font-semibold">Koleksiyon Adı</th>
              <th className="py-3 px-2 text-left font-semibold">Açıklama</th>
              <th className="py-3 px-2 text-left font-semibold">Koleksiyon Kodu</th>
              <th className="py-3 px-2 text-center font-semibold">Ekli Ürün Adedi</th>
              <th className="py-3 px-2 text-center font-semibold">Eklenme Tarihi</th>
              {isAdmin && <th className="py-3 px-2 text-center font-semibold w-16">Sil</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-black">Yükleniyor...</td></tr>
            ) : sortedCollections.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-black">Koleksiyon bulunamadı.</td></tr>
            ) : (
              sortedCollections.map(col => (
                <tr 
                  key={col.collectionId} 
                  className="bg-white rounded-xl shadow mb-2 align-top hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                  onClick={() => router.push(`/dashboard/koleksiyonlar/${col.collectionId}`)}
                >
                  <td className="py-4 px-2 text-sm text-black min-w-[150px] align-middle">{col.name}</td>
                  <td className="py-4 px-2 text-sm text-black min-w-[200px] align-middle">{col.description}</td>
                  <td className="py-4 px-2 text-sm text-black min-w-[120px] align-middle">{col.code}</td>
                  <td className="py-4 px-2 text-center text-sm text-black min-w-[80px] align-middle">{col.products.length}</td>
                  <td className="py-4 px-2 text-center text-sm text-black min-w-[180px] align-middle">
                    {new Date(col.createdAt).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  {isAdmin && (
                    <td className="py-4 px-2 text-center min-w-[40px] w-16 align-middle">
                      <button
                        className="text-red-600 hover:text-red-800"
                        title="Sil"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(col.collectionId); setConfirmOpen(true); }}
                        disabled={deleteLoading}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  )}
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