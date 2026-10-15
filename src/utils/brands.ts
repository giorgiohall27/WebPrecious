import { Product } from '../types';

export function normalizeBrandKey(brand?: string | null) {
  return (brand ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

export function findCanonicalBrand(products: Product[], brand?: string | null) {
  const cleanBrand = (brand ?? '').trim().replace(/\s+/g, ' ');
  if (!cleanBrand) return '';

  const brandKey = normalizeBrandKey(cleanBrand);
  return products.find(product => normalizeBrandKey(product.brand) === brandKey)?.brand?.trim() || cleanBrand;
}
