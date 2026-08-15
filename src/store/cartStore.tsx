import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CartItem, Product } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, unitPriceOverride?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTaxTotal: () => number;
  getTotal: () => number;
  getGroupedByCategory: () => Record<string, CartItem[]>;
  getCategoryTotal: (categoryName: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getUnitsPerBox = (product: Product) => Math.max(1, product.unitsPerBox || 1);
const getAvailableBoxes = (product: Product) => Math.max(0, Math.floor(product.stock / getUnitsPerBox(product)));
const getLineUnitPrice = (item: CartItem) => item.unitPriceOverride ?? item.product.price;
const getLineSubtotal = (item: CartItem) => getLineUnitPrice(item) * getUnitsPerBox(item.product) * item.quantity;
const getLineTax = (item: CartItem) => getLineSubtotal(item) * ((item.product.iva ?? 0) / 100);
const getLineTotal = (item: CartItem) => getLineSubtotal(item) + getLineTax(item);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, quantity: number, unitPriceOverride?: number) => {
    const nextQuantity = Math.max(0, quantity);
    if (nextQuantity <= 0) return;
    setItems(prev => {
      const maxBoxes = getAvailableBoxes(product);
      if (maxBoxes <= 0) return prev;
      const normalizedOverride = unitPriceOverride !== undefined ? Math.max(0, unitPriceOverride) : undefined;
      const existing = prev.find(item =>
        item.product.id === product.id &&
        (item.unitPriceOverride ?? item.product.price) === (normalizedOverride ?? product.price)
      );
      if (existing) {
        return prev.map(item =>
          item === existing
            ? { ...item, quantity: Math.min(item.quantity + nextQuantity, maxBoxes) }
            : item
        );
      }
      return [...prev, { product, quantity: Math.min(nextQuantity, maxBoxes), unitPriceOverride: normalizedOverride }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, getAvailableBoxes(item.product)) }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const getItemCount = useCallback(() => items.reduce((acc, item) => acc + item.quantity, 0), [items]);

  const getSubtotal = useCallback(() =>
    items.reduce((acc, item) => acc + getLineSubtotal(item), 0),
    [items]
  );

  const getTaxTotal = useCallback(() =>
    items.reduce((acc, item) => acc + getLineTax(item), 0),
    [items]
  );

  const getTotal = useCallback(() =>
    items.reduce((acc, item) => acc + getLineTotal(item), 0),
    [items]
  );

  const getGroupedByCategory = useCallback(() => {
    return items.reduce((acc, item) => {
      const cat = item.product.categoryName || 'Sin Categoría';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);
  }, [items]);

  const getCategoryTotal = useCallback((categoryName: string) => {
    return items
      .filter(item => item.product.categoryName === categoryName)
      .reduce((acc, item) => acc + getLineTotal(item), 0);
  }, [items]);

  return React.createElement(CartContext.Provider, {
    value: { items, addItem, removeItem, updateQuantity, clearCart, getItemCount, getSubtotal, getTaxTotal, getTotal, getGroupedByCategory, getCategoryTotal },
    children,
  });
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}
