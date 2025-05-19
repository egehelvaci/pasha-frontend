'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Price, getProductPrices, updatePrice } from '@/services/api';
import { Button, Card, Form, Input, DatePicker, message, Select } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs from 'dayjs';

interface PriceFormData {
  price: number;
  currency: string;
  validFrom: dayjs.Dayjs;
  validTo?: dayjs.Dayjs;
}

export default function EditPricePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<Price | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const prices = await getProductPrices(params.productId as string);
        const currentPrice = prices.find(p => p.id === params.priceId);
        if (currentPrice) {
          setPrice(currentPrice);
          form.setFieldsValue({
            price: currentPrice.price,
            currency: currentPrice.currency,
            validFrom: dayjs(currentPrice.validFrom),
            validTo: currentPrice.validTo ? dayjs(currentPrice.validTo) : undefined,
          });
        } else {
          message.error('Fiyat bulunamadı');
          router.push(`/dashboard/urunler/${params.productId}/fiyatlar`);
        }
      } catch (error) {
        message.error('Fiyat bilgileri yüklenirken bir hata oluştu');
      }
    };

    fetchPrice();
  }, [params.productId, params.priceId, form]);

  const onFinish = async (values: PriceFormData) => {
    if (!price) return;

    setLoading(true);
    try {
      await updatePrice(price.id, {
        price: values.price,
        currency: values.currency,
        validFrom: values.validFrom.format('YYYY-MM-DD'),
        validTo: values.validTo?.format('YYYY-MM-DD'),
      });

      message.success('Fiyat başarıyla güncellendi');
      router.push(`/dashboard/urunler/${params.productId}/fiyatlar`);
    } catch (error) {
      message.error('Fiyat güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const disabledDate: DatePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().startOf('day');
  };

  if (!price) {
    return <div className="p-6">Yükleniyor...</div>;
  }

  return (
    <div className="p-6">
      <Card title="Fiyat Düzenle">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            label="Fiyat"
            name="price"
            rules={[
              { required: true, message: 'Lütfen fiyat giriniz' },
              { type: 'number', min: 0, message: 'Fiyat 0\'dan büyük olmalıdır' },
            ]}
          >
            <Input type="number" step="0.01" />
          </Form.Item>

          <Form.Item
            label="Para Birimi"
            name="currency"
            rules={[{ required: true, message: 'Lütfen para birimi seçiniz' }]}
          >
            <Select>
              <Select.Option value="TL">TL</Select.Option>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Geçerlilik Başlangıcı"
            name="validFrom"
            rules={[{ required: true, message: 'Lütfen geçerlilik başlangıç tarihi seçiniz' }]}
          >
            <DatePicker disabledDate={disabledDate} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item
            label="Geçerlilik Bitişi"
            name="validTo"
          >
            <DatePicker disabledDate={disabledDate} format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item>
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" loading={loading}>
                Kaydet
              </Button>
              <Button onClick={() => router.push(`/dashboard/urunler/${params.productId}/fiyatlar`)}>
                İptal
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
} 