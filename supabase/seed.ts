/**
 * Seeds Supabase with demo companies, categories and products.
 *
 * PowerShell:
 * $env:SUPABASE_SERVICE_KEY="service-role-key"; npx tsx supabase/seed.ts
 */
import { createClient } from '@supabase/supabase-js';
import { mockCategories, mockSubcategories, mockProducts } from '../src/data/mockData';

const url = process.env.VITE_SUPABASE_URL || 'https://foiqyaaibhkegsvevyio.supabase.co';
const key = process.env.SUPABASE_SERVICE_KEY || '';

const superAdmins = [
  {
    id: 'super-admin-main',
    name: 'Levi Super Admin',
    email: 'leviturjeman@gmail.com',
    pin: '909090',
    active: true,
    notes: 'Administrador principal de Precious Spain',
  },
];

const demoCompanies = [
  {
    id: 'comp-hotel-costa-demo',
    name: 'Hotel Costa Demo',
    cif: 'B12345678',
    email: 'compras@hotelcosta.es',
    phone: '+34 900 111 222',
    contact_person: 'Responsable de compras',
    delivery_address: 'Avenida del Mar 18, 29640 Fuengirola',
    pin: '123456',
    active: true,
    notes: 'Cliente demo hosteleria',
  },
  {
    id: 'comp-market-sol',
    name: 'Market Sol S.L.',
    cif: 'B23456789',
    email: 'pedidos@marketsol.es',
    phone: '+34 911 222 333',
    contact_person: 'Laura Martinez',
    delivery_address: 'Calle Sol 24, 28004 Madrid',
    pin: '234567',
    active: true,
    notes: 'Cliente demo retail',
  },
  {
    id: 'comp-restaurante-marina',
    name: 'Restaurante Marina',
    cif: 'B34567890',
    email: 'compras@restaurantemarina.es',
    phone: '+34 952 333 444',
    contact_person: 'David Ruiz',
    delivery_address: 'Paseo Maritimo 7, 29016 Malaga',
    pin: '345678',
    active: true,
    notes: 'Cliente demo restauracion',
  },
];

if (!key) {
  console.error('Set SUPABASE_SERVICE_KEY env var (Settings > API > service_role secret)');
  process.exit(1);
}

const sb = createClient(url, key);

async function seed() {
  console.log('Seeding super admins...');
  const { error: superAdminError } = await sb.from('super_admins').upsert(superAdmins, { onConflict: 'id' });
  if (superAdminError) throw superAdminError;

  console.log('Seeding companies...');
  const { error: companyError } = await sb.from('companies').upsert(demoCompanies, { onConflict: 'id' });
  if (companyError) throw companyError;

  console.log('Seeding categories...');
  const { error: categoryError } = await sb.from('categories').upsert(
    mockCategories.map(category => ({
      id: category.id,
      name: category.name,
      key: category.key,
      icon: category.icon,
      sort_order: category.order,
      active: category.active,
    })),
    { onConflict: 'id' }
  );
  if (categoryError) throw categoryError;

  console.log('Seeding subcategories...');
  const { error: subcategoryError } = await sb.from('subcategories').upsert(
    mockSubcategories.map(subcategory => ({
      id: subcategory.id,
      category_id: subcategory.categoryId,
      name: subcategory.name,
      key: subcategory.key,
      sort_order: subcategory.order,
      active: subcategory.active,
    })),
    { onConflict: 'id' }
  );
  if (subcategoryError) throw subcategoryError;

  console.log('Seeding products...');
  const batchSize = 50;
  for (let i = 0; i < mockProducts.length; i += batchSize) {
    const batch = mockProducts.slice(i, i + batchSize);
    const { error: productError } = await sb.from('products').upsert(
      batch.map(product => ({
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
      })),
      { onConflict: 'id' }
    );
    if (productError) throw productError;
    console.log(`  products ${i + 1}-${Math.min(i + batchSize, mockProducts.length)} done`);
  }

  console.log('Seed complete!');
}

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
