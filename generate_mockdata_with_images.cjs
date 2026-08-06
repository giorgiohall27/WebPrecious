const XLSX = require('xlsx');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const XLSX_FILE = 'Copia de precious spain pedido con fotos.xlsx';
const OUTPUT_DIR = path.join(__dirname, 'public', 'products');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 1. Read product data from Excel
const wb = XLSX.readFile(XLSX_FILE);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

const header = rows[0];
console.log('Header:', header);

const rawProducts = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[0] || !row[2]) continue; // Skip empty rows or rows with no description
  const name = (row[2] || '').toString().trim();
  if (!name) continue; // Skip if no product name
  rawProducts.push({
    rowIndex: i,
    category: (row[0] || '').toString().trim(),
    brand: (row[1] || '').toString().trim(),
    description: name,
    units: (row[3] || '').toString().trim(),
    price: parseFloat(row[4]) || 0,
  });
}
console.log(`Found ${rawProducts.length} valid products`);

// 2. Extract images from Excel
const zip = new AdmZip(XLSX_FILE);

// Parse relationships to map rId -> image file
const relsXml = zip.readAsText('xl/drawings/_rels/drawing1.xml.rels');
const rIdToImage = {};
const relRegex = /Relationship\s+Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
let match;
while ((match = relRegex.exec(relsXml)) !== null) {
  rIdToImage[match[1]] = match[2].replace('../media/', '');
}

// Parse drawing XML to map images to row positions
const drawingXml = zip.readAsText('xl/drawings/drawing1.xml');
const anchors = [];
const anchorRegex = /<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g;
let anchorMatch;
while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
  const content = anchorMatch[1];
  const fromRowMatch = content.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
  const rIdMatch = content.match(/r:embed="(rId\d+)"/);
  if (fromRowMatch && rIdMatch) {
    const row = parseInt(fromRowMatch[1]);
    const imageFile = rIdToImage[rIdMatch[1]];
    if (imageFile) {
      anchors.push({ row, imageFile });
    }
  }
}
anchors.sort((a, b) => a.row - b.row);
console.log(`Found ${anchors.length} image anchors`);

// Extract images
for (const anchor of anchors) {
  const imagePath = `xl/media/${anchor.imageFile}`;
  try {
    const entry = zip.getEntry(imagePath);
    if (entry) {
      fs.writeFileSync(path.join(OUTPUT_DIR, anchor.imageFile), entry.getData());
    }
  } catch (e) {
    console.error(`Failed to extract ${anchor.imageFile}:`, e.message);
  }
}

// Map images to products
for (const product of rawProducts) {
  const matchingAnchors = anchors.filter(a => a.row === product.rowIndex);
  product.image = matchingAnchors.length > 0 ? `/products/${matchingAnchors[0].imageFile}` : null;
}

// Parse units
function parseUnitsPerBox(unitsStr) {
  const m = unitsStr.match(/^(\d+)\s*[xX×]/);
  return m ? parseInt(m[1]) : 1;
}

// 3. Build category map
const categoryNames = [...new Set(rawProducts.map(p => p.category))];
const categoryMap = {};
categoryNames.forEach((name, idx) => {
  const id = `cat-${idx + 1}`;
  const key = name.toLowerCase().replace(/\s+/g, '-');
  categoryMap[name] = { id, name, key, icon: 'Package', order: idx + 1, active: true };
});

// Count products per category
for (const cat of Object.values(categoryMap)) {
  cat.productCount = rawProducts.filter(p => p.category === cat.name).length;
}

// 4. Generate the TypeScript content
const categoriesArray = Object.values(categoryMap);

const productsArray = rawProducts.map((p, idx) => {
  const catInfo = categoryMap[p.category];
  const unitsPerBox = parseUnitsPerBox(p.units);
  return {
    id: `prod-${idx + 1}`,
    sku: `SKU-${1000 + idx}`,
    name: p.description,
    categoryId: catInfo.id,
    categoryName: p.category,
    price: p.price,
    stock: 9999,
    description: p.description,
    brand: p.brand,
    unitMeasure: p.units,
    unitsPerBox: unitsPerBox,
    weightKg: 0,
    iva: 21,
    active: true,
    imageUrl: p.image,
  };
});

// Generate the file content
let ts = `// Auto-generated from Excel data with real product images
// Generated on: ${new Date().toISOString()}
// Source: ${XLSX_FILE}
import { Category, Product, Subcategory, Order } from '../types';

export const categories: Category[] = ${JSON.stringify(categoriesArray, null, 2)};
export const products: Product[] = ${JSON.stringify(productsArray, null, 2)};
export const subcategories: Subcategory[] = [];
export const orders: Order[] = [];

export const mockCategories = categories;
export const mockProducts = products;
export const mockSubcategories = subcategories;
export const mockOrders = orders;
`;

// Fix null imageUrl to use a placeholder for products without images
// Actually, we'll keep null and let the component handle it.
// But for products without image, we need a nice fallback.

const outputFile = path.join(__dirname, 'src', 'data', 'mockData.ts');
fs.writeFileSync(outputFile, ts);
console.log(`\nWrote ${outputFile}`);

// Summary
const withImages = productsArray.filter(p => p.imageUrl).length;
console.log(`\n=== SUMMARY ===`);
console.log(`Total products: ${productsArray.length}`);
console.log(`Products with real images: ${withImages}`);
console.log(`Products without images: ${productsArray.length - withImages}`);
console.log(`Categories: ${categoriesArray.length}`);
categoryNames.forEach(cat => {
  const count = rawProducts.filter(p => p.category === cat).length;
  const withImg = rawProducts.filter(p => p.category === cat && p.image).length;
  console.log(`  ${cat}: ${count} products (${withImg} with images)`);
});
