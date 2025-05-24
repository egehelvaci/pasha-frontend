export interface Collection {
  id: string;
  collectionId: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  products: any[];
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  stock: number;
  width: number;
  height: number;
  cut: boolean;
  productImage: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  collection_name: string;
  collection: Collection;
}

export interface CreateProductResponse {
  success: boolean;
  data: Product;
}

export interface DeleteProductResponse {
  success: boolean;
  message: string;
}

export interface CreateProductData {
  name: string;
  description: string;
  stock: number;
  width: number;
  height: number;
  cut: boolean;
  collectionId: string;
  productImage: File;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  stock?: number;
  width?: number;
  height?: number;
  cut?: boolean;
  collectionId?: string;
  productImage?: File;
}

export interface Price {
  id: string;
  productId: string;
  price: number;
  currency: string;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceData {
  productId: string;
  price: number;
  currency: string;
  validFrom: string;
  validTo?: string;
}

export interface UpdatePriceData {
  price?: number;
  currency?: string;
  validFrom?: string;
  validTo?: string;
}

export interface PriceListDetail {
  id: string;
  price_list_id: string;
  product_id: string;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface PriceList {
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
  PriceListDetail: PriceListDetail[];
}

export interface GetPriceListsResponse {
  success: boolean;
  data: PriceList[];
}

export interface UpdatePriceListData {
  name: string;
  description: string;
  validFrom?: string;
  validTo?: string;
  limitAmount?: number;
  currency: string;
  is_active?: boolean;
  collectionPrices: Array<{
    collectionId: string;
    pricePerSquareMeter: number;
  }>;
}

export interface DeletePriceListResponse {
  success: boolean;
  message: string;
}

export interface Store {
  store_id: string;
  kurum_adi: string;
  vergi_numarasi: string;
  vergi_dairesi: string;
  yetkili_adi: string;
  yetkili_soyadi: string;
  telefon: string;
  eposta: string;
  adres: string;
  faks_numarasi: string;
  aciklama: string;
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetStoresResponse {
  success: boolean;
  data: Store[];
  message?: string;
}

export interface CreateStoreData {
  kurum_adi: string;
  vergi_numarasi: string;
  vergi_dairesi: string;
  yetkili_adi: string;
  yetkili_soyadi: string;
  telefon: string;
  eposta: string;
  adres: string;
  faks_numarasi?: string;
  aciklama: string;
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari?: number;
}

export interface CreateStoreResponse {
  success: boolean;
  data: Store;
}

export interface UpdateStoreData {
  kurum_adi?: string;
  vergi_numarasi?: string;
  vergi_dairesi?: string;
  yetkili_adi?: string;
  yetkili_soyadi?: string;
  telefon?: string;
  eposta?: string;
  adres?: string;
  faks_numarasi?: string;
  aciklama?: string;
  limitsiz_acik_hesap?: boolean;
  acik_hesap_tutari?: number;
  is_active?: boolean;
}

export interface UpdateStoreResponse {
  success: boolean;
  data: Store;
}

export interface DeleteStoreResponse {
  success: boolean;
  message: string;
}

export interface CollectionPrice {
  collectionId: string;
  pricePerSquareMeter: number;
}

export interface CreatePriceListData {
  name: string;
  description: string;
  validFrom?: string;
  validTo?: string;
  limitAmount?: number;
  currency: string;
  is_active?: boolean;
  collectionPrices: CollectionPrice[];
}

export interface CreatePriceListResponse {
  success: boolean;
  data: PriceList;
}

export interface PriceListAssignment {
  user_price_list_id: string;
  user_id: string;
  price_list_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssignPriceListData {
  userId: string;
  priceListId: string;
}

export interface AssignPriceListResponse {
  success: boolean;
  data: PriceListAssignment;
}

export interface PriceListProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  collection_name: string;
  productImage: string;
  stock: number;
}

export interface StorePriceListAssignment {
  store_price_list_id: string;
  store_id: string;
  price_list_id: string;
  created_at: string;
  updated_at: string;
  is_default_assignment: boolean;
  PriceList: {
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
    products?: PriceListProduct[];
  };
}

export interface AssignStorePriceListData {
  storeId: string;
  priceListId: string;
}

export interface AssignStorePriceListResponse {
  success: boolean;
  data: StorePriceListAssignment;
}

export interface GetStorePriceListsResponse {
  success: boolean;
  data: StorePriceListAssignment[];
}

export interface AssignUserToStoreData {
  storeId: string;
}

export interface AssignUserToStoreResponse {
  success: boolean;
  data: {
    userId: string;
    username: string;
    name: string;
    surname: string;
    Store: {
      store_id: string;
      kurum_adi: string;
    }
  };
  message: string;
}

export interface RemoveUserFromStoreResponse {
  success: boolean;
  data: {
    userId: string;
    username: string;
    name: string;
    surname: string;
    Store: null;
  };
  message: string;
}

export const API_BASE_URL = 'https://pasha-backend-production.up.railway.app'; // API sunucusunun adresi

export async function getProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/products`);
    if (!response.ok) {
      throw new Error('Ürünler getirilemedi');
    }
    return await response.json();
  } catch (error) {
    console.error('Ürünleri getirirken hata oluştu:', error);
    throw error;
  }
}

export async function getProductById(id: string): Promise<Product> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`);
    if (!response.ok) {
      throw new Error('Ürün detayı getirilemedi');
    }
    return await response.json();
  } catch (error) {
    console.error('Ürün detayını getirirken hata oluştu:', error);
    throw error;
  }
}

export async function getProductsByCollection(collectionId: string): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/collections/${collectionId}/products`);
    if (!response.ok) {
      throw new Error('Koleksiyon ürünleri getirilemedi');
    }
    return await response.json();
  } catch (error) {
    console.error('Koleksiyon ürünlerini getirirken hata oluştu:', error);
    throw error;
  }
}

export async function createProduct(productData: CreateProductData): Promise<CreateProductResponse> {
  try {
    const formData = new FormData();
    
    // Form verilerini ekle
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('stock', productData.stock.toString());
    formData.append('width', productData.width.toString());
    formData.append('height', productData.height.toString());
    formData.append('cut', productData.cut.toString());
    formData.append('collectionId', productData.collectionId);
    formData.append('productImage', productData.productImage);

    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Ürün oluşturulamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('Ürün oluşturulurken hata oluştu:', error);
    throw error;
  }
}

export async function updateProduct(id: string, productData: UpdateProductData): Promise<CreateProductResponse> {
  try {
    const formData = new FormData();
    
    // Sadece değiştirilmek istenen alanları ekle
    if (productData.name !== undefined) formData.append('name', productData.name);
    if (productData.description !== undefined) formData.append('description', productData.description);
    if (productData.stock !== undefined) formData.append('stock', productData.stock.toString());
    if (productData.width !== undefined) formData.append('width', productData.width.toString());
    if (productData.height !== undefined) formData.append('height', productData.height.toString());
    if (productData.cut !== undefined) formData.append('cut', productData.cut.toString());
    if (productData.collectionId !== undefined) formData.append('collectionId', productData.collectionId);
    if (productData.productImage) formData.append('productImage', productData.productImage);

    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Ürün güncellenemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Ürün güncellenirken hata oluştu:', error);
    throw error;
  }
}

export async function deleteProduct(id: string): Promise<DeleteProductResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Ürün silinemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Ürün silinirken hata oluştu:', error);
    throw error;
  }
}

export async function getProductPrices(productId: string): Promise<Price[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/prices`);
    if (!response.ok) {
      throw new Error('Ürün fiyatları getirilemedi');
    }
    return await response.json();
  } catch (error) {
    console.error('Ürün fiyatlarını getirirken hata oluştu:', error);
    throw error;
  }
}

export async function createPrice(priceData: CreatePriceData): Promise<Price> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(priceData),
    });

    if (!response.ok) {
      throw new Error('Fiyat oluşturulamadı');
    }

    return await response.json();
  } catch (error) {
    console.error('Fiyat oluştururken hata oluştu:', error);
    throw error;
  }
}

export async function updatePrice(priceId: string, priceData: UpdatePriceData): Promise<Price> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices/${priceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(priceData),
    });

    if (!response.ok) {
      throw new Error('Fiyat güncellenemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Fiyat güncellenirken hata oluştu:', error);
    throw error;
  }
}

export async function deletePrice(priceId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/prices/${priceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Fiyat silinemedi');
    }
  } catch (error) {
    console.error('Fiyat silinirken hata oluştu:', error);
    throw error;
  }
}

export async function getPriceLists(): Promise<PriceList[]> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Fiyat listeleri getirilemedi');
    }
    const data: GetPriceListsResponse = await response.json();
    return data.data;
  } catch (error) {
    console.error('Fiyat listelerini getirirken hata oluştu:', error);
    throw error;
  }
}

export async function updatePriceList(priceListId: string, data: UpdatePriceListData): Promise<PriceList> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists/${priceListId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiyat listesi güncellenemedi');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Fiyat listesi güncellenirken hata oluştu:', error);
    throw error;
  }
}

export async function deletePriceList(priceListId: string): Promise<DeletePriceListResponse> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists/${priceListId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiyat listesi silinemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Fiyat listesi silinirken hata oluştu:', error);
    throw error;
  }
}

export async function getStores(): Promise<Store[]> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('Token bulunamadı, kullanıcı girişi gerekiyor');
      throw new Error('Oturum açmanız gerekiyor');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.message || 'Mağazalar getirilemedi';
      console.error('API Hatası:', errorMessage, 'Durum Kodu:', response.status);
      throw new Error(errorMessage);
    }
    
    const data: GetStoresResponse = await response.json();
    
    if (!data.success) {
      console.error('API başarı durumu false:', data);
      throw new Error(data.message || 'Mağazalar getirilemedi');
    }
    
    return data.data || [];
  } catch (error) {
    console.error('Mağazaları getirirken hata oluştu:', error);
    throw error;
  }
}

export async function createStore(data: CreateStoreData): Promise<Store> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza oluşturulamadı');
    }

    const result: CreateStoreResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Mağaza oluşturulurken hata oluştu:', error);
    throw error;
  }
}

export async function updateStore(id: string, data: UpdateStoreData): Promise<Store> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza güncellenemedi');
    }

    const result: UpdateStoreResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Mağaza güncellenirken hata oluştu:', error);
    throw error;
  }
}

export async function deleteStore(id: string): Promise<DeleteStoreResponse> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza silinemedi');
    }

    return await response.json();
  } catch (error) {
    console.error('Mağaza silinirken hata oluştu:', error);
    throw error;
  }
}

export async function createPriceList(data: CreatePriceListData): Promise<PriceList> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiyat listesi oluşturulamadı');
    }

    const result: CreatePriceListResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Fiyat listesi oluştururken hata oluştu:', error);
    throw error;
  }
}

export async function assignPriceList(data: AssignPriceListData): Promise<PriceListAssignment> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists/store-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiyat listesi ataması yapılamadı');
    }

    const result: AssignPriceListResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Fiyat listesi atanırken hata oluştu:', error);
    throw error;
  }
}

export async function assignStorePriceList(data: AssignStorePriceListData): Promise<StorePriceListAssignment> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists/store-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Fiyat listesi mağazaya atanamadı');
    }

    const result: AssignStorePriceListResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Fiyat listesi mağazaya atanırken hata oluştu:', error);
    throw error;
  }
}

export async function getStorePriceLists(storeId: string): Promise<StorePriceListAssignment[]> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/price-lists/store-assignments/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza fiyat listeleri getirilemedi');
    }

    const result: GetStorePriceListsResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Mağaza fiyat listeleri getirilirken hata oluştu:', error);
    throw error;
  }
}

export async function assignUserToStore(userId: string, data: AssignUserToStoreData): Promise<AssignUserToStoreResponse> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/assign-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Kullanıcı mağazaya atanamadı');
    }

    const result: AssignUserToStoreResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Kullanıcı mağazaya atanırken hata oluştu:', error);
    throw error;
  }
}

export async function removeUserFromStore(userId: string): Promise<RemoveUserFromStoreResponse> {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/remove-store`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Kullanıcının mağaza ataması kaldırılamadı');
    }

    const result: RemoveUserFromStoreResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Kullanıcının mağaza ataması kaldırılırken hata oluştu:', error);
    throw error;
  }
} 