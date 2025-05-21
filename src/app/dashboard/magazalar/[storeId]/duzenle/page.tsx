'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Store, UpdateStoreData, getStores, updateStore } from '@/services/api';
import { Button, Form, Input, InputNumber, Switch, message, Modal } from 'antd';
import { useAuth } from '@/app/context/AuthContext';

export default function EditStorePage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin } = useAuth();
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
      const stores = await getStores();
      const currentStore = stores.find(s => s.store_id === params.storeId);
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
        is_active: currentStore.is_active,
      });
    } catch (error) {
      message.error('Mağaza bilgileri yüklenirken bir hata oluştu');
    }
  };

  const onFinish = async (values: UpdateStoreData) => {
    if (!store) return;
    
    setLoading(true);
    try {
      await updateStore(store.store_id, values);
      message.success('Mağaza başarıyla güncellendi');
      router.push('/dashboard/magazalar');
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
                        min={0}
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