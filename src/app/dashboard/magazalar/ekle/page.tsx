'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateStoreData, createStore } from '@/services/api';
import { Button, Form, Input, InputNumber, Switch, message, Modal } from 'antd';
import { useAuth } from '@/app/context/AuthContext';

export default function AddStorePage() {
  const router = useRouter();
  const { isAdmin, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, router]);

  const onFinish = async (values: CreateStoreData) => {
    setLoading(true);
    try {
      // Admin API endpoint'ini kullan
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Mağaza oluşturulamadı');
      }

      const result = await response.json();
      if (result.success) {
        message.success('Mağaza başarıyla oluşturuldu');
        router.push('/dashboard/magazalar');
      } else {
        throw new Error(result.message || 'Mağaza oluşturulamadı');
      }
    } catch (error: any) {
      message.error(error.message || 'Mağaza oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onValuesChange = (changedValues: any, allValues: any) => {
    console.log('Form değerleri değişti:', changedValues);
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 fixed inset-0 bg-black bg-opacity-50 z-50">
      <Modal
        title="Yeni Mağaza Ekle"
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
            onValuesChange={onValuesChange}
            initialValues={{
              limitsiz_acik_hesap: false,
              bakiye: 0,
              maksimum_taksit: 1,
            }}
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
                tooltip="Mağazanın kullanabileceği mevcut bakiye tutarı"
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