export interface Collection {
  id: string;
  name: string;
  // diğer koleksiyon özellikleri eklenebilir
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
  collectionPrices: Array<{
    collectionId: string;
    pricePerSquareMeter: number;
  }>;
}

export interface DeletePriceListResponse {
  success: boolean;
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
    const response = await fetch(`${API_BASE_URL}/api/price-lists`);
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
    const response = await fetch(`${API_BASE_URL}/api/price-lists/${priceListId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
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
    const response = await fetch(`${API_BASE_URL}/api/price-lists/${priceListId}`, {
      method: 'DELETE',
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