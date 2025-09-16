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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Bayi Talepleri</h1>
              <p className="text-slate-300">Gelen bayi taleplerini yönetin ve takip edin</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400">0</div>
              <div className="text-sm text-slate-300">Toplam Talep</div>
            </div>
          </div>
        </div>

        {/* Hata Mesajı */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata Oluştu</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-4 flex space-x-3">
                {error.includes('Giriş yapmanız gerekiyor') ? (
                  <a
                    href="/login"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Giriş Yap
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      setError(null);
                      fetchContactForms();
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Tekrar Dene
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bayi Talepleri</h1>
            <p className="text-slate-300">Gelen bayi taleplerini yönetin ve takip edin</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-400">{totalItems}</div>
            <div className="text-sm text-slate-300">Toplam Talep</div>
          </div>
        </div>
      </div>

      {/* Modern Filtreler */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Okunma Durumu
            </label>
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => setShowReadDropdown(!showReadDropdown)}
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-left flex items-center justify-between"
              >
                <span className="text-gray-900">
                  {filters.isRead === undefined ? "Tümü" : filters.isRead ? "Okunmuş" : "Okunmamış"}
                </span>
                <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showReadDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showReadDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isRead: undefined }));
                        setShowReadDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isRead === undefined ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isRead === false ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isRead === true ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      Okunmuş
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              İletişim Durumu
            </label>
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => setShowContactedDropdown(!showContactedDropdown)}
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-left flex items-center justify-between"
              >
                <span className="text-gray-900">
                  {filters.isContacted === undefined ? "Tümü" : filters.isContacted ? "İletişim Kurulmuş" : "İletişim Kurulmamış"}
                </span>
                <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showContactedDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showContactedDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, isContacted: undefined }));
                        setShowContactedDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isContacted === undefined ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isContacted === false ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
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
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                        filters.isContacted === true ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      İletişim Kurulmuş
                    </button>
                  </div>
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
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Filtreleri Temizle
            </button>
          </div>
        </div>
      </div>

      {/* Modern Talep Listesi */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
        {contactForms.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">Henüz bayi talebi bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Firma Bilgileri
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Notlar
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    İşlemler
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {contactForms.map((form) => (
                  <tr key={form.id} className={`hover:bg-gray-50 transition-colors duration-200 ${!form.isRead ? "bg-blue-50 border-l-4 border-l-blue-500" : ""}`}>
                    <td className="px-6 py-6">
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-1">
                          {form.companyName}
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {form.authorityFullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {form.address}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="text-sm text-gray-900 mb-1">{form.email}</div>
                      <div className="text-sm text-gray-600">{form.phone}</div>
                    </td>
                    <td className="px-6 py-6 text-sm text-gray-600">
                      {formatDate(form.createdAt)}
                    </td>
                    <td className="px-6 py-6">
                      <div className="max-w-xs">
                        {form.notes && form.notes.trim() !== '' ? (
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {form.notes}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            Not bulunmamaktadır
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <button
                        onClick={() => handleDelete(form.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Sil
                      </button>
                    </td>
                    <td className="px-6 py-6">
                      <div className="space-y-3">
                        <label className="flex items-center cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={form.isRead}
                              onChange={(e) => handleStatusUpdate(form.id, 'isRead', e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                              form.isRead 
                                ? 'bg-blue-500 border-blue-500' 
                                : 'bg-white border-gray-300 group-hover:border-blue-400'
                            }`}>
                              {form.isRead && (
                                <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                            Okundu
                          </span>
                        </label>
                        
                        <label className="flex items-center cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={form.isContacted}
                              onChange={(e) => handleStatusUpdate(form.id, 'isContacted', e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 transition-all duration-200 ${
                              form.isContacted 
                                ? 'bg-green-500 border-green-500' 
                                : 'bg-white border-gray-300 group-hover:border-green-400'
                            }`}>
                              {form.isContacted && (
                                <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-green-600 transition-colors">
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
      </div>

      {/* Modern Sayfalama */}
      {totalPages > 1 && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              Sayfa {currentPage} / {totalPages} • Toplam {totalItems} talep
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Önceki
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Sonraki
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notlar Modal */}
      {showModal && selectedForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Notlar - {selectedForm.companyName}
              </h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notlarınızı buraya yazın..."
              />
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedForm(null);
                    setNotes("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  İptal
                </button>
                <button
                  onClick={handleNotesUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
