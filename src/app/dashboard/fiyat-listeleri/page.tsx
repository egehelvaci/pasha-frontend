'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PriceList, getPriceLists, deletePriceList } from '@/services/api';
import { Button, Card, Table, Tag, Tooltip, Modal, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuth } from '@/app/context/AuthContext';

export default function PriceListsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchPriceLists();
  }, [isAdmin, router]);

  const fetchPriceLists = async () => {
    try {
      const data = await getPriceLists();
      setPriceLists(data);
    } catch (error) {
      message.error('Fiyat listeleri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPriceList) return;

    setDeleteLoading(true);
    try {
      await deletePriceList(selectedPriceList.price_list_id);
      message.success('Fiyat listesi başarıyla silindi');
      fetchPriceLists();
      setDeleteModalVisible(false);
      setSelectedPriceList(null);
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi silinirken bir hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: 'Fiyat Listesi Adı',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: PriceList) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-sm text-gray-500">{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Durum',
      key: 'status',
      render: (record: PriceList) => (
        <div className="flex gap-2">
          {record.is_active && (
            <Tag color="green">Aktif</Tag>
          )}
          {record.is_default && (
            <Tag color="blue">Varsayılan</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Para Birimi',
      dataIndex: 'currency',
      key: 'currency',
    },
    {
      title: 'Geçerlilik',
      key: 'validity',
      render: (record: PriceList) => {
        if (!record.valid_from && !record.valid_to) {
          return <span>Süresiz</span>;
        }

        return (
          <Tooltip title={`${record.valid_from ? dayjs(record.valid_from).format('DD.MM.YYYY') : 'Başlangıç yok'} - ${record.valid_to ? dayjs(record.valid_to).format('DD.MM.YYYY') : 'Bitiş yok'}`}>
            <span>
              {record.valid_from ? dayjs(record.valid_from).format('DD.MM.YYYY') : '-'} - {record.valid_to ? dayjs(record.valid_to).format('DD.MM.YYYY') : '-'}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Limit Tutar',
      key: 'limit_amount',
      render: (record: PriceList) => (
        record.limit_amount ? `${record.limit_amount.toLocaleString('tr-TR')} ${record.currency}` : '-'
      ),
    },
    {
      title: 'Ürün Sayısı',
      key: 'product_count',
      render: (record: PriceList) => record.PriceListDetail.length,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_: any, record: PriceList) => (
        <div className="flex gap-2">
          <Button
            type="link"
            onClick={() => router.push(`/dashboard/fiyat-listeleri/${record.price_list_id}/duzenle`)}
          >
            Düzenle
          </Button>
          {!record.is_default && (
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => {
                setSelectedPriceList(record);
                setDeleteModalVisible(true);
              }}
            >
              Sil
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6">
      <Card
        title="Fiyat Listeleri"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/fiyat-listeleri/ekle')}
          >
            Yeni Fiyat Listesi
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={priceLists}
          rowKey="price_list_id"
          loading={loading}
        />
      </Card>

      <Modal
        title="Fiyat Listesi Silme"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setSelectedPriceList(null);
        }}
        okText="Sil"
        cancelText="İptal"
        confirmLoading={deleteLoading}
      >
        <p>Bu fiyat listesini silmek istediğinizden emin misiniz?</p>
        <p className="text-gray-500 text-sm mt-2">Bu işlem geri alınamaz.</p>
      </Modal>
    </div>
  );
} 