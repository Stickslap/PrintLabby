import axios from 'axios';

export interface ProductImage {
  url_standard: string;
  url_zoom?: string;
}

export interface Variant {
  id: number;
  product_id: number;
  sku?: string;
  price?: number;
  calculated_price?: number;
  purchasing_disabled?: boolean;
  purchasing_disabled_message?: string;
  option_values?: {
    id: number;
    label: string;
    option_id: number;
    option_display_name: string;
  }[];
}

export interface OptionValue {
  id: number;
  label: string;
  option_id?: number;
  adjusters?: {
    price?: {
      adjuster: 'relative' | 'percentage';
      adjuster_value: number;
    };
  };
}

export interface Option {
  id: number;
  name: string;
  display_name: string;
  type: string;
  option_values: OptionValue[];
}

export interface Modifier extends Option {
  required: boolean;
}

export interface CustomField {
  id: number;
  name: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  sku: string;
  primary_image?: ProductImage;
  images?: ProductImage[];
  base_variant_id?: number | null;
  variants?: Variant[];
  options?: Option[];
  modifiers?: Modifier[];
  custom_fields?: CustomField[];
  categories?: number[];
  search_keywords?: string;
}

export interface Category {
  id: number;
  parent_id: number;
  name: string;
  description: string;
  url: string;
  is_visible: boolean;
}

const api = axios.create({
  baseURL: '/api',
});

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data } = await api.get('/products');
    // BigCommerce V3 returns data in the .data property
    return data?.data || [];
  } catch (error: any) {
    if (error.response?.status === 500 || error.response?.data?.error?.includes('BigCommerce') || error.response?.data?.error?.includes('BC not configured')) {
      console.warn("BigCommerce is not configured. Returning empty product list.");
      return [];
    }
    console.error("API Error fetching products:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw error;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data } = await api.get('/categories');
    return data?.data || [];
  } catch (error: any) {
    if (error.response?.status === 500 || error.response?.data?.error?.includes('BigCommerce') || error.response?.data?.error?.includes('BC not configured')) {
      return [];
    }
    console.error("API Error fetching categories:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return [];
  }
};

export const getProduct = async (id: string): Promise<Product> => {
  try {
    const { data } = await api.get(`/products/${id}`);
    return data.data;
  } catch (error: any) {
    if (error.response?.data?.error?.includes('BigCommerce') || error.response?.data?.error?.includes('BC not configured') || error.response?.status === 500) {
      throw new Error("Store is not yet configured. Please connect BigCommerce in settings.");
    }
    throw error;
  }
};

export const buyNow = async (productId: number, variantId?: number | null, options?: any[]): Promise<{ checkout_url: string }> => {
  const { data } = await api.post('/buy-now', {
    product_id: productId,
    variant_id: variantId,
    quantity: 1,
    options
  });
  return data;
};
