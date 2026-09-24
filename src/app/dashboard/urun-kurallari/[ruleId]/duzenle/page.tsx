'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ProductRule, 
  getProductRule,
  updateProductRule,
  UpdateProductRuleData
} from '@/services/api';
import { useAuth } from '@/app/context/AuthContext';
import Link from 'next/link';

export default function EditProductRulePage() {
  const router = useRouter();
  const params = useParams();
  const ruleId = parseInt(params.ruleId as string);
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [rule, setRule] = useState<ProductRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    canHaveFringe: false,
    isActive: true
  });
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!authLoading && isAdmin && ruleId) {
      fetchRule();
    }
  }, [isAdmin, authLoading, router, ruleId]);

  const fetchRule = async () => {
    try {
      setLoading(true);
      const ruleData = await getProductRule(ruleId);
      setRule(ruleData);
      setFormData({
        name: ruleData.name,
        description: ruleData.description,
        canHaveFringe: ruleData.canHaveFringe,
        isActive: ruleData.isActive
      });
    } catch (error: any) {
      setError(error.message || 'Kural yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const updateData: UpdateProductRuleData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        canHaveFringe: formData.canHaveFringe,
        isActive: formData.isActive
      };

      await updateProductRule(ruleId, updateData);
      router.push(`/dashboard/urun-kurallari/${ruleId}`);
    } catch (error: any) {
      setError(error.message || 'Kural güncellenirken bir hata oluştu');
    } finally {
      setSaveLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Kural bilgileri yükleniyor. Lütfen bekleyiniz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !rule) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1120px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Hata Oluştu</h3>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <Link
                href="/dashboard/urun-kurallari"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
              >
                Geri Dön
              </Link>
            </div>
          </div>
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
              Ürün Kuralını Düzenle
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Ürün kuralının temel bilgilerini güncelleyin
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/dashboard/urun-kurallari"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Ürün Kuralları
            </Link>
            <Link
              href={`/dashboard/urun-kurallari/${ruleId}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
            >
              Kural Detayı
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            <span className="font-medium">Güncelleme Hatası:</span> {error}
          </div>
        )}

        <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-3 text-sm text-sky-700">
          <span className="font-medium">Önemli Bilgi:</span>{' '}
          Boyut seçenekleri ve kesim türleri düzenlemeleri için{' '}
          <Link href={`/dashboard/urun-kurallari/${ruleId}`} className="font-medium underline">
            kural detay sayfasını
          </Link>{' '}
          kullanın.
        </div>

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

                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
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

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Aktif Durum</span>
                      <p className="mt-0.5 text-xs text-slate-500">Pasif kurallar yeni ürünlerde kullanılamaz</p>
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
              <h3 className="text-sm font-semibold text-slate-900">Mevcut Ayarlar</h3>
              <p className="mt-1 text-xs text-slate-500">Boyut, kesim ve ürün atamalarını kural detay sayfasından yönetin</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Boyut Seçeneği</p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule?.sizeOptions.length || 0}</p>
                  <Link
                    href={`/dashboard/urun-kurallari/${ruleId}`}
                    className="mt-2 inline-block text-xs font-medium text-[#00365a] hover:text-[#004170]"
                  >
                    Yönet
                  </Link>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kesim Türü</p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule?.cutTypes.length || 0}</p>
                  <Link
                    href={`/dashboard/urun-kurallari/${ruleId}`}
                    className="mt-2 inline-block text-xs font-medium text-[#00365a] hover:text-[#004170]"
                  >
                    Yönet
                  </Link>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kullanan Ürün</p>
                  <p className="mt-2 text-sm font-medium tabular-nums text-slate-900">{rule?.productCount || 0}</p>
                  {rule && rule.productCount && rule.productCount > 0 ? (
                    <Link
                      href={`/dashboard/urun-kurallari/${ruleId}`}
                      className="mt-2 inline-block text-xs font-medium text-[#00365a] hover:text-[#004170]"
                    >
                      Detay Görün
                    </Link>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">Henüz kullanılmıyor</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200/80 pt-5 sm:flex-row sm:justify-end">
              <Link
                href={`/dashboard/urun-kurallari/${ruleId}`}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={saveLoading}
                className="inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 