'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Price, getProductPrices, deletePrice } from '@/services/api';
import { Button, Card, Table, Modal, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

export default function PriceListPage() {
  const params = useParams();
  const router = useRouter();
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      const data = await getProductPrices(params.productId as string);
      setPrices(data);
    } catch (error) {
      message.error('Fiyatlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, [params.productId]);

  const handleDelete = async () => {
    if (!selectedPriceId) return;

    try {
      await deletePrice(selectedPriceId);
      message.success('Fiyat başarıyla silindi');
      fetchPrices();
    } catch (error) {
      message.error('Fiyat silinirken bir hata oluştu');
    } finally {
      setDeleteModalVisible(false);
      setSelectedPriceId(null);
    }
  };

  const columns = [
    {
      title: 'Fiyat',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `${price.toLocaleString('tr-TR')} ${prices.find(p => p.price === price)?.currency || 'TL'}`,
    },
    {
      title: 'Geçerlilik Başlangıcı',
      dataIndex: 'validFrom',
      key: 'validFrom',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY'),
    },
    {
      title: 'Geçerlilik Bitişi',
      dataIndex: 'validTo',
      key: 'validTo',
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: Price) => (
        <div className="flex gap-2">
          <Button
            icon={<EditOutlined />}
            onClick={() => router.push(`/dashboard/urunler/${params.productId}/fiyatlar/${record.id}/duzenle`)}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              setSelectedPriceId(record.id);
              setDeleteModalVisible(true);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card
        title="Ürün Fiyatları"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push(`/dashboard/urunler/${params.productId}/fiyatlar/ekle`)}
          >
            Yeni Fiyat Ekle
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={prices}
          rowKey="id"
          loading={loading}
        />
      </Card>

      <Modal
        title="Fiyat Silme"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedPriceId(null);
        }}
        okText="Sil"
        cancelText="İptal"
      >
        <p>Bu fiyatı silmek istediğinizden emin misiniz?</p>
      </Modal>
    </div>
  );
} 