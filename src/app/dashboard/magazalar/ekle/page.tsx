'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateStoreData, createStore } from '@/services/api';
import { Button, Form, Input, InputNumber, Switch, message, Modal } from 'antd';
import { useAuth } from '@/app/context/AuthContext';

export default function AddStorePage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
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
      await createStore(values);
      message.success('Mağaza başarıyla oluşturuldu');
      router.push('/dashboard/magazalar');
    } catch (error: any) {
      message.error(error.message || 'Mağaza oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
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
            initialValues={{
              limitsiz_acik_hesap: false,
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

              <Form.Item
                label="Limitsiz Açık Hesap"
                name="limitsiz_acik_hesap"
                valuePropName="checked"
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
                      label="Açık Hesap Tutarı"
                      name="acik_hesap_tutari"
                      rules={[{ required: true, message: 'Lütfen açık hesap tutarını giriniz' }]}
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(value) => value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0}
                        min={0}
                      />
                    </Form.Item>
                  ) : null;
                }}
              </Form.Item>
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