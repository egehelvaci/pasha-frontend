'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PriceList, CreatePriceListData, getPriceLists, updatePriceList } from '@/services/api';
import { Button, Form, Input, InputNumber, DatePicker, Modal, message, Select, Switch } from 'antd';
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
  isActive: boolean;
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

export default function EditPriceListPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [antForm] = Form.useForm();
  const [collectionPricesData, setCollectionPricesData] = useState<Record<string, number>>({});
  
  // API çağrısını takip etmek için ref oluştur
  const priceListsFetchedRef = useRef(false);
  // Kod yeniden yüklendiğinde temiz bir başlangıç yapılması için
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // İlk render'da tüm bağlantıları temizle ve yeniden başlat
    isInitializedRef.current = true;
    
    // Temizleme fonksiyonu
    return () => {
      isInitializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (!priceListsFetchedRef.current) {
      priceListsFetchedRef.current = true;
      fetchData();
    }
  }, [isAdmin, router]);

  // Form değerlerinin değişimini izle
  const onValuesChange = (changedValues: any, allValues: FormValues) => {
    if (isInitializedRef.current) {
      setCollectionPricesData(allValues.collectionPrices || {});
    }
  };

  const fetchData = async () => {
    try {
      // Koleksiyonları getir
      const collectionsResponse = await fetch('https://pasha-backend-production.up.railway.app/api/collections/');
      const collectionsData = await collectionsResponse.json();
      setCollections(collectionsData.data || []);

      // Fiyat listesini getir
      const priceLists = await getPriceLists();
      const currentPriceList = priceLists.find(p => p.price_list_id === params.priceListId);
      
      if (!currentPriceList) {
        message.error('Fiyat listesi bulunamadı');
        router.push('/dashboard/fiyat-listeleri');
        return;
      }

      setPriceList(currentPriceList);

      // Doğrudan fiyat listesi detaylarını getir
      try {
        const detailResponse = await fetch(`https://pasha-backend-production.up.railway.app/api/price-lists/${params.priceListId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const detailData = await detailResponse.json() as PriceListDetailResponse;
        
        if (detailData.success) {
          // Form alanlarını doldur
          const collectionPrices: Record<string, number> = {};
          
          // PriceListDetail içerisindeki koleksiyon ID ve fiyatları doldur
          detailData.data.PriceListDetail?.forEach((detail: PriceListDetailItem) => {
            collectionPrices[detail.collection_id] = detail.price_per_square_meter;
          });

          console.log('API yanıtı:', detailData);
          console.log('Koleksiyon fiyatları:', collectionPrices);
          
          // Koleksiyon fiyatlarını state'e kaydet
          setCollectionPricesData(collectionPrices);

          antForm.setFieldsValue({
            name: currentPriceList.name,
            description: currentPriceList.description,
            validity: currentPriceList.valid_from && currentPriceList.valid_to ? 
              [dayjs(currentPriceList.valid_from), dayjs(currentPriceList.valid_to)] : undefined,
            limitAmount: currentPriceList.limit_amount,
            currency: currentPriceList.currency,
            isActive: currentPriceList.is_active,
            collectionPrices,
          });

          // Form alanlarının güncel değerlerini yazdır
          console.log('Form alanlarına yüklenen değerler:', antForm.getFieldsValue());
        }
      } catch (error) {
        console.error('Fiyat listesi detayı getirilemedi:', error);
        
        // Detay getirilemezse ana fiyat listesi verilerini kullan
        antForm.setFieldsValue({
          name: currentPriceList.name,
          description: currentPriceList.description,
          validity: currentPriceList.valid_from && currentPriceList.valid_to ? 
            [dayjs(currentPriceList.valid_from), dayjs(currentPriceList.valid_to)] : undefined,
          limitAmount: currentPriceList.limit_amount,
          currency: currentPriceList.currency,
          isActive: currentPriceList.is_active,
        });
      }
    } catch (error) {
      message.error('Veriler yüklenirken bir hata oluştu');
    }
  };

  const onFinish = async (values: FormValues) => {
    if (!priceList) return;

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
      is_active: values.isActive,
      collectionPrices,
    };

    setLoading(true);
    try {
      await updatePriceList(priceList.price_list_id, data);
      message.success('Fiyat listesi başarıyla güncellendi');
      router.push('/dashboard/fiyat-listeleri');
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex items-center justify-center min-h-screen p-4 fixed inset-0 bg-black bg-opacity-50 z-50">
      <Modal
        title="Fiyat Listesi Düzenle"
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
            form={antForm}
            layout="vertical"
            onFinish={onFinish}
            onValuesChange={onValuesChange}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Liste Adı"
                name="name"
                rules={[{ required: true, message: 'Lütfen liste adını giriniz' }]}
                className="md:col-span-2"
              >
                <Input disabled={priceList?.is_default} />
              </Form.Item>

              <Form.Item
                label="Açıklama"
                name="description"
                rules={[{ required: true, message: 'Lütfen açıklama giriniz' }]}
                className="md:col-span-2"
              >
                <Input.TextArea rows={3} disabled={priceList?.is_default} />
              </Form.Item>

              <Form.Item
                label="Geçerlilik Tarihi"
                name="validity"
              >
                <RangePicker
                  className="w-full"
                  format="DD.MM.YYYY"
                  disabled={priceList?.is_default}
                />
              </Form.Item>

              <Form.Item
                label="Para Birimi"
                name="currency"
                rules={[{ required: true, message: 'Lütfen para birimi seçiniz' }]}
              >
                <Select disabled={priceList?.is_default}>
                  <Select.Option value="TRY">TRY</Select.Option>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                </Select>
              </Form.Item>

              {!priceList?.is_default && (
                <Form.Item
                  label="Durum"
                  name="isActive"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren="Aktif"
                    unCheckedChildren="Pasif"
                  />
                </Form.Item>
              )}

              <Form.Item
                label="Limit Tutarı"
                name="limitAmount"
                className="md:col-span-2"
              >
                <InputNumber
                  className="w-full"
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  min={0}
                  disabled={priceList?.is_default}
                />
              </Form.Item>

              <div className="md:col-span-2">
                <h3 className="font-semibold mb-4">Koleksiyon Fiyatları</h3>
                {Object.keys(collectionPricesData).length > 0 && (
                  <div className="bg-blue-50 p-3 mb-4 rounded-md border border-blue-200 text-sm text-blue-700">
                    <div className="font-medium mb-1">Mevcut Fiyatlar:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {collections.map(collection => {
                        const price = collectionPricesData[collection.collectionId];
                        if (price !== undefined) {
                          return (
                            <div key={collection.collectionId}>
                              <strong>{collection.name}:</strong> {price.toLocaleString('tr-TR')} {priceList?.currency || 'TRY'}/m²
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {collections.map((collection) => (
                    <Form.Item
                      key={collection.collectionId}
                      label={collection.name}
                      name={['collectionPrices', collection.collectionId]}
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        min={0}
                        step={0.01}
                        placeholder={`${collection.code}`}
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