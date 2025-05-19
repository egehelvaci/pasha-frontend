'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createPrice } from '@/services/api';
import { Button, Card, Form, Input, DatePicker, message, Select } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs from 'dayjs';

interface PriceFormData {
  price: number;
  currency: string;
  validFrom: dayjs.Dayjs;
  validTo?: dayjs.Dayjs;
}

export default function AddPricePage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: PriceFormData) => {
    setLoading(true);
    try {
      await createPrice({
        productId: params.productId as string,
        price: values.price,
        currency: values.currency,
        validFrom: values.validFrom.format('YYYY-MM-DD'),
        validTo: values.validTo?.format('YYYY-MM-DD'),
      });

      message.success('Fiyat başarıyla eklendi');
      router.push(`/dashboard/urunler/${params.productId}/fiyatlar`);
    } catch (error) {
      message.error('Fiyat eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const disabledDate: DatePickerProps['disabledDate'] = (current) => {
    return current && current < dayjs().startOf('day');
  };

  return (
    <div className="p-6">
      <Card title="Yeni Fiyat Ekle">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            currency: 'TL',
          }}
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