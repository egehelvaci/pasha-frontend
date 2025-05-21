'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreatePriceListData, createPriceList } from '@/services/api';
import { Button, Form, Input, InputNumber, DatePicker, Modal, message, Select } from 'antd';
import { useAuth } from '@/app/context/AuthContext';
import dayjs from 'dayjs';
import type { Collection } from '@/services/api';

const { RangePicker } = DatePicker;

export default function AddPriceListPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchCollections();
  }, [isAdmin, router]);

  const fetchCollections = async () => {
    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/collections/');
      const data = await response.json();
      setCollections(data.data || []);
    } catch (error) {
      message.error('Koleksiyonlar yüklenirken bir hata oluştu');
    }
  };

  const onFinish = async (values: any) => {
    const dateRange = values.validity || [];
    const collectionPrices = Object.entries(values.collectionPrices || {}).map(([collectionId, price]) => ({
      collectionId,
      pricePerSquareMeter: Number(price),
    }));

    const data: CreatePriceListData = {
      name: values.name,
      description: values.description,
      validFrom: dateRange[0]?.toISOString(),
      validTo: dateRange[1]?.toISOString(),
      limitAmount: values.limitAmount,
      currency: values.currency,
      collectionPrices,
    };

    setLoading(true);
    try {
      await createPriceList(data);
      message.success('Fiyat listesi başarıyla oluşturuldu');
      router.push('/dashboard/fiyat-listeleri');
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 fixed inset-0 bg-black bg-opacity-50 z-50">
      <Modal
        title="Yeni Fiyat Listesi"
        open={true}
        onCancel={() => router.push('/dashboard/fiyat-listeleri')}
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
              currency: 'TRY',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Liste Adı"
                name="name"
                rules={[{ required: true, message: 'Lütfen liste adını giriniz' }]}
                className="md:col-span-2"
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Açıklama"
                name="description"
                rules={[{ required: true, message: 'Lütfen açıklama giriniz' }]}
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} />
              </Form.Item>

              <Form.Item
                label="Geçerlilik Tarihi"
                name="validity"
              >
                <RangePicker
                  className="w-full"
                  showTime
                  format="DD.MM.YYYY HH:mm"
                />
              </Form.Item>

              <Form.Item
                label="Para Birimi"
                name="currency"
                rules={[{ required: true, message: 'Lütfen para birimi seçiniz' }]}
              >
                <Select>
                  <Select.Option value="TRY">TRY</Select.Option>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Limit Tutarı"
                name="limitAmount"
                className="md:col-span-2"
              >
                <InputNumber
                  className="w-full"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  min={0}
                />
              </Form.Item>

              <div className="md:col-span-2">
                <h3 className="font-semibold mb-4">Koleksiyon Fiyatları</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collections.map((collection) => (
                    <Form.Item
                      key={collection.collectionId}
                      label={collection.name}
                      name={['collectionPrices', collection.collectionId]}
                      rules={[{ required: true, message: 'Lütfen fiyat giriniz' }]}
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        min={0}
                        step={0.01}
                      />
                    </Form.Item>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 sticky bottom-0 bg-white py-4 border-t">
              <Button onClick={() => router.push('/dashboard/fiyat-listeleri')}>
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