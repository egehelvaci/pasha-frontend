"use client";
import React, { useEffect, useState, useRef } from "react";
import { FaTrash } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { useAuth } from '@/app/context/AuthContext';
import { useToken } from '@/app/hooks/useToken';

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
  const token = useToken();
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-[#00365a] px-6 py-4 relative">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Yeni Koleksiyon Ekle
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Yeni bir koleksiyon oluşturun
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-white hover:text-blue-200 text-2xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Koleksiyon Adı */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Koleksiyon Adı <span className="text-red-500">*</span>
              </label>
              <input 
                name="name" 
                value={form.name} 
                onChange={handleChange} 
                required 
                placeholder="Örn: Yaz Koleksiyonu" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all"
              />
            </div>

            {/* Açıklama */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Açıklama <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="description" 
                value={form.description} 
                onChange={handleChange} 
                required 
                placeholder="Koleksiyon hakkında detaylı açıklama..." 
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all resize-none"
              />
            </div>

            {/* Kod */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-[#00365a]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Koleksiyon Kodu <span className="text-red-500">*</span>
              </label>
              <input 
                name="code" 
                value={form.code} 
                onChange={handleChange} 
                required 
                placeholder="Örn: YAZ2024" 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all font-mono"
              />
              <p className="text-xs text-gray-500">Benzersiz bir kod girin (büyük harfler önerilir)</p>
            </div>

            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            {/* Butonlar */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 py-2 bg-[#00365a] text-white rounded-lg hover:bg-[#004170] transition-colors font-medium disabled:opacity-70 flex items-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Koleksiyon Ekle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, text }: { open: boolean, onClose: () => void, onConfirm: () => void, text: string }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="bg-red-600 px-6 py-4 relative">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Onay Gerekli
              </h2>
              <p className="text-red-100 text-sm mt-1">
                Bu işlem geri alınamaz
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-gray-900 leading-relaxed">{text}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <button 
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              onClick={onClose}
            >
              Vazgeç
            </button>
            <button 
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
              onClick={onConfirm}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2.5 7a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
              </svg>
              Evet, Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollectionList() {
  const router = useRouter();
  const token = useToken();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [sortBy, setSortBy] = useState<string>("name_asc");
  
  // Custom dropdown state'i
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  
  const didFetch = useRef(false);
  const { isAdmin } = useAuth();

  const fetchCollections = () => {
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
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

  // Dropdown'ın dışına tıklandığında kapanması
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setSortDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/collections/${deleteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
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
    <div className="p-6 bg-gray-50 min-h-screen">
      {isAdmin && <AddCollectionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCollections} />}
      {isAdmin && (
        <ConfirmModal
          open={confirmOpen}
          onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
          onConfirm={handleDelete}
          text="Bu koleksiyonu silmek istediğinize emin misiniz?"
        />
      )}
      
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#00365a] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Koleksiyonlar
            </h1>
            <p className="text-gray-600 mt-1">Koleksiyonları yönetin ve görüntüleyin</p>
          </div>
          {isAdmin && (
            <button 
              className="bg-[#00365a] text-white rounded-lg px-6 py-3 font-semibold flex items-center gap-2 hover:bg-[#004170] transition-colors shadow-md"
              onClick={() => setModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Yeni Koleksiyon
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex items-center gap-3 w-full sm:w-auto dropdown-container">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sıralama:</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all min-w-[200px] text-left bg-white"
              >
                <span className="text-gray-900">
                  {sortBy === "name_asc" && "Koleksiyon Adı (A-Z)"}
                  {sortBy === "name_desc" && "Koleksiyon Adı (Z-A)"}
                  {sortBy === "products_asc" && "Ürün Adedi (Artan)"}
                  {sortBy === "products_desc" && "Ürün Adedi (Azalan)"}
                  {sortBy === "date_asc" && "Eklenme Tarihi (Eskiden Yeniye)"}
                  {sortBy === "date_desc" && "Eklenme Tarihi (Yeniden Eskiye)"}
                </span>
                <svg 
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {sortDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "name_asc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("name_asc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Koleksiyon Adı (A-Z)
                  </div>
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "name_desc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("name_desc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Koleksiyon Adı (Z-A)
                  </div>
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "products_asc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("products_asc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Ürün Adedi (Artan)
                  </div>
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "products_desc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("products_desc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Ürün Adedi (Azalan)
                  </div>
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "date_asc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("date_asc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Eklenme Tarihi (Eskiden Yeniye)
                  </div>
                  <div
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                      sortBy === "date_desc" ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    }`}
                    onClick={() => {
                      setSortBy("date_desc");
                      setSortDropdownOpen(false);
                    }}
                  >
                    Eklenme Tarihi (Yeniden Eskiye)
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-all w-full sm:w-64"
              placeholder="Koleksiyon ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>

          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Temizle
            </button>
          )}
        </div>

        {/* Results Summary */}
        {(search || sortedCollections.length > 0) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{sortedCollections.length}</span> koleksiyon bulundu
              {search && <span> ("<span className="italic">{search}</span>" araması için)</span>}
            </p>
          </div>
        )}
      </div>

      {/* Collections Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 border-4 border-[#00365a] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Koleksiyonlar yükleniyor...</p>
        </div>
      ) : sortedCollections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Koleksiyon bulunamadı</h3>
          <p className="mt-2 text-gray-500">
            {search 
              ? `"${search}" aramasına uygun koleksiyon bulunamadı. Farklı bir arama terimi deneyin.`
              : 'Henüz hiç koleksiyon eklenmemiş.'
            }
          </p>
          {isAdmin && !search && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 bg-[#00365a] text-white rounded-lg px-6 py-2 font-medium hover:bg-[#004170] transition-colors"
            >
              İlk Koleksiyonu Ekle
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCollections.map(col => (
            <div 
              key={col.collectionId} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-[#00365a] transition-all duration-200 cursor-pointer group overflow-hidden"
              onClick={() => router.push(`/dashboard/koleksiyonlar/${col.collectionId}`)}
            >
              {/* Card Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[#00365a] group-hover:text-[#004170] transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-sm font-mono text-gray-500 mt-1 bg-gray-100 px-2 py-1 rounded inline-block">
                      {col.code}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                      title="Koleksiyonu Sil"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDeleteId(col.collectionId); 
                        setConfirmOpen(true); 
                      }}
                      disabled={deleteLoading}
                    >
                      <FaTrash size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">
                  {col.description}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 12a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    {col.products.length} ürün
                  </div>
                  
                  <div className="text-gray-500 text-xs">
                    {new Date(col.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer - Hover Action */}
              <div className="px-6 pb-6">
                <div className="flex items-center text-[#00365a] group-hover:text-[#004170] text-sm font-medium">
                  <span>Detayları Görüntüle</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {deleteError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-red-600 text-sm">{deleteError}</span>
        </div>
      )}
    </div>
  );
} 