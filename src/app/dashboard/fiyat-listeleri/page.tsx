'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PriceList, getPriceLists, deletePriceList } from '@/services/api';
import { Button, Card, Table, Tag, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/context/AuthContext';

export default function PriceListsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<PriceList | null>(null);

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
    if (!priceListToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deletePriceList(priceListToDelete.price_list_id);
      message.success('Fiyat listesi başarıyla silindi');
      setPriceLists(priceLists.filter(list => list.price_list_id !== priceListToDelete.price_list_id));
      setDeleteModalVisible(false);
      setPriceListToDelete(null);
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi silinirken bir hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: 'Liste Adı',
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
      title: 'Geçerlilik',
      key: 'validity',
      render: (record: PriceList) => (
        <div>
          {record.valid_from || record.valid_to ? (
            <>
              <div>{record.valid_from ? new Date(record.valid_from).toLocaleDateString('tr-TR') : 'Başlangıç: -'}</div>
              <div>{record.valid_to ? new Date(record.valid_to).toLocaleDateString('tr-TR') : 'Bitiş: -'}</div>
            </>
          ) : (
            <Tag color="blue">Süresiz</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Limit Tutarı',
      key: 'limit',
      render: (record: PriceList) => (
        <div>
          {record.limit_amount ? (
            <div>{record.limit_amount.toLocaleString('tr-TR')} {record.currency}</div>
          ) : (
            <Tag color="blue">Limitsiz</Tag>
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
      title: 'Varsayılan',
      key: 'default',
      render: (record: PriceList) => (
        record.is_default ? (
          <Tag color="green">Varsayılan</Tag>
        ) : null
      ),
    },
    {
      title: 'Durum',
      key: 'status',
      render: (record: PriceList) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Aktif' : 'Pasif'}
        </Tag>
      ),
    },
    {
      title: 'Ürün Sayısı',
      key: 'products',
      render: (record: PriceList) => (
        <div>{record.PriceListDetail?.length || 0}</div>
      ),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (record: PriceList) => (
        <div className="flex gap-2">
          {!record.is_default && (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => router.push(`/dashboard/fiyat-listeleri/${record.price_list_id}/duzenle`)}
              >
                Güncelle
              </Button>
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setPriceListToDelete(record);
                  setDeleteModalVisible(true);
                }}
              >
                Sil
              </Button>
            </>
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
        title="Fiyat Listesi Sil"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setPriceListToDelete(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setDeleteModalVisible(false);
              setPriceListToDelete(null);
            }}
          >
            İptal
          </Button>,
          <Button 
            key="delete" 
            type="primary" 
            danger 
            loading={deleteLoading}
            onClick={handleDelete}
          >
            Sil
          </Button>,
        ]}
      >
        <p>
          <strong>{priceListToDelete?.name}</strong> fiyat listesini silmek istediğinize emin misiniz?
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Bu işlem geri alınamaz ve fiyat listesine bağlı tüm fiyatlar silinecektir.
        </p>
      </Modal>
    </div>
  );
} 