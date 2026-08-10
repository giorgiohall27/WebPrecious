import { useTranslation } from 'react-i18next';
import { useMemo, useRef, useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Download,
  Edit3,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../../types';
import { useProducts } from '../../store/productsStore';

type ProductDraft = {
  sku: string;
  name: string;
  categoryId: string;
  price: string;
  brand: string;
  unitMeasure: string;
  description: string;
  imageUrl: string;
};

function emptyDraft(categoryId = 'cat-1'): ProductDraft {
  return {
    sku: '',
    name: '',
    categoryId,
    price: '',
    brand: '',
    unitMeasure: '',
    description: '',
    imageUrl: '',
  };
}

function draftFromProduct(product: Product): ProductDraft {
  return {
    sku: product.sku,
    name: product.name,
    categoryId: product.categoryId,
    price: String(product.price),
    brand: product.brand ?? '',
    unitMeasure: product.unitMeasure ?? '',
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
  };
}

export default function Products() {
  const { t } = useTranslation();
  const { products, categories, upsertProduct, removeProduct } = useProducts();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyDraft);
  const [productBeingEdited, setProductBeingEdited] = useState<Product | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvSummary, setCsvSummary] = useState<{ new: number; updated: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return products.filter(product => {
      const query = search.toLowerCase();
      const matchesSearch = !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.brand ?? '').toLowerCase().includes(query);
      const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, categoryFilter]);

  const openAddProduct = () => {
    setProductBeingEdited(null);
    setProductDraft(emptyDraft(categories[0]?.id ?? 'cat-1'));
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setProductBeingEdited(product);
    setProductDraft(draftFromProduct(product));
    setShowProductModal(true);
  };

  const setDraftField = (field: keyof ProductDraft, value: string) => {
    setProductDraft(prev => ({ ...prev, [field]: value }));
  };

  const buildProductFromDraft = (): Product => {
    const category = categories.find(item => item.id === productDraft.categoryId) ?? categories[0];
    const id = productBeingEdited?.id ?? `prod-admin-${Date.now()}`;

    return {
      id,
      sku: productDraft.sku.trim(),
      name: productDraft.name.trim(),
      categoryId: category?.id ?? 'cat-1',
      categoryName: category?.name ?? 'Sin Categoria',
      price: Number.parseFloat(productDraft.price) || 0,
      stock: productBeingEdited?.stock ?? 9999,
      description: productDraft.description.trim() || productDraft.name.trim(),
      brand: productDraft.brand.trim(),
      unitMeasure: productDraft.unitMeasure.trim(),
      imageUrl: productDraft.imageUrl.trim() || null,
      iva: productBeingEdited?.iva ?? 21,
      active: true,
    };
  };

  const handleProductSave = (event: React.FormEvent) => {
    event.preventDefault();
    upsertProduct(buildProductFromDraft());
    setShowProductModal(false);
    setProductBeingEdited(null);
    setProductDraft(emptyDraft(categories[0]?.id ?? 'cat-1'));
  };

  const handleInlineEdit = (productId: string, field: 'price', value: number) => {
    const product = products.find(item => item.id === productId);
    if (!product || Number.isNaN(value)) return;
    upsertProduct({ ...product, [field]: value });
    setEditingId(null);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      delimiter: '',
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data as any[]);
        let newCount = 0;
        let updatedCount = 0;
        let errorCount = 0;

        (results.data as any[]).forEach((row: any) => {
          if (!row.sku || !row.nombre || !row.precio) {
            errorCount += 1;
            return;
          }
          const exists = products.some(product => product.sku === row.sku);
          if (exists) updatedCount += 1;
          else newCount += 1;
        });
        setCsvSummary({ new: newCount, updated: updatedCount, errors: errorCount });
      },
    });
  };

  const confirmCSVImport = () => {
    csvData.forEach((row: any) => {
      if (!row.sku || !row.nombre || !row.precio) return;
      const existing = products.find(product => product.sku === row.sku);
      const category = categories.find(item => item.name === row.categoria) ?? categories[0];

      upsertProduct({
        id: existing?.id ?? `p-csv-${row.sku}`,
        sku: row.sku,
        name: row.nombre,
        categoryId: category?.id ?? 'cat-1',
        categoryName: row.categoria || category?.name || 'Sin Categoria',
        subcategoryName: row.subcategoria || '',
        price: Number.parseFloat(row.precio) || 0,
        stock: existing?.stock ?? 9999,
        description: row.descripcion || row.nombre,
        brand: row.marca || '',
        unitMeasure: row.unidad_medida || 'unidad',
        active: true,
        imageUrl: existing?.imageUrl ?? null,
        iva: existing?.iva ?? 21,
      });
    });

    setShowCSVModal(false);
    setCsvData([]);
    setCsvSummary(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm(t('products.deleteConfirm'))) {
      removeProduct(id);
    }
  };

  const exportCSV = () => {
    const csvContent = Papa.unparse(products.map(product => ({
      sku: product.sku,
      nombre: product.name,
      categoria: product.categoryName,
      subcategoria: product.subcategoryName,
      precio: product.price,
      descripcion: product.description,
      marca: product.brand,
      unidad_medida: product.unitMeasure,
    })), { delimiter: ';' });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'productos_catalogo.csv';
    link.click();
  };

  const inputClass = 'input-field text-sm';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-surface-900">{t('products.title')}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowCSVModal(true); setCsvData([]); setCsvSummary(null); }} className="btn-secondary text-sm" id="import-csv-btn">
            <Upload className="w-4 h-4" /> {t('products.importCSV')}
          </button>
          <button onClick={exportCSV} className="btn-secondary text-sm" id="export-csv-btn">
            <Download className="w-4 h-4" /> {t('products.exportCSV')}
          </button>
          <button onClick={openAddProduct} className="btn-primary text-sm" id="add-product-btn">
            <Plus className="w-4 h-4" /> {t('products.addProduct')}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('products.searchProducts')}
            className="input-field pl-10"
            id="product-search"
          />
        </div>
        <div className="relative">
          <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="input-field pr-8 appearance-none min-w-[180px]" id="category-filter">
            <option value="">{t('common.all')} {t('nav.categories')}</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">{t('products.sku')}</th>
                <th className="table-header">{t('products.name')}</th>
                <th className="table-header">{t('products.category')}</th>
                <th className="table-header">{t('products.price')}</th>
                <th className="table-header">{t('products.brand')}</th>
                <th className="table-header text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-surface-400">{t('products.noProducts')}</td></tr>
              ) : (
                filtered.map(product => (
                  <tr key={product.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-cell font-mono text-xs text-surface-500">{product.sku}</td>
                    <td className="table-cell font-medium text-surface-900">{product.name}</td>
                    <td className="table-cell">
                      <span className="text-xs text-surface-600">{product.categoryName}</span>
                      {product.subcategoryName && <span className="text-xs text-surface-400"> / {product.subcategoryName}</span>}
                    </td>
                    <td className="table-cell">
                      {editingId === product.id ? (
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={product.price}
                          className="input-field w-24 text-sm py-1"
                          autoFocus
                          onBlur={event => handleInlineEdit(product.id, 'price', Number.parseFloat(event.target.value))}
                          onKeyDown={event => event.key === 'Enter' && handleInlineEdit(product.id, 'price', Number.parseFloat((event.target as HTMLInputElement).value))}
                        />
                      ) : (
                        <button className="font-semibold text-surface-900 hover:text-primary-600" onClick={() => setEditingId(product.id)}>
                          EUR {product.price.toFixed(2)}
                        </button>
                      )}
                    </td>
                    <td className="table-cell text-sm text-surface-500">{product.brand || '-'}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-icon" onClick={() => openEditProduct(product)} title={t('common.edit')}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteProduct(product.id)} title={t('common.delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-surface-100 text-sm text-surface-500">
          {filtered.length} {t('nav.products').toLowerCase()}
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleProductSave} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-slide-up overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">{productBeingEdited ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button type="button" onClick={() => setShowProductModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className={inputClass} placeholder="SKU" value={productDraft.sku} onChange={event => setDraftField('sku', event.target.value)} required />
              <input className={inputClass} placeholder="Nombre" value={productDraft.name} onChange={event => setDraftField('name', event.target.value)} required />
              <select className={inputClass} value={productDraft.categoryId} onChange={event => setDraftField('categoryId', event.target.value)}>
                {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <input className={inputClass} placeholder="Marca" value={productDraft.brand} onChange={event => setDraftField('brand', event.target.value)} />
              <input className={inputClass} type="number" step="0.01" placeholder="Precio" value={productDraft.price} onChange={event => setDraftField('price', event.target.value)} required />
              <input className={inputClass} placeholder="Unidad / caja" value={productDraft.unitMeasure} onChange={event => setDraftField('unitMeasure', event.target.value)} />
              <input className={inputClass} placeholder="URL imagen" value={productDraft.imageUrl} onChange={event => setDraftField('imageUrl', event.target.value)} />
              <textarea className={`${inputClass} sm:col-span-2 min-h-[84px] resize-none`} placeholder="Descripcion" value={productDraft.description} onChange={event => setDraftField('description', event.target.value)} />
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
              <button type="button" onClick={() => setShowProductModal(false)} className="btn-secondary">{t('common.cancel')}</button>
              <button type="submit" className="btn-primary">
                <Save className="w-4 h-4" /> Guardar producto
              </button>
            </div>
          </form>
        </div>
      )}

      {showCSVModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">{t('products.csvImport.title')}</h2>
              <button onClick={() => setShowCSVModal(false)} className="btn-icon"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-surface-300 rounded-xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all"
              >
                <Upload className="w-10 h-10 text-surface-400 mx-auto mb-3" />
                <p className="text-surface-600 font-medium">{t('products.csvImport.dropzone')}</p>
                <p className="text-xs text-surface-400 mt-2">CSV (UTF-8, separador: ; o ,)</p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              </div>

              {csvSummary && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{csvSummary.new}</p>
                      <p className="text-xs text-green-600">{t('products.csvImport.newProducts')}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{csvSummary.updated}</p>
                      <p className="text-xs text-blue-600">{t('products.csvImport.updatedProducts')}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">{csvSummary.errors}</p>
                      <p className="text-xs text-red-600">{t('products.csvImport.errors')}</p>
                    </div>
                  </div>

                  {csvData.length > 0 && (
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>{Object.keys(csvData[0]).slice(0, 6).map(key => <th key={key} className="table-header text-xs">{key}</th>)}</tr>
                        </thead>
                        <tbody>
                          {csvData.slice(0, 10).map((row: any, rowIndex: number) => (
                            <tr key={rowIndex}>
                              {Object.values(row).slice(0, 6).map((value: any, cellIndex: number) => (
                                <td key={cellIndex} className="table-cell text-xs">{String(value)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvData.length > 10 && <p className="text-xs text-surface-400 mt-2 text-center">+{csvData.length - 10} {t('products.csvImport.rows')}</p>}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCSVModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                    <button onClick={confirmCSVImport} className="btn-primary" disabled={csvSummary.new === 0 && csvSummary.updated === 0}>
                      <CheckCircle className="w-4 h-4" /> {t('products.csvImport.confirmImport')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
