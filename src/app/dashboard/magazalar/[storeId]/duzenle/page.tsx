'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store, UpdateStoreData } from '@/services/api';
import { Form, Input, InputNumber, Switch, Select } from 'antd';
import { useAuth } from '@/app/context/AuthContext';
import StoreTypeSelector, { StoreType, storeTypeLabels, storeTypeColors, storeTypeIcons } from '@/components/StoreTypeSelector';

// Mevcut para birimleri
const CURRENCIES = [
  { value: 'TRY', label: 'TRY (₺)', symbol: '₺' },
  { value: 'USD', label: 'USD ($)', symbol: '$' }
];

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin, isAdminOrEditor, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [form] = Form.useForm();
  const [notice, setNotice] = useState({ isOpen: false, title: '', message: '', isError: false });
  const showNotice = (messageText: string, isError = false) => {
    setNotice({
      isOpen: true,
      title: isError ? 'İşlem tamamlanamadı' : 'İşlem tamamlandı',
      message: messageText,
      isError,
    });
  };

  useEffect(() => {
    if (!isAdminOrEditor) {
      router.push('/dashboard');
      return;
    }
    fetchStore();
  }, [isAdminOrEditor, router]);

  const fetchStore = async () => {
    try {
      // Admin API endpoint'ini kullan
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Mağazalar getirilemedi');
      }

      const result = await response.json();
      if (result.success) {
        const stores = result.data;
        const currentStore = stores.find((s: Store) => s.store_id === params.storeId);
        if (!currentStore) {
          showNotice('Mağaza bulunamadı', true);
          return;
        }
        setStore(currentStore);
        form.setFieldsValue({
          kurum_adi: currentStore.kurum_adi,
          vergi_numarasi: currentStore.vergi_numarasi,
          vergi_dairesi: currentStore.vergi_dairesi,
          yetkili_adi: currentStore.yetkili_adi,
          yetkili_soyadi: currentStore.yetkili_soyadi,
          tckn: currentStore.tckn,                       // 🆕 TCKN alanı
          telefon: currentStore.telefon,
          eposta: currentStore.eposta,
          faks_numarasi: currentStore.faks_numarasi,
          aciklama: currentStore.aciklama,
          limitsiz_acik_hesap: currentStore.limitsiz_acik_hesap,
          acik_hesap_tutari: currentStore.acik_hesap_tutari,
          bakiye: currentStore.bakiye,                   // 🆕 Bakiye alanı
          currency: currentStore.currency || 'TRY',      // 🆕 Para birimi alanı
          maksimum_taksit: currentStore.maksimum_taksit, // 🆕 Maksimum taksit alanı
          store_type: currentStore.store_type,           // 🆕 Mağaza türü alanı
          is_active: currentStore.is_active,
        });
      } else {
        throw new Error(result.message || 'Mağaza bilgileri alınamadı');
      }
    } catch (error) {
      showNotice('Mağaza bilgileri yüklenirken bir hata oluştu', true);
    }
  };

  const onFinish = async (values: UpdateStoreData) => {
    if (!store) return;
    
    setLoading(true);
    try {
      // Editör maddi alanları güncelleyemez
      const payload = isAdmin
        ? values
        : (() => {
            const {
              bakiye,
              currency,
              acik_hesap_tutari,
              limitsiz_acik_hesap,
              maksimum_taksit,
              ...rest
            } = values as UpdateStoreData & Record<string, unknown>;
            return rest;
          })();

      // Admin API endpoint'ini kullan
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/admin/stores/${store.store_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Mağaza güncellenemedi');
      }

      const result = await response.json();
      if (result.success) {
        showNotice('Mağaza başarıyla güncellendi');
      } else {
        throw new Error(result.message || 'Mağaza güncellenemedi');
      }
    } catch (error: any) {
      showNotice(error.message || 'Mağaza güncellenirken bir hata oluştu', true);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminOrEditor) return null;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/dashboard/magazalar')}
            className="mb-3 text-sm font-medium text-slate-500 transition hover:text-[#00365a]"
          >
            Mağazalara dön
          </button>
          <h1 className="text-2xl font-light tracking-[0.08em] text-neutral-900 sm:text-3xl">Mağaza Düzenle</h1>
          <div className="mt-3 h-px w-[min(100%,20rem)] bg-neutral-300" />
          <p className="mt-3 text-sm text-slate-500">Mağaza bilgilerini güncelleyin</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Kurum Adı <span className="text-red-500">*</span></span>}
                name="kurum_adi"
                rules={[{ required: true, message: 'Lütfen kurum adını giriniz' }]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Vergi Numarası <span className="text-red-500">*</span></span>}
                name="vergi_numarasi"
                rules={[{ required: true, message: 'Lütfen vergi numarasını giriniz' }]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Vergi Dairesi <span className="text-red-500">*</span></span>}
                name="vergi_dairesi"
                rules={[{ required: true, message: 'Lütfen vergi dairesini giriniz' }]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Yetkili Adı <span className="text-red-500">*</span></span>}
                name="yetkili_adi"
                rules={[{ required: true, message: 'Lütfen yetkili adını giriniz' }]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Yetkili Soyadı <span className="text-red-500">*</span></span>}
                name="yetkili_soyadi"
                rules={[{ required: true, message: 'Lütfen yetkili soyadını giriniz' }]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">TCKN <span className="text-red-500">*</span></span>}
                name="tckn"
                rules={[
                  { required: true, message: 'Lütfen TCKN giriniz' },
                  { len: 11, message: 'TCKN 11 haneli olmalıdır' },
                  { pattern: /^[0-9]+$/, message: 'TCKN sadece sayılardan oluşmalıdır' }
                ]}
              >
                <Input maxLength={11} placeholder="12345678901" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Telefon <span className="text-red-500">*</span></span>}
                name="telefon"
                rules={[{ required: true, message: 'Lütfen telefon numarasını giriniz' }]}
              >
                <Input placeholder="05XX XXX XX XX" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">E-posta <span className="text-red-500">*</span></span>}
                name="eposta"
                rules={[
                  { required: true, message: 'Lütfen e-posta adresini giriniz' },
                  { type: 'email', message: 'Geçerli bir e-posta adresi giriniz' }
                ]}
              >
                <Input className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Faks Numarası</span>}
                name="faks_numarasi"
              >
                <Input placeholder="05XX XXX XX XX" className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25" />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza Türü <span className="text-red-500">*</span></span>}
                name="store_type"
                rules={[{ required: true, message: 'Lütfen mağaza türü seçiniz' }]}
              >
                <Select
                  className="w-full"
                  placeholder="Mağaza türü seçiniz..."
                  optionRender={(option) => (
                    <div className="flex items-center gap-2">
                      {storeTypeIcons[option.value as StoreType]}
                      <span>{option.label}</span>
                    </div>
                  )}
                >
                  {Object.entries(storeTypeLabels).map(([key, label]) => (
                    <Select.Option key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {storeTypeIcons[key as StoreType]}
                        <span>{label}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Açıklama</span>}
                name="aciklama"
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25 resize-none" />
              </Form.Item>

              {isAdmin && (
                <>
              {/* 🆕 Para Birimi Alanı */}
              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Para Birimi <span className="text-red-500">*</span></span>}
                name="currency"
                rules={[{ required: true, message: 'Lütfen para birimi seçiniz' }]}
                tooltip="Mağazanın kullanacağı para birimi"
              >
                <Select
                  className="w-full"
                  placeholder="Para birimi seçiniz..."
                >
                  {CURRENCIES.map((currency) => (
                    <Select.Option key={currency.value} value={currency.value}>
                      {currency.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              {/* 🆕 Bakiye Alanı */}
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.currency !== currentValues.currency}
              >
                {({ getFieldValue }) => {
                  const selectedCurrency = getFieldValue('currency') || 'TRY';
                  const currencySymbol = CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '₺';
                  return (
                    <Form.Item
                      label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Mağaza Bakiyesi ({currencySymbol}) <span className="text-red-500">*</span></span>}
                      name="bakiye"
                      rules={[{ required: true, message: 'Lütfen mağaza bakiyesini giriniz' }]}
                      tooltip="Mağazanın doğrudan kullanabileceği para miktarı"
                    >
                      <InputNumber
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => value ? Number(value.replace(/[^\d.-]/g, '')) : 0}
                        precision={2}
                        placeholder="0.00"
                      />
                    </Form.Item>
                  );
                }}
              </Form.Item>

              {/* 🆕 Maksimum Taksit Sayısı */}
              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Maksimum Taksit Sayısı <span className="text-red-500">*</span></span>}
                name="maksimum_taksit"
                rules={[{ required: true, message: 'Lütfen maksimum taksit sayısını giriniz' }]}
                tooltip="Mağazanın kullanabileceği maksimum taksit sayısı"
              >
                <InputNumber
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                  min={1}
                  max={48}
                  placeholder="1"
                />
              </Form.Item>

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Limitsiz Açık Hesap</span>}
                name="limitsiz_acik_hesap"
                valuePropName="checked"
                tooltip="Bu seçenek aktifse mağaza sınırsız açık hesap kullanabilir"
              >
                <Switch className="ant-switch-custom" />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.limitsiz_acik_hesap !== currentValues.limitsiz_acik_hesap}
              >
                {({ getFieldValue }) => {
                  const isLimitsiz = getFieldValue('limitsiz_acik_hesap');
                  return !isLimitsiz ? (
                    <Form.Item
                      noStyle
                      shouldUpdate={(prevValues, currentValues) => prevValues.currency !== currentValues.currency}
                    >
                      {({ getFieldValue }) => {
                        const selectedCurrency = getFieldValue('currency') || 'TRY';
                        const currencySymbol = CURRENCIES.find(c => c.value === selectedCurrency)?.symbol || '₺';
                        return (
                          <Form.Item
                            label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Açık Hesap Limiti ({currencySymbol}) <span className="text-red-500">*</span></span>}
                            name="acik_hesap_tutari"
                            rules={[{ required: true, message: 'Lütfen açık hesap limitini giriniz' }]}
                            tooltip="Mağazanın bakiyesi bittiğinde kullanabileceği açık hesap limiti"
                          >
                            <InputNumber
                              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 transition hover:bg-white focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00365a]/25"
                              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                              parser={(value: string | undefined) => value ? Number(value.replace(/[^\d.]/g, '')) : 0}
                              min={0}
                              precision={2}
                              placeholder="0.00"
                            />
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>

                </>
              )}

              <Form.Item
                label={<span className="text-xs font-medium uppercase tracking-wide text-slate-500">Aktif</span>}
                name="is_active"
                valuePropName="checked"
              >
                <Switch className="ant-switch-custom" />
              </Form.Item>
            </div>

            {isAdmin && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <h4 className="mb-2 text-sm font-semibold text-slate-900">Ödeme sistemi</h4>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>Bakiye, mağazanın kullanabileceği tutardır. Negatif değer borç anlamına gelir.</li>
                  <li>Sipariş tutarları mağaza bakiyesinden düşülür.</li>
                </ul>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200/80 pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard/magazalar')}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => form.submit()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#00365a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#004170] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </Form>
        </div>
        {notice.isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-200/80 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">{notice.title}</h3>
              <p className={`mb-6 text-sm ${notice.isError ? 'text-rose-700' : 'text-slate-500'}`}>{notice.message}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const shouldLeave = notice.message === 'Mağaza başarıyla güncellendi' || notice.message === 'Mağaza bulunamadı';
                    setNotice((prev) => ({ ...prev, isOpen: false }));
                    if (shouldLeave) router.push('/dashboard/magazalar');
                  }}
                  className="rounded-lg bg-[#00365a] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#004170]"
                >
                  Tamam
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 