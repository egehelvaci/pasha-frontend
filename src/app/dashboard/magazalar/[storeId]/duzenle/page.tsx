'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store, UpdateStoreData } from '@/services/api';
import { Button, Form, Input, InputNumber, Switch, message, Modal } from 'antd';
import { useAuth } from '@/app/context/AuthContext';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchStore();
  }, [isAdmin, router]);

  const fetchStore = async () => {
    try {
      // Admin API endpoint'ini kullan
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/stores`, {
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
          telefon: currentStore.telefon,
          eposta: currentStore.eposta,
          adres: currentStore.adres,
          faks_numarasi: currentStore.faks_numarasi,
          aciklama: currentStore.aciklama,
          limitsiz_acik_hesap: currentStore.limitsiz_acik_hesap,
          acik_hesap_tutari: currentStore.acik_hesap_tutari,
          bakiye: currentStore.bakiye,                   // 🆕 Bakiye alanı
          maksimum_taksit: currentStore.maksimum_taksit, // 🆕 Maksimum taksit alanı
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
      // Admin API endpoint'ini kullan
      const response = await fetch(`https://pasha-backend-production.up.railway.app/api/admin/stores/${store.store_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
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

  if (!isAdmin) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 fixed inset-0 bg-black bg-opacity-50 z-50">
      <Modal
        title="Mağaza Düzenle"
        open={true}
        onCancel={() => router.push('/dashboard/magazalar')}
        footer={null}
        width="95%"
        style={{ maxWidth: '800px', margin: '0 auto', top: 20 }}
        centered
        maskClosable={false}
        className="relative"
      >
        <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Kurum Adı"
                name="kurum_adi"
                rules={[{ required: true, message: 'Lütfen kurum adını giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Vergi Numarası"
                name="vergi_numarasi"
                rules={[{ required: true, message: 'Lütfen vergi numarasını giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Vergi Dairesi"
                name="vergi_dairesi"
                rules={[{ required: true, message: 'Lütfen vergi dairesini giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Yetkili Adı"
                name="yetkili_adi"
                rules={[{ required: true, message: 'Lütfen yetkili adını giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Yetkili Soyadı"
                name="yetkili_soyadi"
                rules={[{ required: true, message: 'Lütfen yetkili soyadını giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Telefon"
                name="telefon"
                rules={[{ required: true, message: 'Lütfen telefon numarasını giriniz' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="E-posta"
                name="eposta"
                rules={[
                  { required: true, message: 'Lütfen e-posta adresini giriniz' },
                  { type: 'email', message: 'Geçerli bir e-posta adresi giriniz' }
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Faks Numarası"
                name="faks_numarasi"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Adres"
                name="adres"
                rules={[{ required: true, message: 'Lütfen adresi giriniz' }]}
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item
                label="Açıklama"
                name="aciklama"
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              {/* 🆕 Bakiye Alanı */}
              <Form.Item
                label="Mağaza Bakiyesi (TL)"
                name="bakiye"
                rules={[{ required: true, message: 'Lütfen mağaza bakiyesini giriniz' }]}
                tooltip="Mağazanın doğrudan kullanabileceği para miktarı"
              >
                <InputNumber
                  className="w-full"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value: string | undefined) => value ? Number(value.replace(/[^\d.]/g, '')) : 0}
                  min={0}
                  precision={2}
                  placeholder="0.00"
                />
              </Form.Item>

              {/* 🆕 Maksimum Taksit Sayısı */}
              <Form.Item
                label="Maksimum Taksit Sayısı"
                name="maksimum_taksit"
                rules={[{ required: true, message: 'Lütfen maksimum taksit sayısını giriniz' }]}
                tooltip="Mağazanın kullanabileceği maksimum taksit sayısı"
              >
                <InputNumber
                  className="w-full"
                  min={1}
                  max={48}
                  placeholder="1"
                />
              </Form.Item>

              <Form.Item
                label="Limitsiz Açık Hesap"
                name="limitsiz_acik_hesap"
                valuePropName="checked"
                tooltip="Bu seçenek aktifse mağaza sınırsız açık hesap kullanabilir"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.limitsiz_acik_hesap !== currentValues.limitsiz_acik_hesap}
              >
                {({ getFieldValue }) => {
                  const isLimitsiz = getFieldValue('limitsiz_acik_hesap');
                  return !isLimitsiz ? (
                    <Form.Item
                      label="Açık Hesap Limiti (TL)"
                      name="acik_hesap_tutari"
                      rules={[{ required: true, message: 'Lütfen açık hesap limitini giriniz' }]}
                      tooltip="Mağazanın bakiyesi bittiğinde kullanabileceği açık hesap limiti"
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value: string | undefined) => value ? Number(value.replace(/[^\d.]/g, '')) : 0}
                        min={0}
                        precision={2}
                        placeholder="0.00"
                      />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>

              <Form.Item
                label="Aktif"
                name="is_active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </div>

            {/* Bilgilendirme Kartı */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Yeni Ödeme Sistemi Bilgileri:</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• <strong>Bakiye:</strong> Mağazanın doğrudan kullanabileceği para miktarı</li>
                <li>• <strong>Açık Hesap Limiti:</strong> Bakiye bittiğinde kullanılabilecek kredi tutarı</li>
                <li>• <strong>Toplam Kullanılabilir:</strong> Bakiye + Açık Hesap Limiti</li>
                <li>• <strong>Sipariş Mantığı:</strong> Önce bakiyeden, sonra açık hesaptan düşülür</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-white py-4 border-t">
              <Button onClick={() => router.push('/dashboard/magazalar')}>
                İptal
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Kaydet
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
} 