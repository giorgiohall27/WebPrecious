import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Clipboard,
  ImagePlus,
  Minimize2,
} from 'lucide-react';
import Papa from 'papaparse';
import { Product } from '../../types';
import { useProducts } from '../../store/productsStore';
import { inferUnitsPerBox, normalizeProductPackaging } from '../../utils/productPackaging';

type ProductDraft = {
  sku: string;
  name: string;
  categoryId: string;
  price: string;
  iva: string;
  brand: string;
  unitMeasure: string;
  unitsPerBox: string;
  description: string;
  imageUrl: string;
};

function emptyDraft(categoryId = 'cat-1'): ProductDraft {
  return {
    sku: '',
    name: '',
    categoryId,
    price: '',
    iva: '21',
    brand: '',
    unitMeasure: '',
    unitsPerBox: '',
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
    iva: String(product.iva ?? 21),
    brand: product.brand ?? '',
    unitMeasure: product.unitMeasure ?? '',
    unitsPerBox: String(inferUnitsPerBox(product.description, product.unitMeasure, product.name) ?? product.unitsPerBox ?? ''),
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
  };
}

const PRODUCT_DRAFT_KEY = 'precious-admin-product-draft';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function getNextSku(products: Product[]) {
  const highest = products.reduce((maximum, product) => {
    const match = product.sku.match(/^(?:SKU-)?(\d+)$/i);
    return match ? Math.max(maximum, Number.parseInt(match[1], 10)) : maximum;
  }, 999);
  return `SKU-${highest + 1}`;
}

export default function Products() {
  const { t } = useTranslation();
  const { products, categories, upsertProduct, removeProduct } = useProducts();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productPanelMinimized, setProductPanelMinimized] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(emptyDraft);
  const [productBeingEdited, setProductBeingEdited] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvSummary, setCsvSummary] = useState<{ new: number; updated: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const getCategoryLabel = (category?: { key?: string; name?: string }) =>
    category?.key ? t(`categoryNames.${category.key}`, { defaultValue: category.name ?? '' }) : category?.name ?? '';

  const getProductCategoryLabel = (product: Product) => {
    const category = categories.find(item => item.id === product.categoryId);
    return getCategoryLabel(category) || product.categoryName || '';
  };

  const openAddProduct = () => {
    setProductBeingEdited(null);
    setProductDraft({ ...emptyDraft(categories[0]?.id ?? 'cat-1'), sku: getNextSku(products) });
    setProductPanelMinimized(false);
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setProductBeingEdited(product);
    setProductDraft(draftFromProduct(product));
    setProductPanelMinimized(false);
    setShowProductModal(true);
  };

  useEffect(() => {
    const savedDraft = sessionStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!savedDraft) return;
    try {
      const saved = JSON.parse(savedDraft) as { draft: ProductDraft; productId?: string };
      setProductDraft(saved.draft);
      setProductBeingEdited(saved.productId ? products.find(product => product.id === saved.productId) ?? null : null);
      setShowProductModal(true);
      setProductPanelMinimized(true);
    } catch {
      sessionStorage.removeItem(PRODUCT_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!showProductModal) return;
    sessionStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify({
      draft: productDraft,
      productId: productBeingEdited?.id,
    }));
  }, [productBeingEdited?.id, productDraft, showProductModal]);

  const closeProductPanel = () => {
    setShowProductModal(false);
    setProductBeingEdited(null);
    sessionStorage.removeItem(PRODUCT_DRAFT_KEY);
  };

  const useImageFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      window.alert('Selecciona un archivo de imagen.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      window.alert('La imagen no puede superar los 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraftField('imageUrl', String(reader.result ?? ''));
    reader.readAsDataURL(file);
  };

  const pasteImage = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageType = clipboardItems.flatMap(item => item.types).find(type => type.startsWith('image/'));
      const clipboardItem = clipboardItems.find(item => imageType && item.types.includes(imageType));
      if (!clipboardItem || !imageType) throw new Error('No image');
      useImageFile(new File([await clipboardItem.getType(imageType)], 'imagen-pegada', { type: imageType }));
    } catch {
      window.alert('No hay una imagen en el portapapeles o el navegador no permite acceder a ella.');
    }
  };

  const setDraftField = (field: keyof ProductDraft, value: string) => {
    setProductDraft(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'unitMeasure' || field === 'description' || field === 'name') {
        const currentInference = inferUnitsPerBox(prev.unitMeasure, prev.description);
        const nextInference = inferUnitsPerBox(next.unitMeasure, next.description);
        if (nextInference && (!prev.unitsPerBox || Number.parseInt(prev.unitsPerBox, 10) === currentInference)) {
          next.unitsPerBox = String(nextInference);
        }
      }
      return next;
    });
  };

  const buildProductFromDraft = (): Product => {
    const category = categories.find(item => item.id === productDraft.categoryId) ?? categories[0];
    const id = productBeingEdited?.id ?? `prod-admin-${Date.now()}`;

    return normalizeProductPackaging({
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
      unitsPerBox: Math.max(1, Number.parseInt(productDraft.unitsPerBox, 10) || inferUnitsPerBox(productDraft.description, productDraft.unitMeasure, productDraft.name) || 1),
      imageUrl: productDraft.imageUrl.trim() || null,
      iva: Number.parseFloat(productDraft.iva) === 10 ? 10 : 21,
      active: true,
    });
  };

  const handleProductSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await upsertProduct(buildProductFromDraft());
    sessionStorage.removeItem(PRODUCT_DRAFT_KEY);
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
        unitsPerBox: inferUnitsPerBox(row.descripcion, row.unidad_medida, row.nombre) || existing?.unitsPerBox || 1,
        active: true,
        imageUrl: existing?.imageUrl ?? null,
        iva: existing?.iva ?? 21,
      });
    });

    setShowCSVModal(false);
    setCsvData([]);
    setCsvSummary(null);
  };

  const deleteProduct = (product: Product) => {
    setProductPendingDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (!productPendingDelete) return;
    removeProduct(productPendingDelete.id);
    setProductPendingDelete(null);
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
            {categories.map(category => <option key={category.id} value={category.id}>{getCategoryLabel(category)}</option>)}
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
                <th className="table-header">{t('products.iva')}</th>
                <th className="table-header text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-surface-400">{t('products.noProducts')}</td></tr>
              ) : (
                filtered.map(product => (
                  <tr key={product.id} className="hover:bg-surface-50 transition-colors">
                    <td className="table-cell font-mono text-xs text-surface-500">{product.sku}</td>
                    <td className="table-cell font-medium text-surface-900">{product.name}</td>
                    <td className="table-cell">
                      <span className="text-xs text-surface-600">{getProductCategoryLabel(product)}</span>
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
                    <td className="table-cell text-sm font-semibold text-surface-700">IVA {product.iva ?? 0}%</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-icon" onClick={() => openEditProduct(product)} title={t('common.edit')}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => deleteProduct(product)} title={t('common.delete')}>
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
        <div className={`fixed z-50 right-3 bottom-3 sm:right-6 sm:bottom-6 w-[calc(100%-1.5rem)] sm:w-[560px] transition-all ${productPanelMinimized ? 'max-w-sm' : ''}`}>
          <form onSubmit={handleProductSave} className="bg-white rounded-2xl border border-primary-100 shadow-2xl w-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <div>
                <h2 className="text-lg font-bold text-surface-900">{productBeingEdited ? t('products.editProduct') : t('products.newProduct')}</h2>
                <p className="text-xs text-surface-400">El borrador se conserva mientras revisas la página.</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setProductPanelMinimized(value => !value)} className="btn-icon" title={productPanelMinimized ? 'Abrir panel' : 'Minimizar panel'}><Minimize2 className="w-4 h-4" /></button>
                <button type="button" onClick={closeProductPanel} className="btn-icon" title="Cerrar"><X className="w-5 h-5" /></button>
              </div>
            </div>
            {!productPanelMinimized && <>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[68vh] overflow-y-auto">
              <label><span className="input-label">{t('products.sku')} automático</span><input className={`${inputClass} bg-surface-50 font-mono`} placeholder={t('products.sku')} value={productDraft.sku} onChange={event => setDraftField('sku', event.target.value)} required /></label>
              <input className={inputClass} placeholder={t('products.name')} value={productDraft.name} onChange={event => setDraftField('name', event.target.value)} required />
              <select className={inputClass} value={productDraft.categoryId} onChange={event => setDraftField('categoryId', event.target.value)}>
                {categories.map(category => <option key={category.id} value={category.id}>{getCategoryLabel(category)}</option>)}
              </select>
              <input className={inputClass} placeholder={t('products.brand')} value={productDraft.brand} onChange={event => setDraftField('brand', event.target.value)} />
              <input className={inputClass} type="number" step="0.01" placeholder={t('products.price')} value={productDraft.price} onChange={event => setDraftField('price', event.target.value)} required />
              <input className={inputClass} placeholder={t('products.unitsPerBox')} value={productDraft.unitMeasure} onChange={event => setDraftField('unitMeasure', event.target.value)} />
              <input
                className={inputClass}
                type="number"
                min="1"
                step="1"
                placeholder={t('products.boxUnits')}
                value={productDraft.unitsPerBox}
                onChange={event => setDraftField('unitsPerBox', event.target.value)}
              />
              <div className="sm:col-span-2">
                <label className="input-label">{t('products.productIva')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDraftField('iva', '21')}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${productDraft.iva === '21' ? 'border-primary-500 bg-primary-600 text-white shadow-sm' : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'}`}
                  >
                    IVA 21%
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftField('iva', '10')}
                    className={`rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${productDraft.iva === '10' ? 'border-primary-500 bg-primary-600 text-white shadow-sm' : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'}`}
                  >
                    IVA 10%
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2 space-y-3">
                <label className="input-label">Imagen del producto</label>
                <div
                  className="rounded-xl border-2 border-dashed border-surface-200 p-4 flex flex-col sm:flex-row items-center gap-4 bg-surface-50"
                  onPaste={event => {
                    const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
                    if (file) useImageFile(file);
                  }}
                >
                  <div className="w-24 h-24 rounded-xl bg-white border border-surface-200 overflow-hidden flex items-center justify-center shrink-0">
                    {productDraft.imageUrl ? <img src={productDraft.imageUrl} alt="Vista previa del producto" className="w-full h-full object-contain p-2" /> : <ImagePlus className="w-8 h-8 text-surface-300" />}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-sm text-surface-600">Elige una imagen del ordenador o pégala desde el portapapeles.</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-secondary text-xs"><Upload className="w-4 h-4" /> Elegir archivo</button>
                      <button type="button" onClick={pasteImage} className="btn-secondary text-xs"><Clipboard className="w-4 h-4" /> Pegar imagen</button>
                      {productDraft.imageUrl && <button type="button" onClick={() => setDraftField('imageUrl', '')} className="btn-secondary text-xs text-red-600">Quitar</button>}
                    </div>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={event => { useImageFile(event.target.files?.[0]); event.target.value = ''; }} />
                  </div>
                </div>
                <input className={inputClass} placeholder="O pega la URL de la imagen" value={productDraft.imageUrl.startsWith('data:') ? '' : productDraft.imageUrl} onChange={event => setDraftField('imageUrl', event.target.value)} />
              </div>
              <textarea className={`${inputClass} sm:col-span-2 min-h-[84px] resize-none`} placeholder={t('products.description')} value={productDraft.description} onChange={event => setDraftField('description', event.target.value)} />
            </div>
            <div className="px-6 py-4 border-t border-surface-100 flex justify-end gap-3">
              <button type="button" onClick={closeProductPanel} className="btn-secondary">{t('common.cancel')}</button>
              <button type="submit" className="btn-primary">
                <Save className="w-4 h-4" /> {t('products.saveProduct')}
              </button>
            </div>
            </>}
          </form>
        </div>
      )}

      {productPendingDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">{t('products.deleteTitle')}</h2>
              <p className="text-sm text-surface-500 mt-2">
                {t('products.deleteConfirm')} <span className="font-semibold text-surface-900">{productPendingDelete.name}</span>
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <button type="button" onClick={() => setProductPendingDelete(null)} className="btn-secondary">
                {t('common.no')}
              </button>
              <button type="button" onClick={confirmDeleteProduct} className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-200">
                {t('common.yes')}
              </button>
            </div>
          </div>
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
