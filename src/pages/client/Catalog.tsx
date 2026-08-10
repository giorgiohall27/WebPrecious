import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, Check, SlidersHorizontal,
  Wine, UtensilsCrossed, SprayCan, Package, HeartPulse, X, Filter, Lock,
} from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../store/cartStore';
import { useProducts } from '../../store/productsStore';
import { useAuth } from '../../store/authStore';

const iconMap: Record<string, any> = {
  wine: Wine,
  'utensils-crossed': UtensilsCrossed,
  'spray-can': SprayCan,
  package: Package,
  'heart-pulse': HeartPulse,
};

export default function Catalog() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const { products, categories, subcategories, adjustStock } = useProducts();

  const selectedCategory    = searchParams.get('category') || '';
  const searchQuery         = searchParams.get('search')   || '';
  const subFromUrl          = searchParams.get('sub')      || '';

  const [selectedSubcategory, setSelectedSubcategory] = useState(subFromUrl);
  const [sortBy, setSortBy]           = useState('name');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMin, setPriceMin]       = useState('');
  const [priceMax, setPriceMax]       = useState('');
  const [quantities, setQuantities]   = useState<Record<string, number>>({});
  const [addedItems, setAddedItems]   = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { isLoggedIn, isSuperAdmin } = useAuth();
  const canViewSensitive = isLoggedIn || isSuperAdmin;

  useEffect(() => {
    setSelectedSubcategory(subFromUrl);
  }, [selectedCategory, subFromUrl]);

  const subcatsForCategory = selectedCategory
    ? subcategories.filter(sc => sc.categoryId === selectedCategory && sc.active)
    : [];

  const filtered = useMemo(() => {
    let result = products.filter(p => p.active);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q))
      );
    }
    if (selectedCategory)    result = result.filter(p => p.categoryId === selectedCategory);
    if (selectedSubcategory) result = result.filter(p => p.subcategoryId === selectedSubcategory);
    if (inStockOnly)         result = result.filter(p => p.stock > 0);
    if (canViewSensitive && priceMin) result = result.filter(p => p.price >= parseFloat(priceMin));
    if (canViewSensitive && priceMax) result = result.filter(p => p.price <= parseFloat(priceMax));
    result.sort((a, b) => {
      if (sortBy === 'name')      return a.name.localeCompare(b.name);
      if (canViewSensitive && sortBy === 'priceAsc')  return a.price - b.price;
      if (canViewSensitive && sortBy === 'priceDesc') return b.price - a.price;
      if (sortBy === 'stock')     return b.stock - a.stock;
      return 0;
    });
    return result;
  }, [searchQuery, selectedCategory, selectedSubcategory, sortBy, inStockOnly, priceMin, priceMax, products, canViewSensitive]);

  useEffect(() => {
    if (!canViewSensitive && (priceMin || priceMax || sortBy.startsWith('price'))) {
      setPriceMin('');
      setPriceMax('');
      setSortBy('name');
    }
  }, [canViewSensitive, priceMin, priceMax, sortBy]);

  const setCategory = (catId: string) => {
    const params: Record<string, string> = {};
    if (catId) params.category = catId;
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);
  };

  const handleSubcategory = (subId: string) => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (subId) params.sub = subId;
    if (searchQuery) params.search = searchQuery;
    setSearchParams(params);
  };

  const getQty = (id: string) => quantities[id] || 1;
  const setQty = (id: string, val: number) => {
    const clamped = Math.max(1, val);
    setQuantities(prev => ({ ...prev, [id]: clamped }));
  };

  const handleAdd = (product: Product) => {
    const requestedBoxes = getQty(product.id);
    const multiplier = product.unitsPerBox || 1;
    const totalUnits = requestedBoxes * multiplier;
    
    addItem(product, totalUnits);
    adjustStock(product.id, -totalUnits);
    setAddedItems(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => setAddedItems(prev => ({ ...prev, [product.id]: false })), 1500);
  };



  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      {!canViewSensitive && (
        <div className="mb-5 rounded-xl border border-primary-100 bg-white px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900">{t('catalog.publicNoticeTitle')}</p>
              <p className="text-xs text-surface-500 mt-0.5">{t('catalog.publicNoticeText')}</p>
            </div>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
          >
            {t('auth.login')}
          </Link>
        </div>
      )}

      {/* Category Bubbles */}
      <div className="mb-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setCategory('')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 whitespace-nowrap ${
              selectedCategory === ''
                ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50'
            }`}
          >
            {t('categoryNames.allCategories')}
          </button>
          {categories.filter(c => c.active).map(cat => {
            const Icon   = iconMap[cat.icon?.toLowerCase?.() ?? cat.icon] || Package;
            const catKey = (cat as any).key as string;
            const count  = products.filter(p => p.categoryId === cat.id && p.active).length;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 whitespace-nowrap ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t(`categoryNames.${catKey}`, cat.name)}
                <span className={`text-[11px] ${active ? 'text-white/70' : 'text-surface-400'}`}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory pills */}
      {subcatsForCategory.length > 0 && (
        <div className="mt-3 mb-5">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <button
              onClick={() => handleSubcategory('')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                !selectedSubcategory
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300 hover:text-primary-600'
              }`}
            >
              {t('common.all')}
            </button>
            {subcatsForCategory.map(sc => {
              const scKey    = (sc as any).key as string;
              const isActive = selectedSubcategory === sc.id;
              const count    = products.filter(p => p.subcategoryId === sc.id && p.active).length;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSubcategory(sc.id)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isActive
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-white text-surface-600 border-surface-200 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  {t(`categoryNames.${scKey}`, sc.name)}
                  <span className={`${isActive ? 'text-primary-200' : 'text-surface-400'}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 mt-4">

        {/* Filters Sidebar */}
        <aside className={`lg:w-60 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="sticky top-20 rounded-2xl border border-surface-200 bg-white shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#0C1E35] to-[#1a3a5c]">
              <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                <SlidersHorizontal className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm tracking-tight flex-1">{t('catalog.filters')}</span>
              {(inStockOnly || (canViewSensitive && (priceMin || priceMax)) || sortBy !== 'name') && (
                <button
                  onClick={() => { setInStockOnly(false); setPriceMin(''); setPriceMax(''); setSortBy('name'); }}
                  className="flex items-center gap-1 text-[11px] text-white/80 hover:text-white font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-full transition-colors border border-white/20"
                >
                  <X className="w-2.5 h-2.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="p-5 space-y-5">

              {/* Sort */}
              <div>
                <label className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">
                  {t('catalog.sortBy')}
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-surface-800 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="name">{t('catalog.sortName')}</option>
                  {canViewSensitive && <option value="priceAsc">{t('catalog.sortPriceAsc')}</option>}
                  {canViewSensitive && <option value="priceDesc">{t('catalog.sortPriceDesc')}</option>}
                  <option value="stock">{t('catalog.sortStock')}</option>
                </select>
              </div>

              {/* Price range */}
              {canViewSensitive && (
                <div>
                  <label className="block text-[11px] font-bold text-surface-400 uppercase tracking-widest mb-1.5">
                    {t('catalog.priceRange')}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-semibold pointer-events-none">€</span>
                      <input
                        type="number"
                        value={priceMin}
                        onChange={e => setPriceMin(e.target.value)}
                        placeholder={t('catalog.min')}
                        className="w-full pl-6 pr-2 py-2.5 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      />
                    </div>
                    <span className="text-surface-300 text-sm">—</span>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-semibold pointer-events-none">€</span>
                      <input
                        type="number"
                        value={priceMax}
                        onChange={e => setPriceMax(e.target.value)}
                        placeholder={t('catalog.max')}
                        className="w-full pl-6 pr-2 py-2.5 text-sm border border-surface-200 rounded-xl bg-surface-50 focus:bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}



              {/* Results count */}
              <div className="pt-1 border-t border-surface-100">
                <p className="text-[11px] text-surface-400 font-medium text-center">
                  <span className="font-bold text-surface-700">{filtered.length}</span> {t('catalog.productsFound')}
                </p>
              </div>

            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-surface-500 font-medium">{filtered.length} {t('catalog.productsFound')}</p>
            <button onClick={() => setShowFilters(!showFilters)} className="btn-ghost lg:hidden text-sm">
              <Filter className="w-4 h-4" /> {t('catalog.filters')}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="card p-16 text-center">
              <Package className="w-14 h-14 text-surface-200 mx-auto mb-4" />
              <p className="text-base font-medium text-surface-500">{t('common.noResults')}</p>
              <button onClick={() => setSearchParams({})} className="mt-4 text-sm text-primary-600 hover:underline">
                {t('catalog.showAll')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(product => {
                const isOut   = product.stock === 0;
                const isAdded = addedItems[product.id];
                return (
                  <div key={product.id} className={`card overflow-hidden group ${isOut ? 'opacity-70' : ''} hover:shadow-card-hover hover:border-surface-300 transition-all duration-150 flex flex-col`}>

                    {/* Image Area */}
                    <div
                      className="h-48 bg-gradient-to-br from-surface-50 to-white flex items-center justify-center relative overflow-hidden border-b border-surface-100 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500 ease-out"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const fb = img.parentElement?.querySelector('.product-fb') as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="product-fb absolute inset-0 flex-col items-center justify-center gap-2"
                        style={{ display: product.imageUrl ? 'none' : 'flex' }}
                      >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-sm">
                          <span className="text-2xl font-black text-primary-600">{(product.brand || product.name || 'P')[0]}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider max-w-[80%] text-center line-clamp-1">{product.brand}</span>
                      </div>
                      
                      {/* Units - Top Right */}
                      {product.unitMeasure && (
                        <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm text-primary-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary-100 shadow-sm">
                          {product.unitMeasure}
                        </span>
                      )}
                    </div>

                    {/* Info Section */}
                    <div className="p-4 flex-1 flex flex-col">
                      {/* Brand & Description Below Image */}
                      {product.brand && (
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wider mb-0.5">
                          {product.brand}
                        </p>
                      )}
                      <h3
                        className="font-bold text-surface-900 text-sm leading-tight cursor-pointer hover:text-primary-600 transition-colors line-clamp-2"
                        onClick={() => setSelectedProduct(product)}
                      >
                        {product.name}
                      </h3>
                      {product.description && product.description !== product.name && (
                        <p className="text-xs text-surface-500 mt-1 line-clamp-2 flex-1">
                          {product.description}
                        </p>
                      )}

                      {canViewSensitive ? (
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex flex-col items-center mr-2">
                            {product.unitsPerBox && product.unitsPerBox > 1 && (
                              <span className="text-[9px] text-surface-400 font-bold uppercase mb-0.5">Cajas</span>
                            )}
                            <div className="flex items-center bg-surface-50 border border-surface-200 rounded-lg overflow-hidden shrink-0">
                              <button
                                onClick={(e) => { e.stopPropagation(); setQty(product.id, getQty(product.id) - 1); }}
                                className="px-2 py-1.5 hover:bg-surface-200 transition-colors text-surface-600"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-surface-800">
                                {getQty(product.id)}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); setQty(product.id, getQty(product.id) + 1); }}
                                className="px-2 py-1.5 hover:bg-surface-200 transition-colors text-surface-600"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-black text-surface-900 leading-none">
                                EUR {product.price.toFixed(2)}
                              </span>
                              <button
                                onClick={() => handleAdd(product)}
                                className={`p-2 rounded-lg transition-all duration-150 ${
                                  isAdded
                                    ? 'bg-emerald-500 text-white shadow-lg scale-95'
                                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-md active:scale-95'
                                }`}
                              >
                                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-surface-100 bg-surface-50 px-3 py-2">
                          <span className="text-xs font-semibold text-surface-500">{t('catalog.priceHidden')}</span>
                          <Link to="/login" className="text-xs font-bold text-primary-600 hover:text-primary-700">
                            {t('auth.login')}
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Product Detail Modal ──────────────────────────────────── */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Image */}
            <div className="h-64 bg-gradient-to-br from-surface-50 to-white relative overflow-hidden border-b border-surface-100">
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-contain p-6"
                  onError={e => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    const fb = img.parentElement?.querySelector('.modal-fb') as HTMLElement;
                    if (fb) fb.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="modal-fb absolute inset-0 flex-col items-center justify-center gap-3"
                style={{ display: selectedProduct.imageUrl ? 'none' : 'flex' }}
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-md">
                  <span className="text-3xl font-black text-primary-600">{(selectedProduct.brand || selectedProduct.name || 'P')[0]}</span>
                </div>
                <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{selectedProduct.brand}</span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-7 h-7 bg-white border border-surface-200 rounded-full flex items-center justify-center hover:bg-surface-50 shadow-sm transition-colors"
              >
                <X className="w-3.5 h-3.5 text-surface-600" />
              </button>
              {selectedProduct.brand && (
                <span className="absolute top-3 left-3 bg-white border border-surface-100 text-xs text-surface-700 font-medium px-2.5 py-1 rounded-full shadow-sm">
                  {selectedProduct.brand}
                </span>
              )}
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-[11px] text-primary-500 font-mono mb-1 uppercase tracking-wide">{selectedProduct.sku}</p>
              <h2 className="text-lg font-bold text-surface-900 mb-1">{selectedProduct.name}</h2>
              <p className="text-xs text-surface-400 mb-3">
                {selectedProduct.categoryName}{selectedProduct.subcategoryName ? ` › ${selectedProduct.subcategoryName}` : ''}
              </p>

              {selectedProduct.description && (
                <p className="text-sm text-surface-600 mb-4 leading-relaxed">{selectedProduct.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-5">
                {selectedProduct.unitMeasure && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-surface-100 text-surface-600">{selectedProduct.unitMeasure}</span>
                )}
                {selectedProduct.iva !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-surface-100 text-surface-600">IVA {selectedProduct.iva}%</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 bg-surface-50 p-4 rounded-xl border border-surface-100">
                {canViewSensitive ? (
                  <div className="flex flex-col">
                    <p className="text-2xl font-bold text-surface-900 leading-none">
                      EUR {selectedProduct.price.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-surface-400 mt-1 uppercase font-bold tracking-wider">{t('catalog.perUnit')}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-surface-600">
                    <Lock className="w-4 h-4 text-primary-600" />
                    <p className="text-sm font-bold">{t('catalog.priceHidden')}</p>
                  </div>
                )}

                {canViewSensitive ? (
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                      {selectedProduct.unitsPerBox && selectedProduct.unitsPerBox > 1 && (
                        <span className="text-[9px] text-surface-400 font-bold uppercase mb-0.5">Cajas</span>
                      )}
                      <div className="flex items-center bg-white border border-surface-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                          onClick={() => setQty(selectedProduct.id, getQty(selectedProduct.id) - 1)}
                          className="px-3 py-2 hover:bg-surface-100 transition-colors text-surface-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm font-bold text-surface-800">
                          {getQty(selectedProduct.id)}
                        </span>
                        <button
                          onClick={() => setQty(selectedProduct.id, getQty(selectedProduct.id) + 1)}
                          className="px-3 py-2 hover:bg-surface-100 transition-colors text-surface-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        handleAdd(selectedProduct);
                        setTimeout(() => setSelectedProduct(null), 600);
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md bg-primary-600 hover:bg-primary-700 text-white active:scale-95"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {t('catalog.addToOrder')}
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                  >
                    {t('auth.login')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
