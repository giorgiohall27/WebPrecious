const fs = require('fs');
const productsJson = JSON.parse(fs.readFileSync('src/data/products.json', 'utf8'));

const IMGS = {
  PLACEHOLDER: (text) => `https://placehold.co/400x300/f8fafc/334155?text=${encodeURIComponent(text)}`
};

const uniqueCategoriesArray = [...new Set(productsJson.map(row => row.CATEGORIA).filter(Boolean))].map(c => c.trim());
const uniqueCategories = [...new Set(uniqueCategoriesArray)];

const categories = uniqueCategories.map((cat, i) => ({
  id: `cat-${i + 1}`,
  name: cat,
  key: cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  icon: 'Package', // default icon
  order: i + 1,
  active: true,
  productCount: productsJson.filter(p => p.CATEGORIA?.trim() === cat).length
}));

const products = productsJson.map((row, i) => {
  const catName = row.CATEGORIA?.trim() || 'Desconocido';
  const category = categories.find(c => c.name === catName) || categories[0];
  const name = row.DESCRIPCION || 'Producto sin nombre';
  const brand = row.MARCA || '';
  
  return {
    id: `prod-${i + 1}`,
    sku: `SKU-${1000 + i}`,
    name: name,
    categoryId: category ? category.id : 'cat-1',
    categoryName: catName,
    price: parseFloat(row.PRECIO) || 0,
    stock: 9999, // User requested no stock limits
    description: name,
    brand: brand,
    unitMeasure: row.UNIDADES || '',
    weightKg: 0,
    iva: 21,
    active: true,
    imageUrl: IMGS.PLACEHOLDER(name)
  };
});

const tsContent = `// Auto-generated from Excel data
import { Category, Product } from '../types';

export const categories: Category[] = ${JSON.stringify(categories, null, 2)};

export const products: Product[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync('src/data/mockData.ts', tsContent);
console.log('Successfully wrote src/data/mockData.ts with', products.length, 'products and', categories.length, 'categories.');
