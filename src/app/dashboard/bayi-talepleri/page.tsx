"use client";

import { useState, useEffect } from "react";
import { getContactForms, updateContactForm, deleteContactForm, ContactForm } from "../../../services/api";
import { useToken } from "../../hooks/useToken";

export default function BayiTalepleri() {
  const token = useToken();
  const [contactForms, setContactForms] = useState<ContactForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState({
    isRead: undefined as boolean | undefined,
    isContacted: undefined as boolean | undefined,
    search: "",
  });
  const [selectedForm, setSelectedForm] = useState<ContactForm | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState("");
  const [showReadDropdown, setShowReadDropdown] = useState(false);
  const [showContactedDropdown, setShowContactedDropdown] = useState(false);

  useEffect(() => {
    // Token kontrolü
    if (!token) {
      setError('Giriş yapmanız gerekiyor. Lütfen önce giriş yapın.');
      setLoading(false);
      return;
    }
    
    fetchContactForms();
  }, [currentPage, filters, token]);

  // Dropdown'ları dışarı tıklandığında kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowReadDropdown(false);
        setShowContactedDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const fetchContactForms = async () => {
    try {
      setLoading(true);
      const data = await getContactForms(currentPage, 20, filters);
      setContactForms(data.contactForms);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
    } catch (err) {
      console.error("Bayi talepleri yükleme hatası:", err);
      setError(`Bayi talepleri yüklenirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, field: 'isRead' | 'isContacted', value: boolean) => {
    try {
      await updateContactForm(id, { [field]: value });
      setContactForms(prev => 
        prev.map(form => 
          form.id === id ? { ...form, [field]: value } : form
        )
      );
    } catch (err) {
      console.error("Durum güncelleme hatası:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bu talebi silmek istediğinizden emin misiniz?")) return;
    
    try {
      await deleteContactForm(id);
      setContactForms(prev => prev.filter(form => form.id !== id));
      setTotalItems(prev => prev - 1);
    } catch (err) {
      console.error("Silme hatası:", err);
    }
  };

  const handleNotesUpdate = async () => {
    if (!selectedForm) return;
    
    try {
      await updateContactForm(selectedForm.id, { notes });
      setContactForms(prev => 
        prev.map(form => 
          form.id === selectedForm.id ? { ...form, notes } : form
        )
      );
      setShowModal(false);
      setSelectedForm(null);
      setNotes("");
    } catch (err) {
      console.error("Not güncelleme hatası:", err);
    }
  };

  const openNotesModal = (form: ContactForm) => {
    setSelectedForm(form);
    setNotes(form.notes || "");
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f7f8fa]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
        <p className="text-sm text-slate-500">Bayi talepleri yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
                Bayi Talepleri
              </h1>
              <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
              <p className="mt-3 text-sm text-slate-500">Gelen bayi taleplerini yönetin ve takip edin</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Talep</p>
              <p className="mt-2 text-2xl font-light text-slate-900">0</p>
            </div>
          </div>

          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {error.includes('Giriş yapmanız gerekiyor') ? (
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
              >
                Giriş Yap
              </a>
            ) : (
              <button
                onClick={() => {
                  setError(null);
                  fetchContactForms();
                }}
                className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25"
              >
                Tekrar Dene
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Bayi Talepleri
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">Gelen bayi taleplerini yönetin ve takip edin</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Toplam Talep</p>
            <p className="mt-2 text-2xl font-light text-slate-900">{totalItems}</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Okunma Durumu
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReadDropdown(!showReadDropdown)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9 text-left"
                >
                  {filters.isRead === undefined ? "Tümü" : filters.isRead ? "Okunmuş" : "Okunmamış"}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${showReadDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showReadDropdown && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isRead: undefined }));
                        setShowReadDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isRead === undefined ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isRead: false }));
                        setShowReadDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isRead === false ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      Okunmamış
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isRead: true }));
                        setShowReadDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isRead === true ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      Okunmuş
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="dropdown-container">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                İletişim Durumu
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowContactedDropdown(!showContactedDropdown)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 pr-9 text-left"
                >
                  {filters.isContacted === undefined ? "Tümü" : filters.isContacted ? "İletişim Kurulmuş" : "İletişim Kurulmamış"}
                  <svg
                    className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-transform ${showContactedDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showContactedDropdown && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isContacted: undefined }));
                        setShowContactedDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isContacted === undefined ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      Tümü
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isContacted: false }));
                        setShowContactedDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isContacted === false ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      İletişim Kurulmamış
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isContacted: true }));
                        setShowContactedDropdown(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                        filters.isContacted === true ? 'bg-[#00365a]/[0.06] font-medium text-[#00365a]' : 'text-slate-700'
                      }`}
                    >
                      İletişim Kurulmuş
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ isRead: undefined, isContacted: undefined, search: "" });
                  setCurrentPage(1);
                }}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 md:w-auto"
              >
                Filtreleri Temizle
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-sm font-semibold text-slate-900">Talep Listesi</h3>
            <span className="text-xs text-slate-500">{contactForms.length} kayıt</span>
          </div>

          {contactForms.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-medium text-slate-900">Henüz bayi talebi bulunmuyor.</h3>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-full">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Firma Bilgileri
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      İletişim
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tarih
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Notlar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      İşlemler
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contactForms.map((form) => (
                    <tr
                      key={form.id}
                      className={`transition-colors hover:bg-slate-50/70 ${!form.isRead ? 'border-l-4 border-l-[#00365a] bg-[#00365a]/[0.04]' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{form.companyName}</div>
                        <div className="mt-0.5 text-sm text-slate-700">{form.authorityFullName}</div>
                        <div className="mt-0.5 text-sm text-slate-500">{form.address}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900">{form.email}</div>
                        <div className="mt-0.5 text-sm text-slate-700">{form.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(form.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          {form.notes && form.notes.trim() !== '' ? (
                            <p className="line-clamp-2 text-sm text-slate-700">{form.notes}</p>
                          ) : (
                            <p className="text-sm italic text-slate-400">Not bulunmamaktadır</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleDelete(form.id)}
                          className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/25"
                        >
                          Sil
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-3">
                          <label className="group flex cursor-pointer items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={form.isRead}
                                onChange={(e) => handleStatusUpdate(form.id, 'isRead', e.target.checked)}
                                className="sr-only"
                              />
                              <div
                                className={`h-5 w-5 rounded border-2 transition ${
                                  form.isRead
                                    ? 'border-[#00365a] bg-[#00365a]'
                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}
                              >
                                {form.isRead && (
                                  <svg className="m-0.5 h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                              Okundu
                            </span>
                          </label>

                          <label className="group flex cursor-pointer items-center">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={form.isContacted}
                                onChange={(e) => handleStatusUpdate(form.id, 'isContacted', e.target.checked)}
                                className="sr-only"
                              />
                              <div
                                className={`h-5 w-5 rounded border-2 transition ${
                                  form.isContacted
                                    ? 'border-emerald-600 bg-emerald-600'
                                    : 'border-slate-300 bg-white group-hover:border-slate-400'
                                }`}
                              >
                                {form.isContacted && (
                                  <svg className="m-0.5 h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                              İletişim
                            </span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="text-sm text-slate-700">
                Sayfa {currentPage} / {totalPages} • Toplam {totalItems} talep
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>

        {showModal && selectedForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Notlar - {selectedForm.companyName}</h3>
                <p className="mt-0.5 text-xs text-slate-500">Talep notlarını güncelleyin</p>
              </div>
              <div className="px-5 py-5">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Notlar</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                  placeholder="Notlarınızı buraya yazın..."
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedForm(null);
                    setNotes("");
                  }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleNotesUpdate}
                  className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
