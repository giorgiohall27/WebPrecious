aconst XLSX = require('xlsx');
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

// Skip header row
const header = rows[0];
console.log('Header:', header);

const products = [];
for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[0]) continue; // Skip empty rows
  products.push({
    rowIndex: i, // 1-based (row in sheet, 0=header)
    category: (row[0] || '').toString().trim(),
    brand: (row[1] || '').toString().trim(),
    description: (row[2] || '').toString().trim(),
    units: (row[3] || '').toString().trim(),
    price: parseFloat(row[4]) || 0,
  });
}
console.log(`Found ${products.length} products`);

// 2. Extract images from Excel (xlsx is a zip file)
const zip = new AdmZip(XLSX_FILE);

// Parse relationships to map rId -> image file
const relsXml = zip.readAsText('xl/drawings/_rels/drawing1.xml.rels');
const rIdToImage = {};
const relRegex = /Relationship\s+Id="(rId\d+)"[^>]*Target="([^"]+)"/g;
let match;
while ((match = relRegex.exec(relsXml)) !== null) {
  const rId = match[1];
  const target = match[2].replace('../media/', '');
  rIdToImage[rId] = target;
}
console.log(`Found ${Object.keys(rIdToImage).length} image relationships`);

// Parse drawing XML to map images to row positions
const drawingXml = zip.readAsText('xl/drawings/drawing1.xml');

// Extract each anchor with its row and rId
// oneCellAnchor pattern: <xdr:from><xdr:col>5</xdr:col>...<xdr:row>N</xdr:row>... r:embed="rIdN"
const anchors = [];
// Split by anchor tags
const anchorRegex = /<xdr:(?:oneCellAnchor|twoCellAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:oneCellAnchor|twoCellAnchor)>/g;
let anchorMatch;
while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
  const content = anchorMatch[1];
  
  // Get row from <xdr:from><xdr:row>
  const fromRowMatch = content.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/);
  // Get rId
  const rIdMatch = content.match(/r:embed="(rId\d+)"/);
  
  if (fromRowMatch && rIdMatch) {
    const row = parseInt(fromRowMatch[1]); // 0-indexed row
    const rId = rIdMatch[1];
    const imageFile = rIdToImage[rId];
    if (imageFile) {
      anchors.push({ row, rId, imageFile });
    }
  }
}

// Sort anchors by row
anchors.sort((a, b) => a.row - b.row);
console.log(`Found ${anchors.length} image anchors`);

// Log first few anchors for debugging
for (let i = 0; i < Math.min(10, anchors.length); i++) {
  console.log(`  Anchor: row=${anchors[i].row}, image=${anchors[i].imageFile}`);
}

// 3. Extract images to public/products/ directory
const extractedImages = new Set();
for (const anchor of anchors) {
  const imagePath = `xl/media/${anchor.imageFile}`;
  try {
    const entry = zip.getEntry(imagePath);
    if (entry) {
      const outputPath = path.join(OUTPUT_DIR, anchor.imageFile);
      fs.writeFileSync(outputPath, entry.getData());
      extractedImages.add(anchor.imageFile);
    }
  } catch (e) {
    console.error(`Failed to extract ${anchor.imageFile}:`, e.message);
  }
}
console.log(`Extracted ${extractedImages.size} unique images`);

// 4. Map images to products by row
// Row in anchor is 0-indexed, products start at row 1 (after header)
for (const product of products) {
  // Find anchor(s) for this product's row
  const matchingAnchors = anchors.filter(a => a.row === product.rowIndex);
  if (matchingAnchors.length > 0) {
    product.image = `/products/${matchingAnchors[0].imageFile}`;
  } else {
    product.image = null;
  }
}

// Count products with images
const withImages = products.filter(p => p.image).length;
console.log(`\n${withImages} products have images, ${products.length - withImages} do not`);

// 5. Generate TypeScript data file
const categories = [...new Set(products.map(p => p.category))];
console.log(`\nCategories: ${categories.join(', ')}`);

// Parse units to extract unitsPerBox
function parseUnitsPerBox(unitsStr) {
  const match = unitsStr.match(/^(\d+)\s*[xX×]/);
  return match ? parseInt(match[1]) : 1;
}

function parseWeight(unitsStr) {
  const match = unitsStr.match(/[xX×]\s*(\d+(?:\.\d+)?)\s*(G|KG|ML|L|PCS)/i);
  return match ? `${match[1]}${match[2].toLowerCase()}` : '';
}

// Generate ID from description
function generateId(brand, description, index) {
  const slug = `${brand}-${description}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${index}`;
}

const tsProducts = products.map((p, i) => {
  const unitsPerBox = parseUnitsPerBox(p.units);
  const weight = parseWeight(p.units);
  return {
    id: generateId(p.brand, p.description, i + 1),
    name: p.description,
    brand: p.brand,
    category: p.category,
    price: p.price,
    units: p.units,
    unitsPerBox,
    weight,
    image: p.image,
    inStock: true,
  };
});

// Write the TypeScript file
const tsContent = `// Auto-generated from Excel: ${XLSX_FILE}
// Generated on: ${new Date().toISOString()}
// Total products: ${tsProducts.length}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  units: string;
  unitsPerBox: number;
  weight: string;
  image: string | null;
  inStock: boolean;
}

export const categories = ${JSON.stringify(categories, null, 2)} as const;

export type Category = typeof categories[number];

export const products: Product[] = ${JSON.stringify(tsProducts, null, 2)};

export const productsByCategory: Record<string, Product[]> = products.reduce((acc, product) => {
  if (!acc[product.category]) {
    acc[product.category] = [];
  }
  acc[product.category].push(product);
  return acc;
}, {} as Record<string, Product[]>);

export const brands: string[] = [...new Set(products.map(p => p.brand))].sort();
`;

const outputTsFile = path.join(__dirname, 'src', 'data', 'products.ts');
fs.writeFileSync(outputTsFile, tsContent);
console.log(`\nWrote TypeScript data to ${outputTsFile}`);

// Print summary
console.log('\n=== SUMMARY ===');
console.log(`Total products: ${products.length}`);
console.log(`Products with images: ${withImages}`);
console.log(`Categories: ${categories.length}`);
console.log(`Brands: ${[...new Set(products.map(p => p.brand))].length}`);
categories.forEach(cat => {
  const count = products.filter(p => p.category === cat).length;
  const withImg = products.filter(p => p.category === cat && p.image).length;
  console.log(`  ${cat}: ${count} products (${withImg} with images)`);
});
