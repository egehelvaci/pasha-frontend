'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, DatePicker, Select, Switch, message } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs from 'dayjs';
import { API_BASE_URL } from '@/services/api';

interface PriceListFormData {
  name: string;
  description: string;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  valid_from?: string;
  valid_to?: string;
  limit_amount?: number;
}

export default function AddPriceListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: PriceListFormData) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/price-lists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          valid_from: values.valid_from ? dayjs(values.valid_from).format('YYYY-MM-DD') : null,
          valid_to: values.valid_to ? dayjs(values.valid_to).format('YYYY-MM-DD') : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Fiyat listesi eklenirken bir hata oluştu');
      }

      message.success('Fiyat listesi başarıyla eklendi');
      router.push('/dashboard/fiyat-listeleri');
    } catch (error) {
      message.error('Fiyat listesi eklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Card title="Yeni Fiyat Listesi">
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            currency: 'TRY',
            is_default: false,
            is_active: true,
          }}
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

          <Form.Item
            label="Geçerlilik Başlangıç"
            name="valid_from"
          >
            <DatePicker className="w-full" format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item
            label="Geçerlilik Bitiş"
            name="valid_to"
          >
            <DatePicker className="w-full" format="DD.MM.YYYY" />
          </Form.Item>

          <Form.Item
            label="Limit Tutar"
            name="limit_amount"
          >
            <Input type="number" placeholder="Limit tutar" />
          </Form.Item>

          <Form.Item
            label="Varsayılan Liste"
            name="is_default"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Aktif"
            name="is_active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

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