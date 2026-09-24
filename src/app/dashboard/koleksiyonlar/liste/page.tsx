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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Yeni Koleksiyon Ekle</h3>
            <p className="mt-0.5 text-xs text-slate-500">Yeni bir koleksiyon oluşturun</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Koleksiyon Adı <span className="text-rose-500">*</span>
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Örn: Yaz Koleksiyonu"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Açıklama <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                placeholder="Koleksiyon hakkında detaylı açıklama..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Koleksiyon Kodu <span className="text-rose-500">*</span>
              </label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                required
                placeholder="Örn: YAZ2024"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              />
              <p className="mt-1.5 text-xs text-slate-500">Benzersiz bir kod girin (büyük harfler önerilir)</p>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Ekleniyor..." : "Koleksiyon Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, text }: { open: boolean, onClose: () => void, onConfirm: () => void, text: string }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Onay Gerekli</h3>
          <p className="mt-0.5 text-xs text-slate-500">Bu işlem geri alınamaz</p>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-slate-700">{text}</p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            onClick={onClose}
          >
            Vazgeç
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
          >
            Evet, Sil
          </button>
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
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {isAdmin && <AddCollectionModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchCollections} />}
        {isAdmin && (
          <ConfirmModal
            open={confirmOpen}
            onClose={() => { setConfirmOpen(false); setDeleteId(null); }}
            onConfirm={handleDelete}
            text="Bu koleksiyonu silmek istediğinize emin misiniz?"
          />
        )}

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Koleksiyonlar
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Koleksiyonları yönetin ve görüntüleyin</p>
          </div>
          {isAdmin && (
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setModalOpen(true)}
            >
              Yeni Koleksiyon
            </button>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Sıralama</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="w-full min-w-[200px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9"
                >
                  {sortBy === "name_asc" && "Koleksiyon Adı (A-Z)"}
                  {sortBy === "name_desc" && "Koleksiyon Adı (Z-A)"}
                  {sortBy === "products_asc" && "Ürün Adedi (Artan)"}
                  {sortBy === "products_desc" && "Ürün Adedi (Azalan)"}
                  {sortBy === "date_asc" && "Eklenme Tarihi (Eskiden Yeniye)"}
                  {sortBy === "date_desc" && "Eklenme Tarihi (Yeniden Eskiye)"}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {sortDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {[
                      { value: "name_asc", label: "Koleksiyon Adı (A-Z)" },
                      { value: "name_desc", label: "Koleksiyon Adı (Z-A)" },
                      { value: "products_asc", label: "Ürün Adedi (Artan)" },
                      { value: "products_desc", label: "Ürün Adedi (Azalan)" },
                      { value: "date_asc", label: "Eklenme Tarihi (Eskiden Yeniye)" },
                      { value: "date_desc", label: "Eklenme Tarihi (Yeniden Eskiye)" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                          sortBy === option.value ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                        }`}
                        onClick={() => {
                          setSortBy(option.value);
                          setSortDropdownOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Arama</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  placeholder="Koleksiyon ara..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 md:self-end"
              >
                Temizle
              </button>
            )}
          </div>

          {(search || sortedCollections.length > 0) && (
            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-700">{sortedCollections.length}</span> koleksiyon bulundu
                {search && <span> (&quot;<span className="italic">{search}</span>&quot; araması için)</span>}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Koleksiyonlar yükleniyor...</p>
          </div>
        ) : sortedCollections.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-sm">
            <h3 className="text-sm font-medium text-slate-900">Koleksiyon bulunamadı</h3>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
              {search
                ? `"${search}" aramasına uygun koleksiyon bulunamadı. Farklı bir arama terimi deneyin.`
                : 'Henüz hiç koleksiyon eklenmemiş.'
              }
            </p>
            {isAdmin && !search && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
              >
                İlk Koleksiyonu Ekle
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCollections.map(col => (
              <div
                key={col.collectionId}
                className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300"
                onClick={() => router.push(`/dashboard/koleksiyonlar/${col.collectionId}`)}
              >
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-slate-900">{col.name}</h3>
                      <span className="mt-1 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-medium text-sky-700">
                        {col.code}
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                        title="Koleksiyonu Sil"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(col.collectionId);
                          setConfirmOpen(true);
                        }}
                        disabled={deleteLoading}
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-700">
                    {col.description}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{col.products.length} ürün</span>
                    <span>
                      {new Date(col.createdAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-medium text-[#00365a] transition group-hover:text-[#004170]">
                    Detayları Görüntüle
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {deleteError && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {deleteError}
          </div>
        )}
      </div>
    </div>
  );
} 