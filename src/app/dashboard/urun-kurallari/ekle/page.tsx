'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateProductRuleData, createProductRule, CutType, getCutTypes } from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

interface SizeOptionForm {
  width: number;
  height: number;
  isOptionalHeight: boolean;
}

export default function AddProductRulePage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [cutTypes, setCutTypes] = useState<CutType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    canHaveFringe: false
  });
  
  const [sizeOptions, setSizeOptions] = useState<SizeOptionForm[]>([
    { width: 0, height: 0, isOptionalHeight: false }
  ]);
  
  const [selectedCutTypeIds, setSelectedCutTypeIds] = useState<number[]>([]);
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin) {
      fetchCutTypes();
    }
  }, [isAdmin, authLoading, router]);

  const fetchCutTypes = async () => {
    try {
      const data = await getCutTypes();
      setCutTypes(data);
    } catch (error) {
      console.error('Kesim türleri getirme hatası:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      errors.name = 'Kural adı zorunludur';
    }

    if (!formData.description.trim()) {
      errors.description = 'Açıklama zorunludur';
    }

    // Boyut seçenekleri kontrolü
    const validSizeOptions = sizeOptions.filter(option => option.width > 0 && (option.isOptionalHeight || option.height > 0));
    if (validSizeOptions.length === 0) {
      errors.sizeOptions = 'En az bir geçerli boyut seçeneği eklemelisiniz';
    }

    // Kesim türü kontrolü
    if (selectedCutTypeIds.length === 0) {
      errors.cutTypes = 'En az bir kesim türü seçmelisiniz';
    }

    // Boyut seçenekleri validasyonu
    sizeOptions.forEach((option, index) => {
      if (option.width > 0 || option.height > 0) {
        if (option.width <= 0) {
          errors[`sizeOption_width_${index}`] = 'Genişlik 0\'dan büyük olmalı';
        }
        if (!option.isOptionalHeight && option.height <= 0) {
          errors[`sizeOption_height_${index}`] = 'Boy 0\'dan büyük olmalı';
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const validSizeOptions = sizeOptions.filter(option => option.width > 0 && (option.isOptionalHeight || option.height > 0));

      const createData: CreateProductRuleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        canHaveFringe: formData.canHaveFringe,
        sizeOptions: validSizeOptions.map(option => option.isOptionalHeight
          ? { width: option.width, isOptionalHeight: true }
          : option),
        cutTypeIds: selectedCutTypeIds
      };

      await createProductRule(createData);
      router.push('/dashboard/urun-kurallari');
    } catch (error: any) {
      setError(error.message || 'Kural oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const addSizeOption = () => {
    setSizeOptions([...sizeOptions, { width: 0, height: 0, isOptionalHeight: false }]);
  };

  const removeSizeOption = (index: number) => {
    if (sizeOptions.length > 1) {
      setSizeOptions(sizeOptions.filter((_, i) => i !== index));
    }
  };

  const updateSizeOption = (index: number, field: keyof SizeOptionForm, value: number | boolean) => {
    const updatedOptions = [...sizeOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setSizeOptions(updatedOptions);
  };

  const handleCutTypeToggle = (cutTypeId: number) => {
    setSelectedCutTypeIds(prev => 
      prev.includes(cutTypeId) 
        ? prev.filter(id => id !== cutTypeId)
        : [...prev, cutTypeId]
    );
  };

  const inputBaseClass =
    'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor. Lütfen bekleyiniz...</p>
          </div>
        </div>
      </div>
    );
  }

  // Admin kontrolü
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfaya erişim yetkiniz bulunmamaktadır. Ürün kuralları yönetimi sadece admin kullanıcılar tarafından kullanılabilir.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
          >
            Dashboard&apos;a Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl sm:tracking-[0.12em]">
              Yeni Ürün Kuralı Ekle
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Yeni bir ürün kuralı oluşturun ve boyut seçenekleri ile kesim türlerini atayın
            </p>
          </div>
          <Link
            href="/dashboard/urun-kurallari"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
          >
            Ürün Kuralları
          </Link>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <span className="font-medium">Hata Oluştu:</span> {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Ürün Kuralı Bilgileri</h2>
            <span className="text-xs text-slate-500">Zorunlu alanlar * ile işaretlidir</span>
          </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Temel Bilgiler</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Kural Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`${inputBaseClass} ${formErrors.name ? 'border-rose-300' : ''}`}
                  placeholder="Örn: Standart Halı Kuralları"
                />
                {formErrors.name && (
                  <p className="mt-1.5 text-xs text-rose-600">{formErrors.name}</p>
                )}
              </div>

              <div className="flex items-end">
                <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <input
                    type="checkbox"
                    checked={formData.canHaveFringe}
                    onChange={(e) => setFormData({ ...formData, canHaveFringe: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-900">Saçak Desteği</span>
                    <p className="mt-0.5 text-xs text-slate-500">Bu kurala sahip ürünler saçak seçeneğine sahip olabilir</p>
                  </div>
                </label>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="description" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Açıklama <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${inputBaseClass} resize-none ${formErrors.description ? 'border-rose-300' : ''}`}
                  placeholder="Kuralın ne için kullanıldığını açıklayın..."
                />
                {formErrors.description && (
                  <p className="mt-1.5 text-xs text-rose-600">{formErrors.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200/80 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Boyut Seçenekleri</h3>
                <p className="mt-1 text-xs text-slate-500">Ürünler için mevcut boyut seçeneklerini belirleyin</p>
              </div>
              <button
                type="button"
                onClick={addSizeOption}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Boyut Ekle
              </button>
            </div>

            {formErrors.sizeOptions && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {formErrors.sizeOptions}
              </p>
            )}

            <div className="mt-4 space-y-3">
              {sizeOptions.map((option, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3 sm:p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-900">Boyut Seçeneği #{index + 1}</h4>
                    {sizeOptions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSizeOption(index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                        title="Bu boyut seçeneğini sil"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Genişlik (cm) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={option.width || ''}
                        onChange={(e) => updateSizeOption(index, 'width', parseInt(e.target.value) || 0)}
                        className={`${inputBaseClass} ${formErrors[`sizeOption_width_${index}`] ? 'border-rose-300' : ''}`}
                        placeholder="100"
                      />
                      {formErrors[`sizeOption_width_${index}`] && (
                        <p className="mt-1.5 text-xs text-rose-600">{formErrors[`sizeOption_width_${index}`]}</p>
                      )}
                    </div>

                    {!option.isOptionalHeight && <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                        Boy (cm) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={option.height || ''}
                        onChange={(e) => updateSizeOption(index, 'height', parseInt(e.target.value) || 0)}
                        className={`${inputBaseClass} ${formErrors[`sizeOption_height_${index}`] ? 'border-rose-300' : ''}`}
                        placeholder="150"
                      />
                      {formErrors[`sizeOption_height_${index}`] && (
                        <p className="mt-1.5 text-xs text-rose-600">{formErrors[`sizeOption_height_${index}`]}</p>
                      )}
                    </div>}

                    <div className="sm:col-span-2">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                        <input
                          type="checkbox"
                          checked={option.isOptionalHeight}
                          onChange={(e) => updateSizeOption(index, 'isOptionalHeight', e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-900">Boy İsteğe Bağlı</span>
                          <p className="text-xs text-slate-500">Boy sipariş sırasında girilir; bu kuralda boy veya üst sınır tanımlanmaz.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-200/80 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Kesim Türleri</h3>
            <p className="mt-1 text-xs text-slate-500">Bu kurala uygulanabilecek kesim türlerini seçin</p>

            {formErrors.cutTypes && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                {formErrors.cutTypes}
              </p>
            )}

            <div className="mt-4">
              {cutTypes.length === 0 ? (
                <div className="py-8 text-center">
                  <h4 className="text-sm font-semibold text-slate-900">Kesim Türü Bulunamadı</h4>
                  <p className="mt-1 text-sm text-slate-500">Henüz sisteme kesim türü eklenmemiş. Sistem yöneticisine başvurun.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cutTypes.map((cutType) => (
                    <label
                      key={cutType.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        selectedCutTypeIds.includes(cutType.id)
                          ? 'border-[#00365a]/30 bg-[#00365a]/[0.06]'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCutTypeIds.includes(cutType.id)}
                        onChange={() => handleCutTypeToggle(cutType.id)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                      />
                      <span className="text-sm font-medium text-slate-900">{cutType.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {selectedCutTypeIds.length > 0 && (
                <p className="mt-4 text-sm text-slate-700">
                  <span className="font-medium">{selectedCutTypeIds.length}</span> kesim türü seçildi
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              İptal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'Kuralı Oluştur'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
