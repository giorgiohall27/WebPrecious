import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Category, Product, CartItem, Subcategory } from '../types';
import { mockCategories, mockProducts, mockSubcategories } from '../data/mockData';
import { supabase, supabaseEnabled } from '../lib/supabase';

interface ProductsContextType {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  loading: boolean;
  decreaseStock: (items: CartItem[]) => void;
  adjustStock: (productId: string, delta: number) => void;
  upsertProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  upsertCategory: (category: Category) => void;
  removeCategory: (categoryId: string) => void;
  upsertSubcategory: (subcategory: Subcategory) => void;
  removeSubcategory: (subcategoryId: string) => void;
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
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(mockSubcategories);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabaseEnabled) return;
    setLoading(true);

    Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('subcategories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
    ]).then(([categoriesResult, subcategoriesResult, productsResult]) => {
      if (!categoriesResult.error && categoriesResult.data?.length) {
        setCategories(categoriesResult.data.map(toCategory));
      }
      if (!subcategoriesResult.error && subcategoriesResult.data) {
        setSubcategories(subcategoriesResult.data.map(toSubcategory));
      }
      if (!productsResult.error && productsResult.data?.length) {
        setProducts(productsResult.data.map(toProduct));
      }
      setLoading(false);
    });
  }, []);

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

  const upsertProduct = useCallback((product: Product) => {
    setProducts(prev => {
      const exists = prev.some(item => item.id === product.id);
      return exists ? prev.map(item => item.id === product.id ? product : item) : [product, ...prev];
    });

    if (supabaseEnabled) {
      supabase.from('products').upsert(fromProduct(product), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error saving product:', error);
      });
    }
  }, []);

  const removeProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(product => product.id !== productId));

    if (supabaseEnabled) {
      supabase.from('products').delete().eq('id', productId).then(({ error }) => {
        if (error) console.error('Error deleting product:', error);
      });
    }
  }, []);

  const upsertCategory = useCallback((category: Category) => {
    setCategories(prev => {
      const exists = prev.some(item => item.id === category.id);
      return exists ? prev.map(item => item.id === category.id ? category : item) : [...prev, category];
    });

    if (supabaseEnabled) {
      supabase.from('categories').upsert(fromCategory(category), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error saving category:', error);
      });
    }
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setCategories(prev => prev.filter(category => category.id !== categoryId));
    setSubcategories(prev => prev.filter(subcategory => subcategory.categoryId !== categoryId));

    if (supabaseEnabled) {
      supabase.from('categories').delete().eq('id', categoryId).then(({ error }) => {
        if (error) console.error('Error deleting category:', error);
      });
    }
  }, []);

  const upsertSubcategory = useCallback((subcategory: Subcategory) => {
    setSubcategories(prev => {
      const exists = prev.some(item => item.id === subcategory.id);
      return exists ? prev.map(item => item.id === subcategory.id ? subcategory : item) : [...prev, subcategory];
    });

    if (supabaseEnabled) {
      supabase.from('subcategories').upsert(fromSubcategory(subcategory), { onConflict: 'id' }).then(({ error }) => {
        if (error) console.error('Error saving subcategory:', error);
      });
    }
  }, []);

  const removeSubcategory = useCallback((subcategoryId: string) => {
    setSubcategories(prev => prev.filter(subcategory => subcategory.id !== subcategoryId));

    if (supabaseEnabled) {
      supabase.from('subcategories').delete().eq('id', subcategoryId).then(({ error }) => {
        if (error) console.error('Error deleting subcategory:', error);
      });
    }
  }, []);

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
    },
    children,
  });
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts must be used within ProductsProvider');
  return context;
}
