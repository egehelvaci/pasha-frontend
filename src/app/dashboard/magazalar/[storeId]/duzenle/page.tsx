'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store, UpdateStoreData } from '@/services/api';
import { Button, Form, Input, InputNumber, Switch, message, Select } from 'antd';
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
          message.error('Mağaza bulunamadı');
          router.push('/dashboard/magazalar');
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
      message.error('Mağaza bilgileri yüklenirken bir hata oluştu');
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
        message.success('Mağaza başarıyla güncellendi');
        router.push('/dashboard/magazalar');
      } else {
        throw new Error(result.message || 'Mağaza güncellenemedi');
      }
    } catch (error: any) {
      message.error(error.message || 'Mağaza güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdminOrEditor) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-[#00365a] px-6 py-4 relative">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" clipRule="evenodd" />
                </svg>
                Mağaza Düzenle
              </h2>
              <p className="text-blue-100 text-sm mt-1">
                Mağaza bilgilerini güncelleyin
              </p>
            </div>
            <button 
              onClick={() => router.push('/dashboard/magazalar')}
              className="text-white hover:text-blue-200 text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Kurum Adı <span className="text-red-500">*</span></span>}
                name="kurum_adi"
                rules={[{ required: true, message: 'Lütfen kurum adını giriniz' }]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Vergi Numarası <span className="text-red-500">*</span></span>}
                name="vergi_numarasi"
                rules={[{ required: true, message: 'Lütfen vergi numarasını giriniz' }]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Vergi Dairesi <span className="text-red-500">*</span></span>}
                name="vergi_dairesi"
                rules={[{ required: true, message: 'Lütfen vergi dairesini giriniz' }]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Yetkili Adı <span className="text-red-500">*</span></span>}
                name="yetkili_adi"
                rules={[{ required: true, message: 'Lütfen yetkili adını giriniz' }]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Yetkili Soyadı <span className="text-red-500">*</span></span>}
                name="yetkili_soyadi"
                rules={[{ required: true, message: 'Lütfen yetkili soyadını giriniz' }]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">TCKN <span className="text-red-500">*</span></span>}
                name="tckn"
                rules={[
                  { required: true, message: 'Lütfen TCKN giriniz' },
                  { len: 11, message: 'TCKN 11 haneli olmalıdır' },
                  { pattern: /^[0-9]+$/, message: 'TCKN sadece sayılardan oluşmalıdır' }
                ]}
              >
                <Input maxLength={11} placeholder="12345678901" className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Telefon <span className="text-red-500">*</span></span>}
                name="telefon"
                rules={[{ required: true, message: 'Lütfen telefon numarasını giriniz' }]}
              >
                <Input placeholder="05XX XXX XX XX" className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">E-posta <span className="text-red-500">*</span></span>}
                name="eposta"
                rules={[
                  { required: true, message: 'Lütfen e-posta adresini giriniz' },
                  { type: 'email', message: 'Geçerli bir e-posta adresi giriniz' }
                ]}
              >
                <Input className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Faks Numarası</span>}
                name="faks_numarasi"
              >
                <Input placeholder="05XX XXX XX XX" className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors" />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Mağaza Türü <span className="text-red-500">*</span></span>}
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
                label={<span className="text-sm font-medium text-gray-700">Açıklama</span>}
                name="aciklama"
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors resize-none" />
              </Form.Item>

              {isAdmin && (
                <>
              {/* 🆕 Para Birimi Alanı */}
              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Para Birimi <span className="text-red-500">*</span></span>}
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
                      label={<span className="text-sm font-medium text-gray-700">Mağaza Bakiyesi ({currencySymbol}) <span className="text-red-500">*</span></span>}
                      name="bakiye"
                      rules={[{ required: true, message: 'Lütfen mağaza bakiyesini giriniz' }]}
                      tooltip="Mağazanın doğrudan kullanabileceği para miktarı"
                    >
                      <InputNumber
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
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
                label={<span className="text-sm font-medium text-gray-700">Maksimum Taksit Sayısı <span className="text-red-500">*</span></span>}
                name="maksimum_taksit"
                rules={[{ required: true, message: 'Lütfen maksimum taksit sayısını giriniz' }]}
                tooltip="Mağazanın kullanabileceği maksimum taksit sayısı"
              >
                <InputNumber
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
                  min={1}
                  max={48}
                  placeholder="1"
                />
              </Form.Item>

              <Form.Item
                label={<span className="text-sm font-medium text-gray-700">Limitsiz Açık Hesap</span>}
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
                            label={<span className="text-sm font-medium text-gray-700">Açık Hesap Limiti ({currencySymbol}) <span className="text-red-500">*</span></span>}
                            name="acik_hesap_tutari"
                            rules={[{ required: true, message: 'Lütfen açık hesap limitini giriniz' }]}
                            tooltip="Mağazanın bakiyesi bittiğinde kullanabileceği açık hesap limiti"
                          >
                            <InputNumber
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00365a] focus:border-transparent transition-colors"
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
                label={<span className="text-sm font-medium text-gray-700">Aktif</span>}
                name="is_active"
                valuePropName="checked"
              >
                <Switch className="ant-switch-custom" />
              </Form.Item>
            </div>

            {isAdmin && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Ödeme Sistemi Bilgileri:</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Bakiye:</strong> Mağazanın kullanabileceği para miktarı. Negatif değer borç anlamına gelir.</li>
                  <li>• <strong>Sipariş:</strong> Sipariş tutarları mağaza bakiyesinden düşülür.</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => router.push('/dashboard/magazalar')}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
              >
                İptal
              </button>
              <button
                onClick={() => form.submit()}
                disabled={loading}
                className="px-6 py-3 bg-[#00365a] hover:bg-[#004170] text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Kaydet
                  </>
                )}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
} 