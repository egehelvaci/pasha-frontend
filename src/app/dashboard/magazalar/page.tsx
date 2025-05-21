'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, getStores, deleteStore, PriceList, getPriceLists, assignPriceList } from '@/services/api';
import { Button, Card, Table, Tag, message, Modal, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/context/AuthContext';

export default function StoresPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchStores();
    fetchPriceLists();
  }, [isAdmin, router]);

  const fetchStores = async () => {
    try {
      const data = await getStores();
      setStores(data);
    } catch (error) {
      message.error('Mağazalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceLists = async () => {
    try {
      const data = await getPriceLists();
      setPriceLists(data);
    } catch (error) {
      message.error('Fiyat listeleri yüklenirken bir hata oluştu');
    }
  };

  const handleDelete = async () => {
    if (!storeToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteStore(storeToDelete.store_id);
      message.success('Mağaza başarıyla silindi');
      setStores(stores.filter(store => store.store_id !== storeToDelete.store_id));
      setDeleteModalVisible(false);
      setStoreToDelete(null);
    } catch (error: any) {
      message.error(error.message || 'Mağaza silinirken bir hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAssignPriceList = async () => {
    if (!selectedStore || !selectedPriceList) return;

    setAssignLoading(true);
    try {
      await assignPriceList({
        userId: selectedStore.store_id,
        priceListId: selectedPriceList
      });
      message.success('Fiyat listesi başarıyla atandı');
      setAssignModalVisible(false);
      setSelectedStore(null);
      setSelectedPriceList('');
    } catch (error: any) {
      message.error(error.message || 'Fiyat listesi atanırken bir hata oluştu');
    } finally {
      setAssignLoading(false);
    }
  };

  const columns = [
    {
      title: 'Kurum Adı',
      dataIndex: 'kurum_adi',
      key: 'kurum_adi',
      render: (text: string, record: Store) => (
        <div>
          <div className="font-semibold">{text}</div>
          <div className="text-sm text-gray-500">{record.aciklama}</div>
        </div>
      ),
    },
    {
      title: 'Yetkili',
      key: 'yetkili',
      render: (record: Store) => (
        <div>
          <div>{record.yetkili_adi} {record.yetkili_soyadi}</div>
          <div className="text-sm text-gray-500">{record.eposta}</div>
        </div>
      ),
    },
    {
      title: 'İletişim',
      key: 'iletisim',
      render: (record: Store) => (
        <div>
          <div>{record.telefon}</div>
          {record.faks_numarasi && (
            <div className="text-sm text-gray-500">Faks: {record.faks_numarasi}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Vergi Bilgileri',
      key: 'vergi',
      render: (record: Store) => (
        <div>
          <div>{record.vergi_numarasi}</div>
          <div className="text-sm text-gray-500">{record.vergi_dairesi}</div>
        </div>
      ),
    },
    {
      title: 'Açık Hesap',
      key: 'acik_hesap',
      render: (record: Store) => (
        <div>
          {record.limitsiz_acik_hesap ? (
            <Tag color="green">Limitsiz</Tag>
          ) : (
            <div>{record.acik_hesap_tutari.toLocaleString('tr-TR')} ₺</div>
          )}
        </div>
      ),
    },
    {
      title: 'Durum',
      key: 'durum',
      render: (record: Store) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Aktif' : 'Pasif'}
        </Tag>
      ),
    },
    {
      title: 'İşlemler',
      key: 'islemler',
      render: (record: Store) => (
        <div className="flex gap-2">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => router.push(`/dashboard/magazalar/${record.store_id}/duzenle`)}
          >
            Güncelle
          </Button>
          <Button
            type="link"
            icon={<DollarOutlined />}
            onClick={() => {
              setSelectedStore(record);
              setAssignModalVisible(true);
            }}
          >
            Fiyat Listesi Ata
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setStoreToDelete(record);
              setDeleteModalVisible(true);
            }}
          >
            Sil
          </Button>
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
        title="Mağazalar"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/magazalar/ekle')}
          >
            Yeni Mağaza
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={stores}
          rowKey="store_id"
          loading={loading}
        />
      </Card>

      <Modal
        title="Mağaza Sil"
        open={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setStoreToDelete(null);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setDeleteModalVisible(false);
              setStoreToDelete(null);
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
          <strong>{storeToDelete?.kurum_adi}</strong> mağazasını silmek istediğinize emin misiniz?
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Bu işlem geri alınamaz ve mağazaya bağlı tüm kullanıcı bağlantıları kaldırılacaktır.
        </p>
      </Modal>

      <Modal
        title="Fiyat Listesi Ata"
        open={assignModalVisible}
        onCancel={() => {
          setAssignModalVisible(false);
          setSelectedStore(null);
          setSelectedPriceList('');
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setAssignModalVisible(false);
              setSelectedStore(null);
              setSelectedPriceList('');
            }}
          >
            İptal
          </Button>,
          <Button 
            key="assign" 
            type="primary"
            loading={assignLoading}
            onClick={handleAssignPriceList}
            disabled={!selectedPriceList}
          >
            Ata
          </Button>,
        ]}
      >
        <div className="mb-4">
          <p className="mb-4">
            <strong>{selectedStore?.kurum_adi}</strong> mağazasına fiyat listesi atayın.
          </p>
          <Select
            className="w-full"
            placeholder="Fiyat listesi seçin"
            value={selectedPriceList}
            onChange={setSelectedPriceList}
          >
            {priceLists.map(list => (
              <Select.Option key={list.price_list_id} value={list.price_list_id}>
                {list.name}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
} 