'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreatePriceListData, createPriceList, getPriceLists } from '@/services/api';
import { Button, Form, Input, InputNumber, DatePicker, Modal, message, Select } from 'antd';
import { useAuth } from '@/app/context/AuthContext';
import dayjs from 'dayjs';
import type { Collection } from '@/services/api';

// Form için değerlerin tipini tanımla
interface FormValues {
  name: string;
  description: string;
  validity: [dayjs.Dayjs, dayjs.Dayjs] | undefined;
  limitAmount?: number;
  currency: string;
  collectionPrices: Record<string, number>;
}

// API yanıt tipi
interface PriceListDetailItem {
  price_list_detail_id: string;
  price_list_id: string;
  collection_id: string;
  price_per_square_meter: number;
  created_at: string;
  updated_at: string;
  Collection: {
    collectionId: string;
    name: string;
    code: string;
    description: string;
  }
}

interface PriceListDetailResponse {
  success: boolean;
  data: {
    price_list_id: string;
    name: string;
    description: string;
    is_default: boolean;
    valid_from: string | null;
    valid_to: string | null;
    limit_amount: number | null;
    currency: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    PriceListDetail: PriceListDetailItem[];
  }
}

const { RangePicker } = DatePicker;

export default function AddPriceListPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [defaultPrices, setDefaultPrices] = useState<Record<string, number>>({});
  const [form] = Form.useForm();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchInitialData();
  }, [isAdmin, router]);

  const fetchInitialData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([
        fetchCollections(),
        fetchDefaultPriceList()
      ]);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await fetch('https://pasha-backend-production.up.railway.app/api/collections/');
      const data = await response.json();
      setCollections(data.data || []);
    } catch (error) {
      message.error('Koleksiyonlar yüklenirken bir hata oluştu');
    }
  };

  const fetchDefaultPriceList = async () => {
    try {
      // Tüm fiyat listelerini al
      const priceLists = await getPriceLists();
      
      // Varsayılan fiyat listesini bul
      const defaultPriceList = priceLists.find(list => list.is_default);
      
      if (defaultPriceList) {
        // Varsayılan fiyat listesinin detaylarını al
        const detailResponse = await fetch(`https://pasha-backend-production.up.railway.app/api/price-lists/${defaultPriceList.price_list_id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const detailData = await detailResponse.json() as PriceListDetailResponse;
        
        if (detailData.success) {
          // Koleksiyon fiyatlarını kaydet
          const prices: Record<string, number> = {};
          detailData.data.PriceListDetail?.forEach((detail: PriceListDetailItem) => {
            prices[detail.collection_id] = detail.price_per_square_meter;
          });
          
          setDefaultPrices(prices);
          
          // Form alanına varsayılan değerleri ata
          form.setFieldsValue({
            collectionPrices: prices,
            currency: detailData.data.currency || 'TRY'
          });
        }
      }
    } catch (error) {
      console.error('Varsayılan fiyat listesi yüklenirken hata:', error);
      // Hata olsa bile devam et, sadece varsayılan fiyatlar gelmez
    }
  };

  const onFinish = async (values: FormValues) => {
    const dateRange = values.validity || [];
    // Sadece değer girilmiş olan koleksiyon fiyatlarını dahil et
    const collectionPrices = Object.entries(values.collectionPrices || {})
      .filter(([_, price]) => price !== undefined && price !== null)
      .map(([collectionId, price]) => ({
        collectionId,
        pricePerSquareMeter: Number(price),
      }));

    // Tarihler için saat bilgisini ayarla 
    const validFrom = dateRange[0] ? dateRange[0].hour(0).minute(0).second(0).toISOString() : undefined;
    const validTo = dateRange[1] ? dateRange[1].hour(23).minute(59).second(59).toISOString() : undefined;

    const data: CreatePriceListData = {
      name: values.name,
      description: values.description,
      validFrom,
      validTo,
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
          {loadingData ? (
            <div className="flex justify-center items-center py-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mb-4"></div>
                <div className="text-gray-600">Varsayılan veriler yükleniyor...</div>
              </div>
            </div>
          ) : (
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
                    format="DD.MM.YYYY"
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
                  {Object.keys(defaultPrices).length > 0 && (
                    <div className="bg-blue-50 p-3 mb-4 rounded-md border border-blue-200 text-sm text-blue-700">
                      <div className="font-medium mb-1">Bilgi:</div>
                      <p>
                        Koleksiyon fiyatları varsayılan fiyat listesinden otomatik olarak doldurulmuştur. 
                        İsterseniz bu fiyatları değiştirebilirsiniz.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {collections.map((collection) => (
                      <Form.Item
                        key={collection.collectionId}
                        label={collection.name}
                        name={['collectionPrices', collection.collectionId]}
                        // rules={[{ required: true, message: 'Lütfen fiyat giriniz' }]}
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
          )}
        </div>
      </Modal>
    </div>
  );
} 