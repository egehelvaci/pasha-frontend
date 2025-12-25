const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://pashahomeapps.up.railway.app";

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

export interface Order {
  id: string;
  created_at: string;
  store_name: string;
  store_phone?: string;
  store_email?: string;
  store_tax_number?: string;
  store_tax_office?: string;
  delivery_address?: string;
  address?: {
    id: string;
    address: string;
    district: string;
    city: string;
    postal_code?: string;
  };
  user?: {
    name: string;
    surname: string;
    phone?: string;
    email?: string;
  };
  items: Array<{
    quantity: number;
  }>;
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
  purchasePricing?: {
    price_per_square_meter: number;
  };
  rules?: {
    canHaveFringe?: boolean;
    cutTypes?: Array<{
      id: number;
      name: string;
    }>;
    sizeOptions?: Array<{
      id: number;
      name: string;
      width: number;
      height: number;
      is_optional_height?: boolean;
      stockAreaM2?: number;
      stockQuantity?: number;
    }>;
  };
  // Ürün varyantları - API'den gelen gerçek veriler
  sizeOptions?: Array<{
    id: number;
    width: number;
    height: number;
    is_optional_height: boolean;
    stockAreaM2?: number;
    stockQuantity?: number;
  }>;
  cutTypes?: Array<{
    id: number;
    name: string;
  }>;
  canHaveFringe?: boolean;
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
  currency: string;                   // 🆕 Para birimi
  maksimum_taksit: number;            // 🆕 Maksimum taksit sayısı
  store_type?: 'KARGO' | 'SERVIS' | 'KENDI_ALAN' | 'AMBAR'; // 🆕 Mağaza türü
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
  currency?: string;                  // 🆕 Para birimi
  maksimum_taksit?: number;           // 🆕 Maksimum taksit sayısı
  store_type?: 'KARGO' | 'SERVIS' | 'KENDI_ALAN' | 'AMBAR'; // 🆕 Mağaza türü
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
  currency?: string;                  // 🆕 Para birimi
  maksimum_taksit?: number;           // 🆕 Maksimum taksit sayısı
  store_type?: 'KARGO' | 'SERVIS' | 'KENDI_ALAN' | 'AMBAR'; // 🆕 Mağaza türü
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

export interface StoreUser {
  user_id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  adres?: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
}

export interface GetStoreUsersResponse {
  success: boolean;
  data: StoreUser[];
  message?: string;
}

// Admin sipariş oluşturma interface'leri
export interface AdminOrderCreateRequest {
  store_id: string;
  user_id: string;
}

export interface AdminOrderProduct {
  productId: string;
  name: string;
  description: string;
  productImage: string;
  collectionId: string;
  collectionName: string;
  pricing: {
    price: number;
    currency: string;
    priceListName: string;
  };
  canHaveFringe: boolean;
  sizeOptions: Array<{
    id: number;
    width: number;
    height: number;
    is_optional_height: boolean;
    stockQuantity: number;
    stockAreaM2: number;
  }>;
  cutTypes: Array<{
    id: number;
    name: string;
  }>;
  productvariations?: Array<{
    id: number;
    product_id: string;
    cut_type_id: number | null;
    has_fringe: boolean;
    width: number;
    height: number;
    stock_quantity: number;
    stock_area_m2: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface AdminOrderPriceList {
  price_list_id: string;
  name: string;
  description: string;
  currency: string;
  limit_amount: number;
}

export interface AdminOrderCreateData {
  user: {
    userId: string;
    name: string;
    surname: string;
    email: string;
    phoneNumber?: string;
    adres?: string;
    userType: string;
  };
  store: {
    store_id: string;
    kurum_adi: string;
    vergi_numarasi: string;
    vergi_dairesi: string;
    telefon: string;
    eposta: string;
    bakiye: number;
    acik_hesap_tutari: number;
    limitsiz_acik_hesap: boolean;
  };
  priceList: AdminOrderPriceList;
  products: AdminOrderProduct[];
  totalProducts: number;
  availableCollections: string[];
}

export interface AdminOrderCreateResponse {
  success: boolean;
  message: string;
  data: AdminOrderCreateData;
}

// Admin sepet sistemi interface'leri
export interface AdminCartItem {
  id: number;
  productId: string;
  quantity: number;
  width: number;
  height: number;
  area_m2: number;
  unit_price: number;
  total_price: number;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
  product?: {
    productId: string;
    name: string;
    description: string;
    productImage: string;
    collection: {
      collectionId: string;
      name: string;
      code: string;
    };
    pricing: {
      price: number;
      currency: string;
    };
  };
}

export interface AdminCart {
  id: number;
  targetUserId: string;
  adminUserId: string;
  storeId: string;
  items: AdminCartItem[];
  totalItems: number;
  totalPrice: number;
  adminUser: {
    userId: string;
    name: string;
    surname: string;
  };
  targetUser: {
    userId: string;
    name: string;
    surname: string;
  };
  store: {
    store_id: string;
    kurum_adi: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToAdminCartRequest {
  targetUserId: string;
  storeId: string;
  productId: string;
  quantity: number;
  width: number;
  height: number;
  hasFringe: boolean;
  cutType: string;
  notes?: string;
}

export interface AddToAdminCartResponse {
  success: boolean;
  message: string;
  data: {
    adminCartItem: AdminCartItem;
    targetUser: {
      userId: string;
      name: string;
      surname: string;
      email: string;
      store: {
        store_id: string;
        kurum_adi: string;
      };
    };
    store: {
      store_id: string;
      kurum_adi: string;
    };
  };
}

export interface GetAdminCartResponse {
  success: boolean;
  message: string;
  data: {
    adminCart: AdminCart;
  };
}

export interface UpdateAdminCartItemRequest {
  quantity?: number;
  width?: number;
  height?: number;
  hasFringe?: boolean;
  cutType?: string;
  notes?: string;
}

export interface CreateOrderFromAdminCartRequest {
  targetUserId: string;
  storeId: string;
  notes?: string;
  address_id: string; // ZORUNLU: Seçilen adres ID'si
}

export interface CreateOrderFromAdminCartResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      id: string;
      user_id: string;
      cart_id: number;
      total_price: string;
      status: string;
      delivery_address: string;
      address?: {
        id: string;
        store_id: string;
        title: string;
        address: string;
        city: string;
        district: string;
        postal_code: string;
        is_default: boolean;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      };
      store_name: string;
      store_tax_number: string;
      store_tax_office: string;
      store_phone: string;
      store_email: string;
      notes?: string;
      items: AdminCartItem[];
    };
    targetUser: {
      userId: string;
      name: string;
      surname: string;
      email: string;
      store: {
        store_id: string;
        kurum_adi: string;
      };
    };
    requiresPayment: boolean;
    limitAmount: number;
    minimumPayment: number | null;
  };
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'; // API sunucusunun adresi

export async function getProducts(page: number = 1, limit: number = 50, search?: string, collectionId?: string): Promise<{ data: Product[], pagination?: any }> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(collectionId && { collectionId })
    });

    const token = getAuthToken();
    
    if (!token) {
      throw new Error('Oturum açmanız gerekiyor');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/products?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Ürünler getirilemedi');
    }
    
    const result = await response.json();
    return result;
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

export async function getStoreUsers(storeId: string): Promise<StoreUser[]> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/stores/${storeId}/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Mağaza kullanıcıları alınırken bir hata oluştu');
    }

    const data: GetStoreUsersResponse = await response.json();
    return data.data;
  } catch (error) {
    throw error;
  }
}

export async function getAdminOrderCreateInfo(request: AdminOrderCreateRequest): Promise<AdminOrderCreateData> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/orders/create-for-store`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Sipariş oluşturma bilgileri alınırken bir hata oluştu');
    }

    const data: AdminOrderCreateResponse = await response.json();
    return data.data;
  } catch (error) {
    throw error;
  }
}

// Admin sepet sistemi API fonksiyonları
export async function addToAdminCart(request: AddToAdminCartRequest): Promise<AddToAdminCartResponse['data']> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/add-to-admin-cart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ürün admin sepete eklenirken bir hata oluştu');
    }

    const data: AddToAdminCartResponse = await response.json();
    return data.data;
  } catch (error) {
    throw error;
  }
}

export async function getAdminCart(targetUserId: string, storeId: string): Promise<AdminCart> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/${targetUserId}/${storeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Admin sepeti alınırken bir hata oluştu');
    }

    const data: GetAdminCartResponse = await response.json();
    return data.data.adminCart;
  } catch (error) {
    throw error;
  }
}

export async function clearAdminCart(targetUserId: string, storeId: string): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/${targetUserId}/${storeId}/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Admin sepeti temizlenirken bir hata oluştu');
    }
  } catch (error) {
    throw error;
  }
}

export async function removeFromAdminCart(targetUserId: string, storeId: string, adminCartItemId: number): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/${targetUserId}/${storeId}/item/${adminCartItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Ürün admin sepetten çıkarılırken bir hata oluştu');
    }
  } catch (error) {
    throw error;
  }
}

export async function updateAdminCartItem(
  targetUserId: string, 
  storeId: string, 
  adminCartItemId: number, 
  updates: UpdateAdminCartItemRequest
): Promise<AdminCartItem> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/${targetUserId}/${storeId}/item/${adminCartItemId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Admin sepet öğesi güncellenirken bir hata oluştu');
    }

    const data = await response.json();
    return data.data.adminCartItem;
  } catch (error) {
    throw error;
  }
}

export async function createOrderFromAdminCart(request: CreateOrderFromAdminCartRequest): Promise<CreateOrderFromAdminCartResponse['data']> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/cart/create-order-from-admin-cart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Admin sepetinden sipariş oluşturulurken bir hata oluştu');
    }

    const data: CreateOrderFromAdminCartResponse = await response.json();
    return data.data;
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
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/auth/forgot-password`, {
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
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/auth/validate-reset-token/${token}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Token doğrulanamadı');
  }

  return response.json();
}

export async function resetPassword(data: ResetPasswordData): Promise<ResetPasswordResponse> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://pashahomeapps.up.railway.app'}/api/auth/reset-password`, {
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
// Muhasebe Hareketlerim API Tipi
export interface MuhasebeOzet {
  guncelBakiye: number;
  toplamHarcama: number;
  toplamOdeme: number;
  toplamSiparisTutari: number;
  toplamSiparisSayisi: number;
  bekleyenSiparisler: number;
  teslimEdilenSiparisler: number;
}

export interface MuhasebeHareketi {
  id: number;
  islemTuru: string;
  tutar: number;
  harcamaMi: boolean;
  tarih: string;
  aciklama: string;
  createdAt: string;
}

export interface SiparisUrun {
  urunAdi: string;
  koleksiyonAdi: string;
  koleksiyonKodu: string;
  miktar: number;
  birimFiyat: number;
  toplamFiyat: number;
  en: number;
  boy: number;
  sasakVar: boolean;
  kesimTipi: string;
}

export interface Siparis {
  id: string;
  toplamTutar: number;
  durum: string;
  olusturmaTarihi: string;
  guncellemeTarihi: string;
  urunSayisi: number;
  urunler: SiparisUrun[];
}

export interface Odeme {
  id: string;
  tutar: number;
  aciklama: string;
  durum: string;
  odemeTarihi: string;
  olusturmaTarihi: string;
  referansNo: string;
}

export interface MuhasebeHareketleriResponse {
  success: boolean;
  data: {
    ozet: MuhasebeOzet;
    muhasebeHareketleri: MuhasebeHareketi[];
    siparisler: Siparis[];
    odemeler: Odeme[];
  };
}

export const getMuhasebeHareketleri = async (): Promise<MuhasebeHareketleriResponse> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_URL}/api/profile/accounting`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Muhasebe hareketlerini getirirken hata:', error);
    throw error;
  }
};

// Sipariş iptal API (Kullanıcı için)
export interface CancelOrderResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    status: string;
    total_price: number;
    updated_at: string;
  };
}

export const cancelOrder = async (orderId: string, reason?: string): Promise<CancelOrderResponse> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: reason ? JSON.stringify({ reason }) : undefined
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Sipariş iptal edilirken hata:', error);
    throw error;
  }
};

// Admin Sipariş İptal API (Sadece Admin)
export interface AdminCancelOrderRequest {
  orderId: string;
  reason: string;
}

export interface AdminCancelOrderResponse {
  success: boolean;
  message: string;
  order: {
    id: string;
    user_id: string;
    total_price: number;
    status: string;
    created_at: string;
    updated_at: string;
  };
}

export const adminCancelOrder = async (orderId: string, reason: string): Promise<AdminCancelOrderResponse> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_URL}/api/admin/orders/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId,
        reason
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Admin sipariş iptal edilirken hata:', error);
    throw error;
  }
};



// Sipariş fiş API
export interface OrderReceiptData {
  siparis: {
    id: string;
    siparisNumarasi: string;
    durum: string;
    olusturmaTarihi: string;
    guncellemeTarihi: string;
    toplamTutar: number;
  };
  musteri: {
    ad: string;
    soyad: string;
    email: string;
    telefon: string;
    adres: string;
  };
  magaza: {
    kurumAdi: string;
    vergiNumarasi: string;
    vergiDairesi: string;
    yetkiliAdi: string;
    yetkiliSoyadi: string;
    telefon: string;
    eposta: string;
  };
  urunler: Array<{
    urunAdi: string;
    aciklama: string;
    koleksiyon: {
      adi: string;
      kodu: string;
    };
    miktar: number;
    birimFiyat: number;
    toplamFiyat: number;
    olculer: {
      en: number;
      boy: number;
      alanM2: number;
    };
    ozellikler: {
      sasakVar: boolean;
      kesimTipi: string;
    };
  }>;
  bakiye: {
    siparisOncesi: number;
    siparisSonrasi: number;
    siparisKesintisi: number;
    tarih: string;
  };
  ozet: {
    toplamUrunSayisi: number;
    toplamMiktar: number;
    toplamAlanM2: number;
    toplamTutar: number;
  };
  fis: {
    fisNumarasi: string;
    olusturmaTarihi: string;
    gecerlilikTarihi: string;
  };
}

export interface OrderReceiptResponse {
  success: boolean;
  data: OrderReceiptData;
}

export const getOrderReceipt = async (orderId: string): Promise<OrderReceiptResponse> => {
  try {
    const token = getAuthToken();
    if (!token) throw new Error('Token bulunamadı');

    const response = await fetch(`${API_URL}/api/orders/${orderId}/receipt`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error: any) {
    console.error('Sipariş fişi alınırken hata:', error);
    throw error;
  }
};

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
  currencyCode?: string;              // 🆕 Para birimi (TRY veya USD, varsayılan: mağazanın para birimi)
}

export interface PaymentResponse {
  success: boolean;
  data: {
    paymentUrl: string;
    sellerReference: string;
    apiReferenceNumber: string;
    amount: number;
    currencyCode?: string;              // 🆕 Para birimi
    convertedAmount?: number;           // 🆕 Dönüştürülmüş tutar (farklı para birimi ise)
    exchangeRate?: number;              // 🆕 Kullanılan döviz kuru (farklı para birimi ise)
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

// Çalışan İstatistikleri API Fonksiyonları
export interface EmployeeStats {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string;
}

export interface OverallStats {
  preparedOrders: number;
  preparedAmount: number;
  preparedAreaM2: number;
  preparedItems: number;
  averagePreparedAmount: number;
  averagePreparedAreaM2: number;
  averagePreparedItems: number;
}

export interface RecentStats {
  period: string;
  preparedOrders: number;
  preparedAmount: number;
  preparedAreaM2: number;
  preparedItems: number;
}


export interface PreparedOrder {
  orderId: string;
  preparedAt: string;
  totalAmount: number;
  totalAreaM2: number;
  totalItems: number;
  orderStatus: string;
  orderCreatedAt: string;
  qrCodeId: string;
}

export interface EmployeeStatisticsResponse {
  success: boolean;
  data: {
    employee: EmployeeStats;
    overallStats: OverallStats;
    recentStats: RecentStats;
    preparedOrders: PreparedOrder[];
  };
}

export async function getEmployeeStatistics(employeeId: string): Promise<EmployeeStatisticsResponse['data']> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/employee-stats/${employeeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Çalışan istatistikleri getirilemedi');
    }

    return data.data;
  } catch (error) {
    console.error('Çalışan istatistikleri hatası:', error);
    throw error;
  }
} 

// Admin Users API Interfaces
export interface AdminUser {
  userId: string;
  username: string;
  email: string;
  name: string;
  surname: string;
  phoneNumber?: string;
  adres?: string;
  canSeePrice: boolean;  // Yeni alan - fiyat görme yetkisi
  userType: {
    id: number;
    name: string;
  };
  userTypeName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  Store?: {
    store_id: string;
    kurum_adi: string;
  } | null;
}

export interface GetAdminUsersResponse {
  success: boolean;
  data: AdminUser[];
  message?: string;
}

// Kullanıcı oluşturma için interface
export interface CreateAdminUserRequest {
  username: string;
  email: string;
  password: string;
  name: string;
  surname: string;
  phoneNumber?: string;
  userTypeId: number;
  storeId?: string;
  canSeePrice?: boolean;  // Opsiyonel, default: true
}

export interface CreateAdminUserResponse {
  success: boolean;
  data: AdminUser;
  message?: string;
}

// Kullanıcı güncelleme için interface
export interface UpdateAdminUserRequest {
  name?: string;
  surname?: string;
  email?: string;
  phoneNumber?: string;
  adres?: string;
  canSeePrice?: boolean;  // Fiyat görme yetkisi
  isActive?: boolean;
  userTypeId?: number;
  storeId?: string;
}

export interface UpdateAdminUserResponse {
  success: boolean;
  data: AdminUser;
  message?: string;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: GetAdminUsersResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kullanıcılar getirilemedi');
    }

    return data.data || [];
  } catch (error) {
    console.error('Admin kullanıcıları getirme hatası:', error);
    throw error;
  }
}

// Admin kullanıcı oluşturma
export async function createAdminUser(userData: CreateAdminUserRequest): Promise<AdminUser> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data: CreateAdminUserResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kullanıcı oluşturulamadı');
    }

    return data.data;
  } catch (error) {
    console.error('Admin kullanıcı oluşturma hatası:', error);
    throw error;
  }
}

// Admin kullanıcı güncelleme
export async function updateAdminUser(userId: string, userData: UpdateAdminUserRequest): Promise<AdminUser> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data: UpdateAdminUserResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kullanıcı güncellenemedi');
    }

    return data.data;
  } catch (error) {
    console.error('Admin kullanıcı güncelleme hatası:', error);
    throw error;
  }
}

// Admin kullanıcı silme
export async function deleteAdminUser(userId: string): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Kullanıcı silinemedi');
    }

    return data;
  } catch (error) {
    console.error('Admin kullanıcı silme hatası:', error);
    throw error;
  }
}

// Notification API Interfaces
export interface NotificationMetadata {
  orderNumber?: string;
  productName?: string;
  storeName?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'STOCK_ALERT' | 'GENERAL';
  orderId?: string;
  metadata?: string | NotificationMetadata;
  isRead: boolean;
  createdAt: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
  message?: string;
}

export interface MarkAsReadResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    isRead: boolean;
  };
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// Kullanıcı bildirimlerini getir
export async function getUserNotifications(
  userId: string, 
  params: NotificationQueryParams = {}
): Promise<GetNotificationsResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  const { page = 1, limit = 20, unreadOnly = false } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    unreadOnly: unreadOnly.toString()
  });

  try {
    const response = await fetch(`${API_URL}/api/notifications/user/${userId}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: GetNotificationsResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Bildirimler getirilemedi');
    }

    return data;
  } catch (error) {
    console.error('Bildirimleri getirme hatası:', error);
    throw error;
  }
}

// Okunmamış bildirim sayısını getir
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/notifications/user/${userId}/unread-count`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: UnreadCountResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Okunmamış bildirim sayısı getirilemedi');
    }

    return data.data.unreadCount;
  } catch (error) {
    console.error('Okunmamış bildirim sayısını getirme hatası:', error);
    throw error;
  }
}

// Bildirimi okundu olarak işaretle
export async function markNotificationAsRead(notificationId: string): Promise<MarkAsReadResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/notifications/read/${notificationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: MarkAsReadResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Bildirim okundu olarak işaretlenemedi');
    }

    return data;
  } catch (error) {
    console.error('Bildirimi okundu işaretleme hatası:', error);
    throw error;
  }
}

// Tüm bildirimleri okundu olarak işaretle
export async function markAllNotificationsAsRead(userId: string): Promise<MarkAsReadResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/notifications/read-all/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: MarkAsReadResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Tüm bildirimler okundu olarak işaretlenemedi');
    }

    return data;
  } catch (error) {
    console.error('Tüm bildirimleri okundu işaretleme hatası:', error);
    throw error;
  }
}

// Store Address API Types and Functions
export interface StoreAddress {
  id: string;
  store_id: string;
  title: string;
  address: string;
  city?: string;
  district?: string;
  postal_code?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreAddressResponse {
  success: boolean;
  data: StoreAddress[];
  message?: string;
}

export interface CreateStoreAddressRequest {
  title: string;
  address: string;
  city?: string;
  district?: string;
  postal_code?: string;
  is_default?: boolean;
  store_id?: string; // Sadece admin için
}

// Mağaza adreslerini getir
export async function getStoreAddresses(storeId?: string): Promise<StoreAddressResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const url = storeId 
      ? `${API_URL}/api/store-addresses?storeId=${storeId}`
      : `${API_URL}/api/store-addresses`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: StoreAddressResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres listesi getirilemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres listesi getirme hatası:', error);
    throw error;
  }
}

// Yeni mağaza adresi ekle
export async function createStoreAddress(addressData: CreateStoreAddressRequest): Promise<{ success: boolean; message?: string; data?: StoreAddress }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/store-addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres eklenemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres ekleme hatası:', error);
    throw error;
  }
}

// Mağaza adresini güncelle
export async function updateStoreAddress(addressId: string, addressData: Partial<CreateStoreAddressRequest>): Promise<{ success: boolean; message?: string; data?: StoreAddress }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/store-addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres güncellenemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres güncelleme hatası:', error);
    throw error;
  }
}

// Varsayılan adresi değiştir
export async function setDefaultStoreAddress(addressId: string): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/store-addresses/${addressId}/set-default`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Varsayılan adres değiştirilemedi');
    }

    return data;
  } catch (error) {
    console.error('Varsayılan adres değiştirme hatası:', error);
    throw error;
  }
}

// Mağaza adresini sil
export async function deleteStoreAddress(addressId: string): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/store-addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres silinemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres silme hatası:', error);
    throw error;
  }
}

// Toplu Sipariş Onaylama API
export interface BulkConfirmOrderSuccess {
  orderId: string;
  customerName: string;
  storeName: string;
  amount: number;
  qrCodeCount: number;
  message: string;
}

export interface BulkConfirmOrderFailed {
  orderId: string;
  customerName: string;
  error: string;
}

export interface BulkConfirmSummary {
  total: number;
  successful: number;
  failed: number;
  totalAmount: number;
}

export interface BulkConfirmOrdersResponse {
  success: boolean;
  message: string;
  data: {
    success: BulkConfirmOrderSuccess[];
    failed: BulkConfirmOrderFailed[];
    summary: BulkConfirmSummary;
  };
}

export interface BulkConfirmOrdersRequest {
  orderIds: string[];
}

// Toplu sipariş onaylama fonksiyonu
export async function bulkConfirmOrders(orderIds: string[]): Promise<BulkConfirmOrdersResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/orders/bulk-confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderIds }),
    });

    const data: BulkConfirmOrdersResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Toplu onaylama işlemi başarısız');
    }

    return data;
  } catch (error) {
    console.error('Toplu sipariş onaylama hatası:', error);
    throw error;
  }
}

// Kullanıcı Adres Yönetimi API Types and Functions
export interface UserAddress {
  id: string;
  user_id: string;
  title: string;
  address: string;
  city?: string;
  district?: string;
  postal_code?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAddressResponse {
  success: boolean;
  data: UserAddress[];
  message?: string;
}

export interface CreateUserAddressRequest {
  title: string;
  address: string;
  city?: string;
  district?: string;
  postal_code?: string;
  is_default?: boolean;
}

// Kullanıcı adreslerini getir
export async function getUserAddresses(userId?: string): Promise<UserAddressResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const url = userId 
      ? `${API_URL}/api/user-addresses?userId=${userId}`
      : `${API_URL}/api/user-addresses`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data: UserAddressResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres listesi getirilemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres listesi getirme hatası:', error);
    throw error;
  }
}

// Yeni kullanıcı adresi ekle
export async function createUserAddress(addressData: CreateUserAddressRequest): Promise<{ success: boolean; message?: string; data?: UserAddress }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/user-addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres eklenemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres ekleme hatası:', error);
    throw error;
  }
}

// Kullanıcı adresini güncelle
export async function updateUserAddress(addressId: string, addressData: Partial<CreateUserAddressRequest>): Promise<{ success: boolean; message?: string; data?: UserAddress }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/user-addresses/${addressId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addressData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres güncellenemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres güncelleme hatası:', error);
    throw error;
  }
}

// Varsayılan kullanıcı adresini değiştir
export async function setDefaultUserAddress(addressId: string): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/user-addresses/${addressId}/set-default`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Varsayılan adres değiştirilemedi');
    }

    return data;
  } catch (error) {
    console.error('Varsayılan adres değiştirme hatası:', error);
    throw error;
  }
}

// Kullanıcı adresini sil
export async function deleteUserAddress(addressId: string): Promise<{ success: boolean; message?: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Token bulunamadı');
  }

  try {
    const response = await fetch(`${API_URL}/api/user-addresses/${addressId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Adres silinemedi');
    }

    return data;
  } catch (error) {
    console.error('Adres silme hatası:', error);
    throw error;
  }
}

// =============================================================================
// PUBLIC CATALOG API - Token gerektirmez
// =============================================================================

// Public koleksiyon ve ürün interface'leri
export interface PublicProduct {
  id: string;
  name: string;
  description: string;
  image: string;
}

export interface PublicCollection {
  id: string;
  name: string;
  description: string;
  code: string;
  productCount: number;
  products: PublicProduct[];
}

export interface PublicCatalogResponse {
  success: boolean;
  message: string;
  data: {
    collections: PublicCollection[];
    totalCollections: number;
    totalProducts: number;
  };
}

// Public koleksiyonları getir (token gerektirmez)
export async function getPublicCollections(): Promise<PublicCatalogResponse['data']> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public/catalog/collections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Koleksiyonlar getirilemedi');
    }

    const result: PublicCatalogResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Public koleksiyonları getirirken hata:', error);
    throw error;
  }
}

// =============================================================================
// CONTACT API - Token gerektirmez
// =============================================================================

// İletişim formu interface'leri
export interface ContactFormData {
  companyName: string;
  authorityName: string;
  authoritySurname: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    submittedAt: string;
  };
}

// İletişim formu gönder (token gerektirmez)
export async function submitContactForm(formData: ContactFormData): Promise<ContactResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/contact/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result: ContactResponse = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'İletişim formu gönderilirken bir hata oluştu');
    }

    return result;
  } catch (error) {
    console.error('İletişim formu gönderirken hata:', error);
    throw error;
  }
}

// =============================================================================
// ADMIN CONTACT FORMS API - Token gerektirir
// =============================================================================

// Admin iletişim formu interface'leri
export interface ContactForm {
  id: number;
  companyName: string;
  authorityName: string;
  authoritySurname: string;
  authorityFullName: string;
  email: string;
  phone: string;
  address: string;
  isRead: boolean;
  isContacted: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormsResponse {
  success: boolean;
  message: string;
  data: {
    contactForms: ContactForm[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface ContactFormUpdateData {
  isRead?: boolean;
  isContacted?: boolean;
  notes?: string;
}

// Admin: İletişim formlarını getir
export async function getContactForms(
  page: number = 1,
  limit: number = 20,
  filters: {
    isRead?: boolean;
    isContacted?: boolean;
    search?: string;
  } = {}
): Promise<ContactFormsResponse['data']> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    // Sadece tanımlı filtreleri ekle
    if (filters.isRead !== undefined) {
      params.append('isRead', filters.isRead.toString());
    }
    if (filters.isContacted !== undefined) {
      params.append('isContacted', filters.isContacted.toString());
    }
    if (filters.search && filters.search.trim() !== '') {
      params.append('search', filters.search);
    }

    const url = `${API_BASE_URL}/api/admin/contact-forms?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`İletişim formları getirilemedi: ${response.status} - ${errorText}`);
    }

    const result: ContactFormsResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('İletişim formları getirirken hata:', error);
    throw error;
  }
}

// Admin: İletişim formu durumunu güncelle
export async function updateContactForm(
  id: number,
  updates: ContactFormUpdateData
): Promise<ContactForm> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/contact-forms/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('İletişim formu güncellenemedi');
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('İletişim formu güncellenirken hata:', error);
    throw error;
  }
}

// Admin: İletişim formunu sil
export async function deleteContactForm(id: number): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Token bulunamadı');
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/contact-forms/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('İletişim formu silinemedi');
    }
  } catch (error) {
    console.error('İletişim formu silinirken hata:', error);
    throw error;
  }
}

// Global API error handler - 401 hatalarını yakalar
let tokenExpiryHandler: (() => void) | null = null;

export function setTokenExpiryHandler(handler: () => void) {
  tokenExpiryHandler = handler;
}

// Global fetch interceptor - tüm fetch çağrılarını yakalar
export function setupGlobalFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await originalFetch(input, init);
    
    // API çağrısı mı kontrol et
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApiCall = url.includes('/api/');
    
    // 401 hatası ve API çağrısı ise token expiry handler'ı çağır
    if (response.status === 401 && isApiCall && tokenExpiryHandler) {
      tokenExpiryHandler();
    }
    
    return response;
  };
}

// Fetch wrapper - tüm API çağrıları için 401 kontrolü
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  
  // Default headers ekle
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 401 Unauthorized hatası kontrolü
  if (response.status === 401 && tokenExpiryHandler) {
    tokenExpiryHandler();
    return response;
  }

  return response;
}

// ==================== SATIN ALIM İŞLEMLERİ API'LERİ ====================

// Satıcı türleri
export interface Supplier {
  id: string;
  name: string;
  company_name: string;
  phone: string;
  address: string;
  balance: number;
  currency: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  purchasePriceLists: any[];
}

export interface CreateSupplierRequest {
  name: string;
  company_name: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance?: number;
  exchange_rate?: number;
  currency?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  company_name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance?: number;
  exchange_rate?: number;
  currency?: string;
}

// Alış fiyat listesi türleri
export interface PurchasePriceList {
  id: string;
  name: string;
  description: string;
  supplier_id?: string;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  supplier?: any;
  details: PurchaseCollectionPrice[];
}

export interface PurchaseCollectionPrice {
  id: string;
  purchase_price_list_id: string;
  collection_id: string;
  price_per_square_meter: string;
  created_at: string;
  updated_at: string;
  collection: {
    collectionId: string;
    name: string;
    code: string;
  };
}

export interface CreatePurchasePriceListRequest {
  name: string;
  description?: string;
  supplier_id?: string;
  currency?: string;
  collectionPrices: Array<{
    collection_id: string;
    price_per_square_meter: number;
  }>;
}

// Bakiye yönetimi türleri
export interface BalanceUpdateRequest {
  amount: number;
  exchange_rate: number;
  transaction_type: 'PAYMENT' | 'PURCHASE' | 'ADJUSTMENT' | 'REFUND' | 'DISCOUNT';
  description: string;
  reference_number?: string;
}

export interface BalanceTransaction {
  id: string;
  supplier_id: string;
  transaction_type: string;
  amount: number;
  original_amount?: number;
  exchange_rate?: number;
  original_currency?: string;
  previous_balance: number;
  new_balance: number;
  description: string;
  reference_number?: string;
  created_by: string;
  created_at: string;
  supplier: {
    name: string;
    company_name: string;
  };
}

export interface BalanceSummary {
  summary: {
    totalReceivable: number;
    totalPayable: number;
    receivableCount: number;
    payableCount: number;
    neutralCount: number;
    totalSuppliers: number;
    netBalance: number;
  };
  debtors: Supplier[];
  creditors: Supplier[];
  allSuppliers: Supplier[];
}

// Ürün alımı türleri
export interface PurchaseProductRequest {
  product_id: string;
  quantity_m2: number;
  description?: string;
  reference_number?: string;
}

export interface PurchaseProductResponse {
  supplier: {
    id: string;
    name: string;
    balance: number;
  };
  product: {
    productId: string;
    name: string;
    collection: {
      name: string;
    };
  };
  transaction: {
    id: string;
    transaction_type: string;
    amount: number;
    description: string;
  };
  purchase_details: {
    quantity_m2: number;
    unit_price_usd: number;
    total_usd: number;
  };
}

// ==================== SATICI YÖNETİMİ API'LERİ ====================

// Tüm satıcıları listele
export async function getSuppliers(): Promise<Supplier[]> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers`);
  
  if (!response.ok) {
    throw new Error('Satıcılar yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Yeni satıcı oluştur
export async function createSupplier(supplierData: CreateSupplierRequest): Promise<Supplier> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers`, {
    method: 'POST',
    body: JSON.stringify(supplierData),
  });
  
  if (!response.ok) {
    throw new Error('Satıcı oluşturulurken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Satıcı güncelle
export async function updateSupplier(supplierId: string, supplierData: UpdateSupplierRequest): Promise<Supplier> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/${supplierId}`, {
    method: 'PUT',
    body: JSON.stringify(supplierData),
  });
  
  if (!response.ok) {
    throw new Error('Satıcı güncellenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Satıcı sil (deaktif et)
export async function deleteSupplier(supplierId: string): Promise<void> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/${supplierId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Satıcı silinirken hata oluştu');
  }
}

// ==================== BAKİYE YÖNETİMİ API'LERİ ====================

// Satıcı bakiyesi güncelle
export async function updateSupplierBalance(supplierId: string, balanceData: BalanceUpdateRequest): Promise<Supplier> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/${supplierId}/balance`, {
    method: 'PUT',
    body: JSON.stringify(balanceData),
  });
  
  if (!response.ok) {
    throw new Error('Satıcı bakiyesi güncellenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Satıcı bakiye geçmişi
export async function getSupplierBalanceHistory(
  supplierId: string, 
  page: number = 1, 
  limit: number = 50
): Promise<{ transactions: BalanceTransaction[]; pagination: any }> {
  const response = await apiRequest(
    `${API_URL}/api/admin/purchase-management/suppliers/${supplierId}/balance-history?page=${page}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error('Bakiye geçmişi yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Satıcı bakiye özeti ve borç raporu
export async function getBalanceSummary(): Promise<BalanceSummary> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/balance-summary`);
  
  if (!response.ok) {
    throw new Error('Bakiye özeti yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}


// ==================== ALIŞ FİYAT LİSTESİ API'LERİ ====================

// Tüm alış fiyat listelerini getir
export async function getPurchasePriceLists(): Promise<PurchasePriceList[]> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchase-price-lists`);
  
  if (!response.ok) {
    throw new Error('Alış fiyat listeleri yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Varsayılan alış fiyat listesi
export async function getDefaultPurchasePriceList(): Promise<PurchasePriceList> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchase-price-lists/default`);
  
  if (!response.ok) {
    throw new Error('Varsayılan alış fiyat listesi yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// ID'ye göre alış fiyat listesi
export async function getPurchasePriceListById(listId: string): Promise<PurchasePriceList> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchase-price-lists/${listId}`);
  
  if (!response.ok) {
    throw new Error('Alış fiyat listesi yüklenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Yeni alış fiyat listesi oluştur
export async function createPurchasePriceList(listData: CreatePurchasePriceListRequest): Promise<PurchasePriceList> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchase-price-lists`, {
    method: 'POST',
    body: JSON.stringify(listData),
  });
  
  if (!response.ok) {
    throw new Error('Alış fiyat listesi oluşturulurken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Alış fiyat listesi güncelle
export async function updatePurchasePriceList(
  listId: string, 
  listData: Partial<CreatePurchasePriceListRequest>
): Promise<PurchasePriceList> {
  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchase-price-lists/${listId}`, {
    method: 'PUT',
    body: JSON.stringify(listData),
  });
  
  if (!response.ok) {
    throw new Error('Alış fiyat listesi güncellenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Koleksiyon fiyatı güncelle
export async function updateCollectionPrice(
  listId: string, 
  collectionId: string, 
  price: number
): Promise<CollectionPrice> {
  const response = await apiRequest(
    `${API_URL}/api/admin/purchase-management/purchase-price-lists/${listId}/collections/${collectionId}`, 
    {
      method: 'PUT',
      body: JSON.stringify({ price_per_square_meter: price }),
    }
  );
  
  if (!response.ok) {
    throw new Error('Koleksiyon fiyatı güncellenirken hata oluştu');
  }
  
  const data = await response.json();
  return data.data;
}

// Supplier Purchase Cart APIs
export interface SupplierCartItem {
  id: number;
  product_id: string;
  quantity: number;
  width: string;
  height: string;
  area_m2: string;
  unit_price: string;
  total_price: string;
  has_fringe: boolean;
  cut_type: string;
  notes?: string;
  product: {
    productId: string;
    name: string;
    collection: {
      name: string;
    };
  };
}

export interface SupplierCart {
  id: number;
  supplier_id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  items: SupplierCartItem[];
  supplier: {
    id: string;
    name: string;
    company_name: string;
    balance: string;
  };
}

export interface SupplierCartResponse {
  success: boolean;
  data: {
    cart: SupplierCart;
    total: {
      amount: number;
      currency: string;
      formatted: string;
    };
  };
  message: string;
}

export interface AddToSupplierCartData {
  productId: string;
  quantity: number;
  width: number;
  height: number;
  hasFringe: boolean;
  cutType: string;
  notes?: string;
}

export interface AddToSupplierCartResponse {
  success: boolean;
  data: SupplierCartItem;
  message: string;
}

export interface UpdateSupplierCartItemData {
  quantity?: number;
  width?: number;
  height?: number;
  hasFringe?: boolean;
  cutType?: string;
  notes?: string;
}

export interface SupplierPurchaseResponse {
  success: boolean;
  data: {
    supplier: {
      id: string;
      name: string;
      balance: string;
      currency: string;
    };
    transaction: {
      id: string;
      supplier_id: string;
      transaction_type: string;
      amount: number;
      previous_balance: string;
      new_balance: string;
      description: string;
      reference_number: string;
      created_at: string;
    };
    stockUpdates: Array<{
      product_id: string;
      variation_id: number;
      added_m2: number;
    }>;
    purchasedItems: Array<{
      product_id: string;
      quantity: number;
      area_m2: string;
      total_price: string;
      product: {
        name: string;
        collection: {
          name: string;
        };
      };
    }>;
    totalAmount: number;
  };
  message: string;
}

// Add item to supplier purchase cart
export async function addToSupplierCart(
  supplierId: string,
  data: AddToSupplierCartData
): Promise<AddToSupplierCartResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-cart/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Ürün sepete eklenirken hata oluştu');
  }

  return await response.json();
}

// Get supplier purchase cart
export async function getSupplierCart(supplierId: string): Promise<SupplierCartResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-cart`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Sepet bilgileri alınırken hata oluştu');
  }

  return await response.json();
}

// Update supplier cart item
export async function updateSupplierCartItem(
  supplierId: string,
  itemId: number,
  data: UpdateSupplierCartItemData
): Promise<AddToSupplierCartResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-cart/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Sepet öğesi güncellenirken hata oluştu');
  }

  return await response.json();
}

// Delete supplier cart item
export async function deleteSupplierCartItem(
  supplierId: string,
  itemId: number
): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-cart/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Sepet öğesi silinirken hata oluştu');
  }

  return await response.json();
}

// Complete supplier purchase
export async function completeSupplierPurchase(
  supplierId: string
): Promise<SupplierPurchaseResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/balance`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Satın alma işlemi tamamlanırken hata oluştu');
  }

  return await response.json();
}

// Purchase product from supplier
export interface PurchaseProductFromSupplierData {
  product_id: string;
  quantity_m2: number;
  description?: string;
  reference_number?: string;
}

export interface PurchaseProductFromSupplierResponse {
  success: boolean;
  data: {
    supplier: {
      id: string;
      name: string;
      balance: number;
    };
    product: {
      productId: string;
      name: string;
      collection: {
        name: string;
      };
    };
    transaction: {
      id: string;
      transaction_type: string;
      amount: number;
      description: string;
    };
    purchase_details: {
      quantity_m2: number;
      unit_price_usd: number;
      total_usd: number;
    };
  };
  message: string;
}

export async function purchaseProductFromSupplier(
  supplierId: string,
  data: PurchaseProductFromSupplierData
): Promise<PurchaseProductFromSupplierResponse> {
  const token = getAuthToken();
  if (!token) throw new Error('Token bulunamadı');

  const response = await fetch(`${API_BASE_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-product`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Ürün alımı yapılırken hata oluştu');
  }

  return await response.json();
}

// Purchase History APIs
export interface PurchaseHistoryItem {
  id: string;
  supplier_id: string;
  transaction_type: string;
  amount: string;
  original_amount?: string | null;
  exchange_rate?: string | null;
  original_currency?: string | null;
  previous_balance: string;
  new_balance: string;
  description: string;
  reference_number?: string | null;
  created_by: string;
  created_at: string;
  supplier: {
    id: string;
    name: string;
    company_name: string;
    currency: string;
  };
  transaction_type_description: string;
  amount_formatted: string;
  balance_change: string;
}

export interface PurchaseHistoryResponse {
  success: boolean;
  data: {
    transactions: PurchaseHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      totalTransactions: number;
      totalAmount: number;
      totalAmountFormatted: string;
    };
  };
  message: string;
}

export async function getPurchaseHistory(
  page: number = 1,
  limit: number = 20,
  supplierId?: string
): Promise<PurchaseHistoryResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(supplierId && { supplier_id: supplierId })
  });

  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/purchases?${params}`);

  if (!response.ok) {
    throw new Error('Satın alma geçmişi alınırken hata oluştu');
  }

  return await response.json();
}

// Satıcı sepetinden sipariş oluştur
export interface PurchaseFromCartResponse {
  success: boolean;
  data: {
    supplier: {
      id: string;
      name: string;
      company_name: string;
      phone: string;
      address: string;
      notes: string | null;
      balance: string;
      currency: string;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    };
    transaction: {
      id: string;
      supplier_id: string;
      transaction_type: string;
      amount: string;
      original_amount: string | null;
      exchange_rate: string | null;
      original_currency: string | null;
      previous_balance: string;
      new_balance: string;
      description: string;
      reference_number: string;
      created_by: string;
      created_at: string;
    };
    stockUpdates: Array<{
      product_id: string;
      variation_id: number;
      variation_match: string;
      size: string;
      actual_size: string;
      has_fringe: boolean;
      cut_type: string;
      added_m2: number;
      added_quantity: number;
      old_area_m2: number;
      new_area_m2: number;
    }>;
    purchasedItems: Array<{
      id: number;
      purchase_cart_id: number;
      product_id: string;
      quantity: number;
      width: string;
      height: string;
      area_m2: string;
      unit_price: string;
      total_price: string;
      has_fringe: boolean;
      cut_type: string;
      notes: string;
      created_at: string;
      updated_at: string;
      product: {
        productId: string;
        name: string;
        description: string;
        productImage: string | null;
        collectionId: string;
        createdAt: string;
        updatedAt: string;
        rule_id: number;
        collection: {
          collectionId: string;
          name: string;
          description: string;
          code: string;
          isActive: boolean;
          createdAt: string;
          updatedAt: string;
        };
      };
    }>;
    totalAmount: number;
  };
  message: string;
}

export async function purchaseFromSupplierCart(supplierId: string): Promise<PurchaseFromCartResponse> {
  try {
    const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-from-cart`, {
      method: 'PUT'
    });

    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Purchase from cart error response:', errorData);
      throw new Error(`Sepetten sipariş oluşturulurken hata oluştu: ${response.status}`);
    }

    const data = await response.json();
    
    return data;
  } catch (error) {
    
    throw error;
  }
}

// Satıcı geçmiş işlemler özeti
export interface SupplierPurchaseSummaryItem {
  id: string;
  transaction_type: string;
  amount: string;
  description: string;
  created_at: string;
  reference_number: string | null;
  amount_formatted: string;
  balance_change: string;
  // Yeni alanlar
  items?: Array<{
    urun_ismi: string;
    en: number;
    boy: number;
    m2_fiyati: number;
    adet: number;
    toplam_tutar: number;
  }>;
  items_count?: number;
  total_quantity?: number;
  total_value?: number;
}

export interface CartPurchaseWithProducts {
  transaction_id: string;
  transaction_date: string;
  transaction_amount: number;
  transaction_amount_formatted: string;
  reference_number: string;
  description: string;
  products: Array<{
    id: number;
    product: {
      name: string;
      collection: {
        name: string;
      };
    };
    quantity: number;
    width: string;
    height: string;
    area_m2: string;
    unit_price: string;
    total_price: string;
  }>;
  total_items: number;
  total_quantity: number;
  total_area_m2: number;
  total_area_m2_formatted: string;
}

export interface SupplierPurchaseSummaryResponse {
  success: boolean;
  data: {
    supplier: {
      id: string;
      name: string;
      company_name: string;
      phone: string;
      address: string;
      balance: string;
      currency: string;
    };
    summary: {
      period: {
        start_date: string;
        end_date: string;
      };
      totals: {
        transaction_count: number;
        total_amount: number;
        total_amount_formatted: string;
      };
      purchases: {
        count: number;
        amount: number;
        amount_formatted: string;
      };
      payments: {
        count: number;
        amount: number;
        amount_formatted: string;
      };
      cart_purchases: {
        count: number;
        amount: number;
        amount_formatted: string;
      };
    };
    all_transactions: SupplierPurchaseSummaryItem[];
    cart_purchases_with_products: CartPurchaseWithProducts[];
  };
  message: string;
}

export async function getSupplierPurchaseSummary(
  supplierId: string
): Promise<SupplierPurchaseSummaryResponse> {
  const params = new URLSearchParams({

  });

  const response = await apiRequest(`${API_URL}/api/admin/purchase-management/suppliers/${supplierId}/purchase-summary?${params}`);

  if (!response.ok) {
    throw new Error('Satıcı geçmiş işlemleri alınırken hata oluştu');
  }

  return await response.json();
} 