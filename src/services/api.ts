// Token'ı localStorage veya sessionStorage'dan al
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  // Önce localStorage'dan "beni hatırla" durumunu kontrol et
  const rememberMe = localStorage.getItem("rememberMe") === "true";
  
  if (rememberMe) {
    // "Beni hatırla" aktifse localStorage'dan al
    return localStorage.getItem('token');
  } else {
    // "Beni hatırla" aktif değilse sessionStorage'dan al
    return sessionStorage.getItem('token');
  }
}

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
  tckn: string;                       // 🆕 TCKN alanı
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari: number;
  bakiye: number;                     // 🆕 Mağaza bakiyesi
  maksimum_taksit: number;            // 🆕 Maksimum taksit sayısı
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
  faks_numarasi?: string;
  aciklama: string;
  tckn: string;                       // 🆕 TCKN alanı
  limitsiz_acik_hesap: boolean;
  acik_hesap_tutari?: number;
  bakiye?: number;                    // 🆕 Mağaza bakiyesi
  maksimum_taksit?: number;           // 🆕 Maksimum taksit sayısı
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
  faks_numarasi?: string;
  aciklama?: string;
  tckn?: string;                      // 🆕 TCKN alanı
  limitsiz_acik_hesap?: boolean;
  acik_hesap_tutari?: number;
  bakiye?: number;                    // 🆕 Mağaza bakiyesi
  maksimum_taksit?: number;           // 🆕 Maksimum taksit sayısı
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
    const token = getAuthToken();
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
    const token = getAuthToken();
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
    const token = getAuthToken();
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
    const token = getAuthToken();
    
    if (!token) {

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

      throw new Error(errorMessage);
    }
    
    const data: GetStoresResponse = await response.json();
    
    if (!data.success) {

      throw new Error(data.message || 'Mağazalar getirilemedi');
    }
    
    return data.data || [];
  } catch (error) {
    
    throw error;
  }
}

export async function createStore(data: CreateStoreData): Promise<Store> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function updateStore(id: string, data: UpdateStoreData): Promise<Store> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function deleteStore(id: string): Promise<DeleteStoreResponse> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function createPriceList(data: CreatePriceListData): Promise<PriceList> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function assignPriceList(data: AssignPriceListData): Promise<PriceListAssignment> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function assignStorePriceList(data: AssignStorePriceListData): Promise<StorePriceListAssignment> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function getStorePriceLists(storeId: string): Promise<StorePriceListAssignment[]> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function getMyStorePriceList(): Promise<any> {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/price-lists/my-store/price-list`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza fiyat listesi getirilemedi');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
}

export async function assignUserToStore(userId: string, data: AssignUserToStoreData): Promise<AssignUserToStoreResponse> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

export async function removeUserFromStore(userId: string): Promise<RemoveUserFromStoreResponse> {
  try {
    const token = getAuthToken();
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
    
    throw error;
  }
}

// Şifre sıfırlama interface'leri
export interface ForgotPasswordData {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ValidateResetTokenResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

// Bakiye bilgileri interface'leri
export interface BalanceInfo {
  bakiye: number;
  acik_hesap_tutari: number;
  toplam_kullanilabilir: number;
  maksimum_taksit: number;
  limitsiz_acik_hesap: boolean;
  currency: string;
}

export interface StoreInfo {
  store_id: string;
  kurum_adi: string;
  vergi_numarasi: string;
  telefon: string;
  eposta: string;
  adres: string;
}

export interface BalanceResponse {
  success: boolean;
  data: {
    store_info: StoreInfo;
    balance_info: BalanceInfo;
  };
}

// Şifre sıfırlama API fonksiyonları
export async function forgotPassword(data: ForgotPasswordData): Promise<ForgotPasswordResponse> {
  const response = await fetch('https://pasha-backend-production.up.railway.app/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Şifre sıfırlama talebi gönderilemedi');
  }

  return response.json();
}

export async function validateResetToken(token: string): Promise<ValidateResetTokenResponse> {
  const response = await fetch(`https://pasha-backend-production.up.railway.app/api/auth/validate-reset-token/${token}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Token doğrulanamadı');
  }

  return response.json();
}

export async function resetPassword(data: ResetPasswordData): Promise<ResetPasswordResponse> {
  const response = await fetch('https://pasha-backend-production.up.railway.app/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Şifre sıfırlanamadı');
  }

  return response.json();
} 

// Ürün Kuralları ve Kesim Türleri için interface'ler
export interface SizeOption {
  id: number;
  width: number;
  height: number;
  isOptionalHeight: boolean;
}

export interface CutType {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  ruleCount?: number;
  rules?: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  variationCount?: number;
  variations?: Array<{
    id: number;
    width: number;
    height: number;
    hasFringe: boolean;
    stockQuantity: number;
    product: {
      id: string;
      name: string;
    };
  }>;
  usedInProducts?: Array<{
    id: string;
    name: string;
  }>;
}

export interface ProductRule {
  id: number;
  name: string;
  description: string;
  canHaveFringe: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sizeOptions: SizeOption[];
  cutTypes: Array<{
    id: number;
    name: string;
  }>;
  productCount?: number;
  products?: Array<{
    productId: string;
    name: string;
  }>;
}

export interface CreateProductRuleData {
  name: string;
  description: string;
  canHaveFringe: boolean;
  sizeOptions: Array<{
    width: number;
    height: number;
    isOptionalHeight: boolean;
  }>;
  cutTypeIds: number[];
}

export interface UpdateProductRuleData {
  name?: string;
  description?: string;
  canHaveFringe?: boolean;
  isActive?: boolean;
}

export interface CreateSizeOptionData {
  width: number;
  height: number;
  isOptionalHeight: boolean;
}

export interface CreateCutTypeData {
  name: string;
}

// Ürün Kuralları API Fonksiyonları
export const getProductRules = async (isActive?: boolean, search?: string): Promise<ProductRule[]> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    let url = `${API_BASE_URL}/api/admin/product-rules`;
    const params = new URLSearchParams();
    
    if (isActive !== undefined) params.append('isActive', isActive.toString());
    if (search) params.append('search', search);
    
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Ürün kuralları alınamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const getProductRule = async (ruleId: number): Promise<ProductRule> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Ürün kuralı alınamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const createProductRule = async (data: CreateProductRuleData): Promise<ProductRule> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Ürün kuralı oluşturulamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const updateProductRule = async (ruleId: number, data: UpdateProductRuleData): Promise<ProductRule> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Ürün kuralı güncellenemedi');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const deleteProductRule = async (ruleId: number): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Ürün kuralı silinemedi');
    }
  } catch (error) {
    
    throw error;
  }
};

// Boyut Seçenekleri API Fonksiyonları
export const addSizeOption = async (ruleId: number, data: CreateSizeOptionData): Promise<SizeOption> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}/size-options`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Boyut seçeneği eklenemedi');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const updateSizeOption = async (ruleId: number, sizeId: number, data: CreateSizeOptionData): Promise<SizeOption> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}/size-options/${sizeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Boyut seçeneği güncellenemedi');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const deleteSizeOption = async (ruleId: number, sizeId: number): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}/size-options/${sizeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Boyut seçeneği silinemedi');
  } catch (error) {
    
    throw error;
  }
};

// Kesim Türleri Ataması API Fonksiyonları
export const assignCutTypes = async (ruleId: number, cutTypeIds: number[]): Promise<CutType[]> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}/cut-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cutTypeIds })
    });

    if (!response.ok) throw new Error('Kesim türleri atanamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const removeCutType = async (ruleId: number, cutTypeId: number): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/product-rules/${ruleId}/cut-types/${cutTypeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Kesim türü ataması kaldırılamadı');
  } catch (error) {
    
    throw error;
  }
};

// Kesim Türleri Yönetimi API Fonksiyonları
export const getCutTypes = async (search?: string): Promise<CutType[]> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    let url = `${API_BASE_URL}/api/admin/cut-types`;
    if (search) url += `?search=${encodeURIComponent(search)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Kesim türleri alınamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const getCutType = async (cutTypeId: number): Promise<CutType> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/cut-types/${cutTypeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Kesim türü alınamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const createCutType = async (data: CreateCutTypeData): Promise<CutType> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/cut-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Kesim türü oluşturulamadı');

    const result = await response.json();
    return result.data;
  } catch (error) {
    
    throw error;
  }
};

export const updateCutType = async (cutTypeId: number, data: CreateCutTypeData): Promise<CutType> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/cut-types/${cutTypeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Kesim türü güncellenemedi');

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Kesim türü güncelleme hatası:', error);
    throw error;
  }
};

export const deleteCutType = async (cutTypeId: number): Promise<void> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/admin/cut-types/${cutTypeId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.message || 'Kesim türü silinemedi');
    }
  } catch (error) {
    console.error('Kesim türü silme hatası:', error);
    throw error;
  }
}; 

// Bakiye bilgilerini çeken API fonksiyonu
export const getMyBalance = async (): Promise<BalanceInfo> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/my-statistics/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Bakiye bilgileri alınamadı');
    }

    const result: BalanceResponse = await response.json();
    return result.data.balance_info;
  } catch (error) {
    console.error('Bakiye bilgileri getirme hatası:', error);
    throw error;
  }
}; 

// Kullanıcı istatistikleri interface'leri
export interface UserInfo {
  user_id: string;
  name: string;
  email: string;
  store_name: string;
  store_id: string;
}

export interface OrderStatistics {
  total_orders: number;
  total_amount: number;
  total_area_m2: number;
  pending_orders: number;
  confirmed_orders: number;
  delivered_orders: number;
  canceled_orders: number;
  completed_orders: number;
}

export interface TopProduct {
  product_id: string;
  product_name: string;
  collection_name: string;
  product_image: string;
  total_quantity: number;
  total_amount: number;
  order_count: number;
}

export interface TopCollection {
  collection_id: string;
  collection_name: string;
  collection_code: string;
  total_quantity: number;
  total_amount: number;
  order_count: number;
}

export interface MonthlyOrder {
  month: string;
  order_count: number;
  total_amount: number;
}

export interface PeriodInfo {
  period: string;
  start_date: string;
  end_date: string;
}

export interface UserStatisticsResponse {
  success: boolean;
  data: {
    user_info: UserInfo;
    order_statistics: OrderStatistics;
    top_products: TopProduct[];
    top_collections: TopCollection[];
    monthly_orders: MonthlyOrder[];
    period_info: PeriodInfo;
  };
}

// Kullanıcı istatistiklerini çeken API fonksiyonu
export const getMyUserStatistics = async (period: '1_month' | '3_months' | '6_months' | '1_year' = '1_year'): Promise<UserStatisticsResponse['data']> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_BASE_URL}/api/my-statistics/user-stats?period=${period}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Kullanıcı istatistikleri alınamadı');
    }

    const result: UserStatisticsResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Kullanıcı istatistikleri getirme hatası:', error);
    throw error;
  }
}; 

// =============================================================================
// KULLANICI PROFİL YÖNETİMİ
// =============================================================================

// Profil ilgili interface'ler
export interface UserProfileInfo {
  userId: string;
  name: string;
  surname: string;
  username: string;
  email: string;
  phoneNumber?: string;
  adres?: string;                     // 🆕 Kullanıcı adres alanı
  tckn?: string;                      // 🆕 TCKN alanı
  isActive: boolean;
  createdAt: string;
  userType: string;
}

export interface StoreProfileInfo {
  store_id: string;
  kurum_adi: string;
  vergi_numarasi?: string;
  vergi_dairesi?: string;
  yetkili_adi?: string;
  yetkili_soyadi?: string;
  telefon?: string;
  eposta?: string;
  adres?: string;
  faks_numarasi?: string;
  tckn?: string;                      // 🆕 TCKN alanı
  is_active: boolean;
  created_at: string;
}

export interface ProfileResponse {
  success: boolean;
  data: {
    user: UserProfileInfo;
    store: StoreProfileInfo | null;
  };
}

export interface StoreUpdateData {
  kurum_adi: string;
  vergi_numarasi?: string;
  vergi_dairesi?: string;
  yetkili_adi?: string;
  yetkili_soyadi?: string;
  telefon?: string;
  eposta?: string;
  faks_numarasi?: string;
  tckn?: string;                      // 🆕 TCKN alanı
}

export interface StoreUpdateResponse {
  success: boolean;
  message: string;
  data: StoreProfileInfo;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

// Kullanıcı profil güncelleme interface'i
export interface UserUpdateData {
  name: string;
  surname: string;
  phoneNumber?: string;
  adres?: string;                     // 🆕 Kullanıcı adres alanı
}

export interface UserUpdateResponse {
  success: boolean;
  message: string;
  data: UserProfileInfo;
}

// Profil bilgilerini getir
export const getMyProfile = async (): Promise<{ user: UserProfileInfo; store: StoreProfileInfo | null }> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Profil bilgileri alınamadı');
    }

    const result: ProfileResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Profil bilgileri getirme hatası:', error);
    throw error;
  }
};

// Mağaza bilgilerini güncelle
export const updateStoreProfile = async (storeData: StoreUpdateData): Promise<StoreProfileInfo> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/store`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(storeData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza bilgileri güncellenemedi');
    }

    const result: StoreUpdateResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Mağaza bilgileri güncelleme hatası:', error);
    throw error;
  }
};

// Şifre değiştir
export const changePassword = async (passwordData: PasswordChangeData): Promise<string> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/change-password`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(passwordData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Şifre değiştirilemedi');
    }

    const result: PasswordChangeResponse = await response.json();
    return result.message;
  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    throw error;
  }
};

// Kullanıcı profilini güncelle
export const updateUserProfile = async (userData: UserUpdateData): Promise<UserProfileInfo> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Kullanıcı bilgileri güncellenemedi');
    }

    const result: UserUpdateResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Kullanıcı bilgileri güncelleme hatası:', error);
    throw error;
  }
}; 

// Ödeme interface'leri
export interface PaymentRequest {
  storeId: string;
  amount: number;
  aciklama?: string;                  // 🔄 Artık opsiyonel
}

export interface PaymentResponse {
  success: boolean;
  data: {
    paymentUrl: string;
    sellerReference: string;
    apiReferenceNumber: string;
    amount: number;
  } | null;
  message?: string;
}

// Kullanıcının mağaza bilgisini al (my-store-payments endpoint'inden)
export async function getMyStoreInfo(): Promise<{ store_id: string }> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Oturum açmanız gerekiyor');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/payments/my-store-payments?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza bilgisi alınamadı');
    }
    
    const result = await response.json();
    // Response'tan store_id'yi çıkar (ilk ödeme kaydından veya meta data'dan)
    if (result.success && result.data?.payments?.[0]?.store?.store_id) {
      return { store_id: result.data.payments[0].store.store_id };
    } else if (result.success && result.data?.store_id) {
      return { store_id: result.data.store_id };
    } else {
      throw new Error('Mağaza bilgisi bulunamadı');
    }
  } catch (error) {
    console.error('Mağaza bilgisi alınırken hata:', error);
    throw error;
  }
}

// Ödeme işlemi başlatma
export async function processPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
  try {
    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Oturum açmanız gerekiyor');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/payments/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ödeme işlemi başlatılamadı');
    }
    
    const result: PaymentResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Ödeme işlemi başlatılırken hata:', error);
    throw error;
  }
} 