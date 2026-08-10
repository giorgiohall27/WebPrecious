import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Category, Product, CartItem, Subcategory } from '../types';
import { mockCategories, mockProducts, mockSubcategories } from '../data/mockData';
import { supabase, supabaseEnabled } from '../lib/supabase';
import { useAuth } from './authStore';

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  loading: boolean;
  decreaseStock: (items: CartItem[]) => void;
  adjustStock: (productId: string, delta: number) => void;
  upsertProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  upsertCategory: (category: Category) => Promise<void>;
  removeCategory: (categoryId: string) => Promise<void>;
  upsertSubcategory: (subcategory: Subcategory) => Promise<void>;
  removeSubcategory: (subcategoryId: string) => Promise<void>;
  refreshCatalog: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

function toProduct(row: any): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    categoryName: row.category_name ?? undefined,
    subcategoryName: row.subcategory_name ?? undefined,
    price: Number(row.price),
    stock: row.stock,
    description: row.description ?? undefined,
    brand: row.brand ?? undefined,
    unitMeasure: row.unit_measure ?? undefined,
    unitsPerBox: row.units_per_box ?? undefined,
    imageUrl: row.image_url ?? undefined,
    weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
    iva: row.iva ?? 21,
    active: row.active,
  };
}

function fromProduct(product: Product) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category_id: product.categoryId,
    subcategory_id: product.subcategoryId ?? null,
    category_name: product.categoryName ?? null,
    subcategory_name: product.subcategoryName ?? null,
    price: product.price,
    stock: product.stock,
    description: product.description ?? null,
    brand: product.brand ?? null,
    unit_measure: product.unitMeasure ?? null,
    units_per_box: product.unitsPerBox ?? null,
    image_url: product.imageUrl ?? null,
    weight_kg: product.weightKg ?? null,
    iva: product.iva ?? 21,
    active: product.active,
  };
}

function toCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    icon: row.icon ?? 'package',
    order: row.sort_order ?? 0,
    active: row.active,
    productCount: row.product_count ?? undefined,
  };
}

function fromCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    key: category.key,
    icon: category.icon,
    sort_order: category.order,
    active: category.active,
  };
}

function toSubcategory(row: any): Subcategory {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    key: row.key,
    order: row.sort_order ?? 0,
    active: row.active,
  };
}

function fromSubcategory(subcategory: Subcategory) {
  return {
    id: subcategory.id,
    category_id: subcategory.categoryId,
    name: subcategory.name,
    key: subcategory.key,
    sort_order: subcategory.order,
    active: subcategory.active,
  };
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const { companySessionToken, superAdminSessionToken } = useAuth();
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(mockSubcategories);
  const [loading, setLoading] = useState(false);

  const catalogToken = companySessionToken || superAdminSessionToken;

  const refreshCatalog = useCallback(async () => {
    if (!supabaseEnabled) return;
    if (!catalogToken) {
      setProducts(mockProducts);
      setCategories(mockCategories);
      setSubcategories(mockSubcategories);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc('get_catalog', { p_session_token: catalogToken });
    if (error) {
      console.error('Error loading catalog:', error);
      setLoading(false);
      return;
    }

    setCategories((data?.categories ?? []).map(toCategory));
    setSubcategories((data?.subcategories ?? []).map(toSubcategory));
    setProducts((data?.products ?? []).map(toProduct));
    setLoading(false);
  }, [catalogToken]);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const decreaseStock = useCallback((items: CartItem[]) => {
    setProducts(prev =>
      prev.map(product => {
        const cartItem = items.find(i => i.product.id === product.id);
        if (cartItem) return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
        return product;
      })
    );
  }, []);

  const adjustStock = useCallback((productId: string, delta: number) => {
    setProducts(prev =>
      prev.map(product => product.id === productId ? { ...product, stock: Math.max(0, product.stock + delta) } : product)
    );
  }, []);

  const upsertProduct = useCallback(async (product: Product) => {
    setProducts(prev => {
      const exists = prev.some(item => item.id === product.id);
      return exists ? prev.map(item => item.id === product.id ? product : item) : [product, ...prev];
    });

    if (supabaseEnabled && superAdminSessionToken) {
      const { data, error } = await supabase.rpc('admin_upsert_product', {
        p_admin_token: superAdminSessionToken,
        p_product: fromProduct(product),
      });
      if (error) {
        console.error('Error saving product:', error);
        return;
      }
      if (data) {
        const saved = toProduct(data);
        setProducts(prev => prev.map(item => item.id === saved.id ? saved : item));
      }
    }
  }, [superAdminSessionToken]);

  const removeProduct = useCallback(async (productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId));

    if (supabaseEnabled && superAdminSessionToken) {
      const { error } = await supabase.rpc('admin_delete_product', {
        p_admin_token: superAdminSessionToken,
        p_product_id: productId,
      });
      if (error) console.error('Error deleting product:', error);
    }
  }, [superAdminSessionToken]);

  const upsertCategory = useCallback(async (category: Category) => {
    setCategories(prev => {
      const exists = prev.some(item => item.id === category.id);
      return exists ? prev.map(item => item.id === category.id ? category : item) : [...prev, category];
    });

    if (supabaseEnabled && superAdminSessionToken) {
      const { data, error } = await supabase.rpc('admin_upsert_category', {
        p_admin_token: superAdminSessionToken,
        p_category: fromCategory(category),
      });
      if (error) {
        console.error('Error saving category:', error);
        return;
      }
      if (data) {
        const saved = toCategory(data);
        setCategories(prev => prev.map(item => item.id === saved.id ? saved : item));
      }
    }
  }, [superAdminSessionToken]);

  const removeCategory = useCallback(async (categoryId: string) => {
    setCategories(prev => prev.filter(category => category.id !== categoryId));
    setSubcategories(prev => prev.filter(subcategory => subcategory.categoryId !== categoryId));

    if (supabaseEnabled && superAdminSessionToken) {
      const { error } = await supabase.rpc('admin_delete_category', {
        p_admin_token: superAdminSessionToken,
        p_category_id: categoryId,
      });
      if (error) console.error('Error deleting category:', error);
    }
  }, [superAdminSessionToken]);

  const upsertSubcategory = useCallback(async (subcategory: Subcategory) => {
    setSubcategories(prev => {
      const exists = prev.some(item => item.id === subcategory.id);
      return exists ? prev.map(item => item.id === subcategory.id ? subcategory : item) : [...prev, subcategory];
    });

    if (supabaseEnabled && superAdminSessionToken) {
      const { data, error } = await supabase.rpc('admin_upsert_subcategory', {
        p_admin_token: superAdminSessionToken,
        p_subcategory: fromSubcategory(subcategory),
      });
      if (error) {
        console.error('Error saving subcategory:', error);
        return;
      }
      if (data) {
        const saved = toSubcategory(data);
        setSubcategories(prev => prev.map(item => item.id === saved.id ? saved : item));
      }
    }
  }, [superAdminSessionToken]);

  const removeSubcategory = useCallback(async (subcategoryId: string) => {
    setSubcategories(prev => prev.filter(subcategory => subcategory.id !== subcategoryId));

    if (supabaseEnabled && superAdminSessionToken) {
      const { error } = await supabase.rpc('admin_delete_subcategory', {
        p_admin_token: superAdminSessionToken,
        p_subcategory_id: subcategoryId,
      });
      if (error) console.error('Error deleting subcategory:', error);
    }
  }, [superAdminSessionToken]);

  return React.createElement(ProductsContext.Provider, {
    value: {
      products,
      categories,
      subcategories,
      loading,
      decreaseStock,
      adjustStock,
      upsertProduct,
      removeProduct,
      upsertCategory,
      removeCategory,
      upsertSubcategory,
      removeSubcategory,
      refreshCatalog,
    },
    children,
  });
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within ProductsProvider');
  return context;
}
