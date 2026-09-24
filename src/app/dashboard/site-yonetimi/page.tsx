'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useSiteSettings } from '@/app/context/SiteSettingsContext';
import {
  AdminSiteBanner,
  AdminSiteSettings,
  CreateBannerData,
  createBanner,
  deleteBanner,
  getAdminBanners,
  getAdminSiteSettings,
  updateAdminSiteSettings,
  updateBanner,
  uploadBannerImage,
} from '@/services/api';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SORT_ORDER = 2147483647;

const inputBaseClass =
  'w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-[#00365a] focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15';
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50';
const smallSecondaryButtonClass =
  'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

// Sifre alanlarindaki goz ikonu gibi calisir: acik goz alanin gorundugunu,
// ustu cizili goz gizlendigini anlatir; tiklama durumu tersine cevirir.
function VisibilityToggle({
  hidden,
  saving,
  disabled,
  areaLabel,
  onToggle,
}: {
  hidden: boolean;
  saving: boolean;
  disabled: boolean;
  areaLabel: string;
  onToggle: (nextHidden: boolean) => void;
}) {
  const actionLabel = hidden ? `${areaLabel} göster` : `${areaLabel} gizle`;

  return (
    <button
      type="button"
      onClick={() => onToggle(!hidden)}
      disabled={disabled}
      aria-pressed={hidden}
      aria-label={actionLabel}
      title={actionLabel}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:cursor-not-allowed disabled:opacity-50 ${
        hidden
          ? 'border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
          : 'border-slate-200 bg-white text-[#00365a] hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {saving ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#00365a]" />
      ) : hidden ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243"
          />
        </svg>
      ) : (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      )}
    </button>
  );
}

interface BannerFormState {
  title: string;
  imageUrl: string;
  mobileImageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY_FORM: BannerFormState = {
  title: '',
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '',
  altText: '',
  sortOrder: '0',
  isActive: true,
};

// linkUrl: http/https adres, /koleksiyonlar gibi site ici yol veya bos olabilir.
// javascript:, //host ve ters egik cizgi kabul edilmez.
function isValidLinkUrl(value: string): boolean {
  if (value.startsWith('\\') || value.includes('\\')) return false;
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  return /^https?:\/\/.+/i.test(value);
}

function isValidImageUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value);
}

export default function SiteManagementPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { refreshSiteSettings } = useSiteSettings();

  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [banners, setBanners] = useState<AdminSiteBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [savingFlag, setSavingFlag] = useState<'hideBalance' | 'hideStock' | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminSiteBanner | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'mobileImageUrl' | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  // Iki kaynak bagimsiz yuklenir: banner istegi basarisiz olsa bile gorunurluk
  // ayarlari calisir durumda kalir.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [settingsResult, bannerResult] = await Promise.allSettled([
      getAdminSiteSettings(),
      getAdminBanners(),
    ]);

    const messages: string[] = [];

    if (settingsResult.status === 'fulfilled') {
      setSettings(settingsResult.value);
    } else {
      messages.push(
        settingsResult.reason instanceof Error
          ? settingsResult.reason.message
          : 'Görünürlük ayarları alınamadı'
      );
    }

    if (bannerResult.status === 'fulfilled') {
      setBanners(bannerResult.value);
    } else {
      messages.push(
        bannerResult.reason instanceof Error ? bannerResult.reason.message : 'Bannerlar alınamadı'
      );
    }

    setError(messages.join(' · '));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (!authLoading && isAdmin) {
      loadData();
    }
  }, [authLoading, isAdmin, router, loadData]);

  const handleToggleFlag = async (field: 'hideBalance' | 'hideStock', value: boolean) => {
    setSavingFlag(field);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminSiteSettings({ [field]: value });
      setSettings(updated);
      // Admin kaydindan sonra public ayar sorgusu tazelenir.
      await refreshSiteSettings();
      setNotice('Ayar güncellendi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ayar güncellenemedi');
    } finally {
      setSavingFlag(null);
    }
  };

  const openCreateModal = () => {
    const nextSortOrder = banners.length
      ? Math.min(Math.max(...banners.map((banner) => banner.sortOrder)) + 1, MAX_SORT_ORDER)
      : 0;
    setEditingBanner(null);
    setForm({ ...EMPTY_FORM, sortOrder: String(nextSortOrder) });
    setFormErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (banner: AdminSiteBanner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl ?? '',
      linkUrl: banner.linkUrl ?? '',
      altText: banner.altText ?? '',
      sortOrder: String(banner.sortOrder),
      isActive: banner.isActive,
    });
    setFormErrors({});
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving || uploadingField) return;
    setModalOpen(false);
    setEditingBanner(null);
    setFormErrors({});
    setFormError('');
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'imageUrl' | 'mobileImageUrl'
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Yalnızca PNG, JPEG ve WebP görselleri yüklenebilir.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError('Görsel 5 MB sınırını aşıyor.');
      return;
    }

    setUploadingField(field);
    setFormError('');
    try {
      const imageUrl = await uploadBannerImage(file);
      setForm((prev) => ({ ...prev, [field]: imageUrl }));
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Görsel yüklenemedi');
    } finally {
      setUploadingField(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = 'Başlık zorunludur';
    } else if (form.title.trim().length > 200) {
      errors.title = 'Başlık en fazla 200 karakter olabilir';
    }

    if (!form.imageUrl.trim()) {
      errors.imageUrl = 'Görsel zorunludur';
    } else if (!isValidImageUrl(form.imageUrl.trim())) {
      errors.imageUrl = 'Görsel adresi http veya https ile başlamalıdır';
    } else if (form.imageUrl.trim().length > 2048) {
      errors.imageUrl = 'Görsel adresi en fazla 2048 karakter olabilir';
    }

    const mobileImageUrl = form.mobileImageUrl.trim();
    if (mobileImageUrl && !isValidImageUrl(mobileImageUrl)) {
      errors.mobileImageUrl = 'Mobil görsel adresi http veya https ile başlamalıdır';
    } else if (mobileImageUrl.length > 2048) {
      errors.mobileImageUrl = 'Mobil görsel adresi en fazla 2048 karakter olabilir';
    }

    const linkUrl = form.linkUrl.trim();
    if (linkUrl && !isValidLinkUrl(linkUrl)) {
      errors.linkUrl = 'Bağlantı http/https adresi veya / ile başlayan site içi yol olmalıdır';
    }

    if (form.altText.length > 300) {
      errors.altText = 'Alternatif metin en fazla 300 karakter olabilir';
    }

    const sortOrder = Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > MAX_SORT_ORDER) {
      errors.sortOrder = `Sıra 0 ile ${MAX_SORT_ORDER} arasında tam sayı olmalıdır`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const payload: CreateBannerData = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      mobileImageUrl: form.mobileImageUrl.trim() || null,
      linkUrl: form.linkUrl.trim() || null,
      altText: form.altText.trim(),
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
    };

    setSaving(true);
    setFormError('');
    try {
      if (editingBanner) {
        await updateBanner(editingBanner.id, payload);
      } else {
        await createBanner(payload);
      }
      setModalOpen(false);
      setEditingBanner(null);
      setNotice(editingBanner ? 'Banner güncellendi.' : 'Banner oluşturuldu.');
      await loadData();
      await refreshSiteSettings();
    } catch (err) {
      // Basarisiz kayit basari mesajiyla kapatilmaz.
      setFormError(err instanceof Error ? err.message : 'Banner kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (banner: AdminSiteBanner) => {
    setTogglingId(banner.id);
    setError('');
    setNotice('');
    try {
      await updateBanner(banner.id, { isActive: !banner.isActive });
      setNotice(banner.isActive ? 'Banner yayından kaldırıldı.' : 'Banner yayına alındı.');
      await loadData();
      await refreshSiteSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Banner durumu güncellenemedi');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (banner: AdminSiteBanner) => {
    if (!confirm(`"${banner.title}" banner'ı silinecek. Onaylıyor musunuz?`)) return;

    setDeletingId(banner.id);
    setError('');
    setNotice('');
    try {
      await deleteBanner(banner.id);
      setNotice('Banner silindi.');
      await loadData();
      await refreshSiteSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Banner silinemedi');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Yetkilendirme kontrol ediliyor. Lütfen bekleyiniz...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Erişim Reddedildi</h3>
          <p className="mt-2 text-sm text-slate-500">
            Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.
          </p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className={`mt-6 ${primaryButtonClass}`}
          >
            Dashboard&apos;a Dön
          </button>
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
              Site Yönetimi
            </h1>
            <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300 sm:mt-4" />
            <p className="mt-3 text-sm text-slate-500">
              Site genelinde bakiye ve stok görünürlüğünü yönetin, ana sayfa bannerlarını düzenleyin.
            </p>
          </div>
          <button type="button" onClick={openCreateModal} className={primaryButtonClass}>
            Yeni Banner
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#00365a]" />
            <p className="text-sm text-slate-500">Site ayarları yükleniyor...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h2 className="text-sm font-semibold text-slate-900">Görünürlük Ayarları</h2>
                {settings?.updatedAt && (
                  <span className="text-xs text-slate-500">
                    Son güncelleme: {new Date(settings.updatedAt).toLocaleString('tr-TR')}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Bakiye alanları</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Gizlendiğinde üst menüdeki bakiye alanı görüntülenmez. Bu yalnızca arayüz
                      görünürlüğüdür, veri erişim yetkisi değildir.
                    </p>
                  </div>
                  <VisibilityToggle
                    hidden={settings?.hideBalance ?? false}
                    saving={savingFlag === 'hideBalance'}
                    disabled={savingFlag !== null}
                    areaLabel="Bakiye alanlarını"
                    onToggle={(nextHidden) => handleToggleFlag('hideBalance', nextHidden)}
                  />
                </div>

                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Stok alanları</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Gizlendiğinde ürün listesi ve ürün detayındaki stok bilgileri ile stok filtresi
                      görüntülenmez.
                    </p>
                  </div>
                  <VisibilityToggle
                    hidden={settings?.hideStock ?? false}
                    saving={savingFlag === 'hideStock'}
                    disabled={savingFlag !== null}
                    areaLabel="Stok alanlarını"
                    onToggle={(nextHidden) => handleToggleFlag('hideStock', nextHidden)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Ana Sayfa Bannerları</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Her banner slider&apos;da bir slayt olur. Küçük sıra değeri önce görünür.
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {banners.filter((banner) => banner.isActive).length} yayında / {banners.length} banner
                </span>
              </div>

              {banners.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-900">Henüz banner eklenmemiş</p>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                    Ana sayfada banner alanı yalnızca en az bir aktif banner olduğunda görüntülenir.
                  </p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/60">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Sıra
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Görsel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Başlık
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Bağlantı
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                          Durum
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {banners.map((banner) => (
                        <tr key={banner.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">{banner.sortOrder}</td>
                          <td className="px-4 py-3">
                            <div className="h-12 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={banner.imageUrl}
                                alt={banner.altText || banner.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{banner.title}</p>
                            {banner.mobileImageUrl && (
                              <p className="mt-0.5 text-xs text-slate-500">Mobil görsel tanımlı</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {banner.linkUrl ? (
                              <span className="break-all">{banner.linkUrl}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {banner.isActive ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                Yayında
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                                Taslak
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(banner)}
                                disabled={togglingId === banner.id}
                                className={smallSecondaryButtonClass}
                              >
                                {togglingId === banner.id
                                  ? '...'
                                  : banner.isActive
                                  ? 'Yayından Kaldır'
                                  : 'Yayına Al'}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(banner)}
                                className={smallSecondaryButtonClass}
                              >
                                Düzenle
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(banner)}
                                disabled={deletingId === banner.id}
                                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === banner.id ? '...' : 'Sil'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200/80 bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 rounded-t-xl border-b border-slate-200/80 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editingBanner ? 'Banner Düzenle' : 'Yeni Banner'}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Görseli yükleyin veya adresini girin. Küçük sıra değeri önce görünür.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving || uploadingField !== null}
                aria-label="Kapat"
                className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#00365a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/15 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {formError && (
                  <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="banner-title" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Başlık <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="banner-title"
                      type="text"
                      maxLength={200}
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={`${inputBaseClass} ${formErrors.title ? 'border-rose-300' : ''}`}
                      placeholder="Örn: Yeni koleksiyon"
                    />
                    {formErrors.title && <p className="mt-1.5 text-xs text-rose-600">{formErrors.title}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="banner-image" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Görsel <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="banner-image"
                        type="text"
                        value={form.imageUrl}
                        onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                        className={`${inputBaseClass} ${formErrors.imageUrl ? 'border-rose-300' : ''}`}
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        onClick={() => desktopFileInputRef.current?.click()}
                        disabled={uploadingField !== null}
                        className={`shrink-0 ${secondaryButtonClass}`}
                      >
                        {uploadingField === 'imageUrl' ? 'Yükleniyor...' : 'Görsel Yükle'}
                      </button>
                      <input
                        ref={desktopFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'imageUrl')}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">PNG, JPEG veya WebP, en fazla 5 MB.</p>
                    {formErrors.imageUrl && <p className="mt-1.5 text-xs text-rose-600">{formErrors.imageUrl}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="banner-mobile-image" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Mobil Görsel
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        id="banner-mobile-image"
                        type="text"
                        value={form.mobileImageUrl}
                        onChange={(e) => setForm({ ...form, mobileImageUrl: e.target.value })}
                        className={`${inputBaseClass} ${formErrors.mobileImageUrl ? 'border-rose-300' : ''}`}
                        placeholder="Boş bırakılırsa masaüstü görseli kullanılır"
                      />
                      <button
                        type="button"
                        onClick={() => mobileFileInputRef.current?.click()}
                        disabled={uploadingField !== null}
                        className={`shrink-0 ${secondaryButtonClass}`}
                      >
                        {uploadingField === 'mobileImageUrl' ? 'Yükleniyor...' : 'Görsel Yükle'}
                      </button>
                      <input
                        ref={mobileFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, 'mobileImageUrl')}
                      />
                    </div>
                    {formErrors.mobileImageUrl && (
                      <p className="mt-1.5 text-xs text-rose-600">{formErrors.mobileImageUrl}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="banner-link" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Bağlantı
                    </label>
                    <input
                      id="banner-link"
                      type="text"
                      value={form.linkUrl}
                      onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                      className={`${inputBaseClass} ${formErrors.linkUrl ? 'border-rose-300' : ''}`}
                      placeholder="/dashboard/urunler/liste veya https://..."
                    />
                    {formErrors.linkUrl && <p className="mt-1.5 text-xs text-rose-600">{formErrors.linkUrl}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="banner-alt" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Alternatif Metin
                    </label>
                    <input
                      id="banner-alt"
                      type="text"
                      maxLength={300}
                      value={form.altText}
                      onChange={(e) => setForm({ ...form, altText: e.target.value })}
                      className={`${inputBaseClass} ${formErrors.altText ? 'border-rose-300' : ''}`}
                      placeholder="Görsel yüklenemediğinde gösterilecek metin"
                    />
                    {formErrors.altText && <p className="mt-1.5 text-xs text-rose-600">{formErrors.altText}</p>}
                  </div>

                  <div>
                    <label htmlFor="banner-sort" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                      Sıra
                    </label>
                    <input
                      id="banner-sort"
                      type="number"
                      min={0}
                      max={MAX_SORT_ORDER}
                      step={1}
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                      className={`${inputBaseClass} ${formErrors.sortOrder ? 'border-rose-300' : ''}`}
                    />
                    {formErrors.sortOrder && <p className="mt-1.5 text-xs text-rose-600">{formErrors.sortOrder}</p>}
                  </div>

                  <div className="flex items-end">
                    <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00365a] focus:ring-[#00365a]/20"
                      />
                      <div>
                        <span className="text-sm font-medium text-slate-900">Yayında</span>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Kapalıyken banner taslak olarak saklanır, ana sayfada görünmez.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {form.imageUrl && isValidImageUrl(form.imageUrl.trim()) && (
                  <div className="mt-5 border-t border-slate-200/80 pt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Önizleme</p>
                    <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.imageUrl.trim()}
                        alt={form.altText || form.title}
                        className="aspect-[21/8] w-full object-cover"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 rounded-b-xl border-t border-slate-200/80 bg-slate-50/60 px-5 py-3.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving || uploadingField !== null}
                  className={secondaryButtonClass}
                >
                  İptal
                </button>
                <button type="submit" disabled={saving || uploadingField !== null} className={primaryButtonClass}>
                  {saving ? 'Kaydediliyor...' : editingBanner ? 'Değişiklikleri Kaydet' : 'Banner Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
