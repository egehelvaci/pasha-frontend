'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Store, getStores, deleteStore, PriceList, getPriceLists, assignStorePriceList } from '@/services/api';
import { Button, Card, Table, Tag, message, Modal, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import { useAuth } from '@/app/context/AuthContext';

export default function StoresPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
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
  
  // API çağrılarını takip etmek için ref oluştur
  const storesFetchedRef = useRef(false);
  const priceListsFetchedRef = useRef(false);

  useEffect(() => {
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin değilse
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    // Kimlik doğrulama yüklemesi tamamlandığında ve admin ise veri çek
    if (!authLoading && isAdmin) {
      if (!storesFetchedRef.current) {
        storesFetchedRef.current = true;
      fetchStores();
      }
      
      if (!priceListsFetchedRef.current) {
        priceListsFetchedRef.current = true;
      fetchPriceLists();
      }
    }
  }, [isAdmin, authLoading, router]);

  const fetchStores = async () => {
    // Zaten yükleme yapılıyorsa çık
    if (loading && stores.length > 0) return;
    
    setLoading(true);
    try {
      const data = await getStores();
      setStores(data);
    } catch (error: any) {
      console.error('Mağazalar yüklenirken hata:', error);
      message.error(error.message || 'Mağazalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceLists = async () => {
    try {
      const data = await getPriceLists();
      // Geçerli tarihlere göre fiyat listelerini filtrele
      const currentDate = new Date().toISOString();
      const validPriceLists = data.filter(list => {
        // valid_from tarihi boş veya şu andaki tarihten önce ise
        const isValidFrom = !list.valid_from || new Date(list.valid_from).toISOString() <= currentDate;
        // valid_to tarihi boş veya şu andaki tarihten sonra ise
        const isValidTo = !list.valid_to || new Date(list.valid_to).toISOString() >= currentDate;
        // Aktif olarak işaretlenmişse
        const isActive = list.is_active;
        
        return isValidFrom && isValidTo && isActive;
      });
      
      setPriceLists(validPriceLists);
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
      
      // Verileri yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
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
      await assignStorePriceList({
        storeId: selectedStore.store_id,
        priceListId: selectedPriceList
      });
      message.success('Fiyat listesi başarıyla atandı');
      setAssignModalVisible(false);
      setSelectedStore(null);
      setSelectedPriceList('');
      
      // Mağaza listesini yenilemek için referansı sıfırla
      storesFetchedRef.current = false;
      fetchStores();
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
      title: 'Finansal Bilgiler', // 🆕 Yeni kolon
      key: 'finansal',
      render: (record: Store) => (
        <div>
          <div className="text-sm">
            <span className="font-medium">Bakiye:</span> 
            <span className={`ml-1 ${(record.bakiye || 0) < 0 ? 'text-red-600' : 'text-green-600'} font-medium`}>
              {record.bakiye?.toLocaleString('tr-TR') || '0'} ₺
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-[#00365a]">Açık Hesap:</span> {record.limitsiz_acik_hesap ? 'Limitsiz' : `${record.acik_hesap_tutari?.toLocaleString('tr-TR') || '0'} ₺`}
          </div>
          <div className="text-sm">
            <span className="font-medium text-purple-600">Toplam:</span> {
              record.limitsiz_acik_hesap 
                ? 'Limitsiz' 
                : `${((record.bakiye || 0) + (record.acik_hesap_tutari || 0)).toLocaleString('tr-TR')} ₺`
            }
          </div>
          <div className="text-sm">
            <span className="font-medium text-orange-600">Max Taksit:</span> {record.maksimum_taksit || 1}
          </div>
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
            Düzenle
          </Button>
          <Button
            type="link"
            icon={<DollarOutlined />}
            onClick={() => {
              setSelectedStore(record);
              setAssignModalVisible(true);
            }}
          >
            Fiyat Listesi
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
            style={{ backgroundColor: '#00365a', borderColor: '#00365a' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#004170'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00365a'}
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
                {list.valid_from || list.valid_to ? (
                  <span className="ml-2 text-gray-500 text-xs">
                    ({list.valid_from ? new Date(list.valid_from).toLocaleDateString('tr-TR') : ''} 
                    {list.valid_from && list.valid_to ? ' - ' : ''}
                    {list.valid_to ? new Date(list.valid_to).toLocaleDateString('tr-TR') : ''})
                  </span>
                ) : null}
              </Select.Option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
} 