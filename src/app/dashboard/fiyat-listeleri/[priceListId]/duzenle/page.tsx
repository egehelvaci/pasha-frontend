'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Form, Input, DatePicker, Select, Table, message } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs from 'dayjs';
import { PriceList, updatePriceList, UpdatePriceListData } from '@/services/api';

interface CollectionPrice {
  collectionId: string;
  name: string;
  pricePerSquareMeter: number;
}

export default function EditPriceListPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [collectionPrices, setCollectionPrices] = useState<CollectionPrice[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchPriceList = async () => {
      try {
        const response = await fetch(`https://pasha-backend-production.up.railway.app/api/price-lists/${params.priceListId}`);
        if (!response.ok) {
          throw new Error('Fiyat listesi bulunamadı');
        }
        const data = await response.json();
        setPriceList(data.data);
        setCollectionPrices(data.data.collectionPrices || []);
        
        form.setFieldsValue({
          name: data.data.name,
          description: data.data.description,
          currency: data.data.currency,
          validFrom: data.data.validFrom ? dayjs(data.data.validFrom) : undefined,
          validTo: data.data.validTo ? dayjs(data.data.validTo) : undefined,
          limitAmount: data.data.limitAmount,
        });
      } catch (error) {
        message.error('Fiyat listesi yüklenirken bir hata oluştu');
        router.push('/dashboard/fiyat-listeleri');
      }
    };

    fetchPriceList();
  }, [params.priceListId, form]);

  const onFinish = async (values: any) => {
    if (!priceList) return;

    setLoading(true);
    try {
      const updateData: UpdatePriceListData = {
        name: values.name,
        description: values.description,
        currency: values.currency,
        validFrom: values.validFrom ? dayjs(values.validFrom).format('YYYY-MM-DD') : undefined,
        validTo: values.validTo ? dayjs(values.validTo).format('YYYY-MM-DD') : undefined,
        limitAmount: values.limitAmount,
        collectionPrices: collectionPrices.map(cp => ({
          collectionId: cp.collectionId,
          pricePerSquareMeter: cp.pricePerSquareMeter
        }))
      };

      await updatePriceList(params.priceListId as string, updateData);
      message.success('Fiyat listesi başarıyla güncellendi');
      router.push('/dashboard/fiyat-listeleri');
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (collectionId: string, value: number) => {
    setCollectionPrices(prev => prev.map(cp => 
      cp.collectionId === collectionId ? { ...cp, pricePerSquareMeter: value } : cp
    ));
  };

  const columns = [
    {
      title: 'Koleksiyon',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Metrekare Fiyatı',
      dataIndex: 'pricePerSquareMeter',
      key: 'pricePerSquareMeter',
      render: (value: number, record: CollectionPrice) => (
        <Input
          type="number"
          value={value}
          onChange={(e) => handlePriceChange(record.collectionId, parseFloat(e.target.value))}
          step="0.01"
          min="0"
        />
      ),
    },
  ];

  if (!priceList) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <Card title="Fiyat Listesi Düzenle">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="Fiyat Listesi Adı"
            name="name"
            rules={[{ required: true, message: 'Lütfen fiyat listesi adını girin' }]}
          >
            <Input placeholder="Fiyat listesi adı" />
          </Form.Item>

          <Form.Item
            label="Açıklama"
            name="description"
            rules={[{ required: true, message: 'Lütfen açıklama girin' }]}
          >
            <Input.TextArea rows={4} placeholder="Açıklama" />
          </Form.Item>

          <Form.Item
            label="Para Birimi"
            name="currency"
            rules={[{ required: true, message: 'Lütfen para birimi seçin' }]}
          >
            <Select>
              <Select.Option value="TRY">TRY</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
            </Select>
          </Form.Item>

          {!priceList.is_default && (
            <>
              <Form.Item
                label="Geçerlilik Başlangıç"
                name="validFrom"
              >
                <DatePicker className="w-full" format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item
                label="Geçerlilik Bitiş"
                name="validTo"
              >
                <DatePicker className="w-full" format="DD.MM.YYYY" />
              </Form.Item>

              <Form.Item
                label="Limit Tutar"
                name="limitAmount"
              >
                <Input type="number" placeholder="Limit tutar" />
              </Form.Item>
            </>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Koleksiyon Fiyatları</h3>
            <Table
              columns={columns}
              dataSource={collectionPrices}
              rowKey="collectionId"
              pagination={false}
            />
          </div>

          <Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={() => router.back()}>İptal</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Kaydet
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 