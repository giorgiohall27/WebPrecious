const fs = require('fs');
const xlsx = require('xlsx');

const workbook = xlsx.readFile('precious_spain_pedido.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

const headers = Object.keys(data[0] || {});
const colCategory = headers.find(h => h.toLowerCase().includes('categor') || h.toLowerCase().includes('categoria')) || 'CATEGORIA';
const colName = headers.find(h => h.toLowerCase().includes('descripc') || h.toLowerCase().includes('name')) || 'DESCRIPCION';
const colBrand = headers.find(h => h.toLowerCase().includes('marca')) || 'MARCA';
const colUnit = headers.find(h => h.toLowerCase().includes('unidad')) || 'UNIDADES';
const colPrice = headers.find(h => h.toLowerCase().includes('precio')) || 'PRECIO';

const uniqueCategoriesArray = [...new Set(data.map(row => row[colCategory]).filter(Boolean))].map(c => c.trim().toUpperCase());
const uniqueCategories = [...new Set(uniqueCategoriesArray)];

const categories = uniqueCategories.map((cat, i) => ({
  id: `cat-${i + 1}`,
  name: cat,
  key: cat.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  icon: 'Package',
  order: i + 1,
  active: true,
  productCount: data.filter(p => p[colCategory]?.toString().trim().toUpperCase() === cat).length
}));

const products = data.map((row, i) => {
  const catName = row[colCategory]?.toString().trim().toUpperCase() || 'DESCONOCIDO';
  const category = categories.find(c => c.name === catName) || categories[0];
  const name = row[colName]?.toString().trim() || 'Producto sin nombre';
  const brand = row[colBrand]?.toString().trim() || '';
  
  let rawPrice = row[colPrice];
  let priceNum = 0;
  if (typeof rawPrice === 'number') {
    priceNum = rawPrice;
  } else if (typeof rawPrice === 'string') {
    priceNum = parseFloat(rawPrice.replace(/,/g, '.').replace(/[^0-9.]/g, '')) || 0;
  }
  
  const unitMeasureStr = row[colUnit]?.toString().trim() || '';
  let unitsPerBox = 1;
  const match = unitMeasureStr.match(/^(\d+)\s*X/i);
  if (match) {
    unitsPerBox = parseInt(match[1]) || 1;
  }

  return {
    id: `prod-${i + 1}`,
    sku: `SKU-${1000 + i}`,
    name: name,
    categoryId: category ? category.id : 'cat-1',
    categoryName: catName,
    price: priceNum,
    stock: 9999,
    description: name,
    brand: brand,
    unitMeasure: unitMeasureStr,
    unitsPerBox: unitsPerBox,
    weightKg: 0,
    iva: 21,
    active: true,
    imageUrl: `https://placehold.co/400x300/f8fafc/334155?text=${encodeURIComponent(name.substring(0, 20))}`
  };
}).filter(p => p.name !== 'Producto sin nombre');

const tsContent = `// Auto-generated from Excel data
import { Category, Product, Subcategory, Order } from '../types';

export const categories: Category[] = ${JSON.stringify(categories, null, 2)};
export const products: Product[] = ${JSON.stringify(products, null, 2)};
export const subcategories: Subcategory[] = [];
export const orders: Order[] = [];

export const mockCategories = categories;
export const mockProducts = products;
export const mockSubcategories = subcategories;
export const mockOrders = orders;
`;

fs.writeFileSync('src/data/mockData.ts', tsContent);
console.log('Successfully wrote src/data/mockData.ts with', products.length, 'products and', categories.length, 'categories.');
