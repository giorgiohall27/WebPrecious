import { useTranslation } from 'react-i18next';
import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Minus,
  Wine, UtensilsCrossed, SprayCan, Package, HeartPulse, X, Lock, Tag,
} from 'lucide-react';
import { CartItem, Product } from '../../types';
import { useCart } from '../../store/cartStore';
import { useProducts } from '../../store/productsStore';
import { useAuth } from '../../store/authStore';
import { usePromotions } from '../../store/promotionsStore';
import { normalizeBrandKey } from '../../utils/brands';

const iconMap: Record<string, any> = {
  wine: Wine,
  'utensils-crossed': UtensilsCrossed,
  'spray-can': SprayCan,
  package: Package,
  'heart-pulse': HeartPulse,
};

const brandPriority = (brand: string, selectedCategoryName?: string) => {
  if (selectedCategoryName?.toLowerCase() !== 'snacks') return 0;
  const normalized = brand.toLowerCase();
  if (normalized === 'walkers') return -2;
  if (normalized === "mccoy's" || normalized === 'mccoys') return -1;
  return 0;
};

const enlargedProductImages = new Set([
  'cadbury|white chocolate buttons',
  'mr.beast|milk chocolate crunch bar',
  'mr.beast|milk chocolate bar',
  'mr.beast|milk chocolate / almond',
  "reese's|overload",
  "reese's|nutrageous bars",
  'hill|chocolate creams',
  'strongbow|original',
]);

const shouldEnlargeProductImage = (product: Product) =>
  enlargedProductImages.has(`${product.brand?.toLowerCase()}|${product.name.toLowerCase().replace(/\s+/g, ' ').trim()}`);

const sortBrandProducts = (brand: string, products: Product[]) => {
  const normalizedBrand = brand.toLowerCase();
  const gravyOrder = ['beef gravy', 'chicken gravy', 'vegetable gravy granules'];

  return [...products].sort((a, b) => {
    if (normalizedBrand === 'cadbury') {
      const multipackOrder = Number(isCadburyMultipack(b)) - Number(isCadburyMultipack(a));
      if (multipackOrder) return multipackOrder;
    }

    if (normalizedBrand === 'morrison') {
      const aGravy = gravyOrder.indexOf(a.name.toLowerCase());
      const bGravy = gravyOrder.indexOf(b.name.toLowerCase());
      if (aGravy !== -1 || bGravy !== -1) {
        if (aGravy === -1) return 1;
        if (bGravy === -1) return -1;
        return aGravy - bGravy;
      }
    }

    return a.name.localeCompare(b.name);
  });
};

const sortBrands = (entries: [string, Product[]][], selectedCategoryName?: string) => {
  const sorted = [...entries].sort(([a], [b]) =>
    brandPriority(a, selectedCategoryName) - brandPriority(b, selectedCategoryName) || a.localeCompare(b)
  );

  if (selectedCategoryName?.toLocaleLowerCase() === 'alimentación') {
    const pgIndex = sorted.findIndex(([brand]) => brand.toLowerCase() === 'pg');
    const yorkshireIndex = sorted.findIndex(([brand]) => brand.toLowerCase() === 'yorkshire tea');
    if (pgIndex !== -1 && yorkshireIndex !== -1) {
      const [pg] = sorted.splice(pgIndex, 1);
      const updatedYorkshireIndex = sorted.findIndex(([brand]) => brand.toLowerCase() === 'yorkshire tea');
      sorted.splice(updatedYorkshireIndex + 1, 0, pg);
    }
  }

  return sorted;
};

const isCadburyMultipack = (product: Product) =>
  product.brand?.toLowerCase() === 'cadbury' && product.name.toLowerCase().includes('multipack');

const quantitiesFromCart = (items: CartItem[]) => items.reduce<Record<string, number>>((totals, item) => {
  totals[item.product.id] = (totals[item.product.id] ?? 0) + item.quantity;
  return totals;
}, {});

export default function Catalog() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem, updateQuantity, items: cartItems } = useCart();
  const { products, categories, subcategories, adjustStock } = useProducts();
  const { promotions } = usePromotions();

  const selectedCategory    = searchParams.get('category') || '';
  const searchQuery         = searchParams.get('search')   || '';
  const productFromUrl      = searchParams.get('product')  || '';
  const subFromUrl          = searchParams.get('sub')      || '';
  const selectedBrand       = searchParams.get('brand')    || '';

  const [selectedSubcategory, setSelectedSubcategory] = useState(subFromUrl);
  const [quantities, setQuantities]   = useState<Record<string, number>>(() => quantitiesFromCart(cartItems));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { isLoggedIn, isSuperAdmin, isSupplier } = useAuth();
  const canViewSensitive = isLoggedIn || isSuperAdmin || isSupplier;

  const promotionByProductId = useMemo(() => {
    const now = Date.now();
    return new Map(
      promotions
        .filter(promotion =>
          promotion.active &&
          new Date(promotion.startsAt).getTime() <= now &&
          new Date(promotion.endsAt).getTime() > now
        )
        .map(promotion => [promotion.productId, promotion]),
    );
  }, [promotions]);

  useEffect(() => {
    setSelectedSubcategory(subFromUrl);
  }, [selectedCategory, subFromUrl]);

  useEffect(() => {
    if (!productFromUrl) return;
    const product = products.find(item => item.id === productFromUrl && item.active);
    if (product) setSelectedProduct(product);
  }, [productFromUrl, products]);

  useEffect(() => {
    const cartQuantities = quantitiesFromCart(cartItems);
    setQuantities(current => {
      const trackedProductIds = new Set([...Object.keys(current), ...Object.keys(cartQuantities)]);
      return Object.fromEntries(
        Array.from(trackedProductIds, productId => [productId, cartQuantities[productId] ?? 0]),
      );
    });
  }, [cartItems]);

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
        (p.brand?.toLowerCase().includes(q)) ||
        (p.description?.toLowerCase().includes(q))
      );
    }
    if (selectedCategory)    result = result.filter(p => p.categoryId === selectedCategory);
    if (selectedSubcategory) result = result.filter(p => p.subcategoryId === selectedSubcategory);
    if (selectedBrand)       result = result.filter(p => normalizeBrandKey(p.brand || 'Sin marca') === normalizeBrandKey(selectedBrand));
    result.sort((a, b) => (a.brand || '').localeCompare(b.brand || '') || a.name.localeCompare(b.name));
    return result;
  }, [searchQuery, selectedCategory, selectedSubcategory, selectedBrand, products]);

  const brandOptions = useMemo(() => {
    let scope = products.filter(p => p.active);
    if (selectedCategory) scope = scope.filter(p => p.categoryId === selectedCategory);
    if (selectedSubcategory) scope = scope.filter(p => p.subcategoryId === selectedSubcategory);
    const brands = new Map<string, string>();
    scope.forEach(product => {
      const brand = product.brand?.trim() || 'Sin marca';
      if (!brands.has(normalizeBrandKey(brand))) brands.set(normalizeBrandKey(brand), brand);
    });
    return Array.from(brands.values()).sort((a, b) => a.localeCompare(b));
  }, [products, selectedCategory, selectedSubcategory]);

  const brandGroups = useMemo(() => {
    const groups = new Map<string, { brand: string; products: Product[] }>();
    filtered.forEach(product => {
      const brand = product.brand?.trim() || 'Sin marca';
      const key = normalizeBrandKey(brand);
      const group = groups.get(key);
      if (group) group.products.push(product);
      else groups.set(key, { brand, products: [product] });
    });
    const categoryName = categories.find(category => category.id === selectedCategory)?.name;
    const entries = Array.from(groups.values())
      .map(({ brand, products: brandProducts }) => [
        brand,
        sortBrandProducts(brand, brandProducts),
      ] as [string, Product[]]);
    return sortBrands(entries, categoryName);
  }, [filtered, categories, selectedCategory]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedCategory, selectedSubcategory, selectedBrand]);

  const setCategory = (catId: string) => {
    const params: Record<string, string> = {};
    if (catId) params.category = catId;
    setSearchParams(params);
  };

  const handleSubcategory = (subId: string) => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (subId) params.sub = subId;
    setSearchParams(params);
  };

  const handleBrand = (brand: string) => {
    const params: Record<string, string> = {};
    if (selectedCategory) params.category = selectedCategory;
    if (selectedSubcategory) params.sub = selectedSubcategory;
    if (brand) params.brand = brand;
    setSearchParams(params);
  };

  const getQty = (id: string) => quantities[id] || 0;
  const setQty = (product: Product, val: number) => {
    const previousBoxes = getQty(product.id);
    const multiplier = product.unitsPerBox || 1;
    const availableAdditionalBoxes = Math.max(0, Math.floor(product.stock / multiplier));
    const requestedBoxes = Math.min(Math.max(0, val), previousBoxes + availableAdditionalBoxes);
    if (requestedBoxes === previousBoxes) return;
    const promotion = promotionByProductId.get(product.id);

    setQuantities(prev => ({ ...prev, [product.id]: requestedBoxes }));
    if (previousBoxes === 0 && requestedBoxes > 0) {
      addItem(product, requestedBoxes, promotion?.promoPrice);
    } else {
      updateQuantity(product.id, requestedBoxes);
    }
    adjustStock(product.id, -(requestedBoxes - previousBoxes) * multiplier);
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

      {brandOptions.length > 1 && (
        <div className="mt-3 mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => handleBrand('')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                !selectedBrand
                  ? 'bg-surface-900 text-white border-surface-900 shadow-sm'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400 hover:text-surface-900'
              }`}
            >
              {t('catalog.allBrands')}
            </button>
            {brandOptions.map(brand => {
              const isActive = selectedBrand === brand;
              const count = products.filter(p =>
                p.active &&
                (!selectedCategory || p.categoryId === selectedCategory) &&
                (!selectedSubcategory || p.subcategoryId === selectedSubcategory) &&
                (p.brand || 'Sin marca') === brand
              ).length;
              return (
                <button
                  key={brand}
                  onClick={() => handleBrand(brand)}
                  className={`flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                    isActive
                      ? 'bg-surface-900 text-white border-surface-900 shadow-sm'
                      : 'bg-white text-surface-600 border-surface-200 hover:border-surface-400 hover:text-surface-900'
                  }`}
                >
                  {brand}
                  <span className={`${isActive ? 'text-white/70' : 'text-surface-400'}`}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-surface-500 font-medium">{filtered.length} {t('catalog.productsFound')}</p>
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
            <div className="space-y-8">
              {brandGroups.map(([brand, brandProducts]) => (
                <section key={brand} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-100 pb-2">
                    <h2 className="text-sm font-black uppercase tracking-wider text-surface-900">{brand}</h2>
                    <span className="text-xs font-semibold text-surface-400">{brandProducts.length} {t('catalog.productsFound')}</span>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                    {brandProducts.map(product => {
                const promotion = promotionByProductId.get(product.id);
                const discountPercentage = promotion && product.price > 0
                  ? Math.max(0, Math.round((1 - promotion.promoPrice / product.price) * 100))
                  : 0;
                return (
                  <div key={product.id} className="card overflow-hidden group hover:shadow-card-hover hover:border-surface-300 transition-all duration-150 flex flex-col">

                    {/* Image Area */}
                    <div
                      className="h-32 sm:h-48 bg-gradient-to-br from-surface-50 to-white flex items-center justify-center relative overflow-hidden border-b border-surface-100 cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className={`w-full h-full object-contain p-3 sm:p-4 transition-transform duration-300 ease-out ${
                            shouldEnlargeProductImage(product)
                              ? 'scale-[1.12] group-hover:scale-[1.17]'
                              : 'group-hover:scale-105'
                          }`}
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
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-sm">
                          <span className="text-xl sm:text-2xl font-black text-primary-600">{(product.brand || product.name || 'P')[0]}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider max-w-[80%] text-center line-clamp-1">{product.brand}</span>
                      </div>
                      
                      {/* Units - Top Right */}
                      {product.unitMeasure && (
                          <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-white/90 backdrop-blur-sm text-primary-700 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-primary-100 shadow-sm">
                          {product.unitMeasure}
                        </span>
                      )}
                      {promotion && (
                        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#0C1E35] shadow-md sm:left-2.5 sm:top-2.5 sm:text-[10px]">
                          <Tag className="h-3 w-3" />
                          {t('cart.promotionProduct')}
                        </span>
                      )}
                    </div>

                    {/* Info Section */}
                    <div className="p-3 sm:p-4 flex-1 flex flex-col">
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
                        <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center sm:mr-2">
                            {getQty(product.id) === 0 ? (
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); setQty(product, 1); }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-md transition-all hover:bg-primary-700 active:scale-95"
                                aria-label={`Añadir una caja de ${product.name}`}
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            ) : (
                              <div className="flex items-center overflow-hidden rounded-lg border border-primary-200 bg-white shadow-sm">
                                <button
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); setQty(product, getQty(product.id) - 1); }}
                                  className="px-2 py-2 text-surface-600 transition-colors hover:bg-surface-100"
                                  aria-label={`Restar una caja de ${product.name}`}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="min-w-9 border-x border-primary-100 px-1 py-2 text-center text-xs font-black text-primary-700" aria-label={`${getQty(product.id)} cajas en el carrito`}>
                                  {getQty(product.id)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); setQty(product, getQty(product.id) + 1); }}
                                  className="px-2 py-2 text-primary-700 transition-colors hover:bg-primary-50"
                                  aria-label={`Añadir otra caja de ${product.name}`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-left sm:text-right flex flex-col items-stretch sm:items-end">
                            <div className="flex items-center justify-between sm:justify-end gap-2">
                              {promotion ? (
                                <div className="flex flex-col items-start sm:items-end">
                                  <span className="text-[11px] font-semibold text-surface-400 line-through">EUR {product.price.toFixed(2)}</span>
                                  <span className="text-base sm:text-2xl font-black text-amber-600 leading-none">EUR {promotion.promoPrice.toFixed(2)}</span>
                                  {discountPercentage > 0 && <span className="mt-1 text-[10px] font-black text-emerald-600">-{discountPercentage}%</span>}
                                </div>
                              ) : (
                                <span className="text-base sm:text-2xl font-black text-surface-900 leading-none">
                                  EUR {product.price.toFixed(2)}
                                </span>
                              )}
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
                </section>
              ))}
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
              {promotionByProductId.has(selectedProduct.id) && (
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#0C1E35] shadow-sm">
                  <Tag className="h-3 w-3" /> {t('cart.promotionProduct')}
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
                    {promotionByProductId.has(selectedProduct.id) && (
                      <p className="mb-1 text-xs font-semibold text-surface-400 line-through">EUR {selectedProduct.price.toFixed(2)}</p>
                    )}
                    <p className={`text-2xl font-bold leading-none ${promotionByProductId.has(selectedProduct.id) ? 'text-amber-600' : 'text-surface-900'}`}>
                      EUR {(promotionByProductId.get(selectedProduct.id)?.promoPrice ?? selectedProduct.price).toFixed(2)}
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
                  <div className="flex items-center">
                    {getQty(selectedProduct.id) === 0 ? (
                      <button
                        type="button"
                        onClick={() => setQty(selectedProduct, 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-md transition-all hover:bg-primary-700 active:scale-95"
                        aria-label={`Añadir una caja de ${selectedProduct.name}`}
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    ) : (
                      <div className="flex items-center overflow-hidden rounded-xl border border-primary-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => setQty(selectedProduct, getQty(selectedProduct.id) - 1)}
                          className="px-3 py-3 text-surface-600 transition-colors hover:bg-surface-100"
                          aria-label={`Restar una caja de ${selectedProduct.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-11 border-x border-primary-100 py-3 text-center text-sm font-black text-primary-700" aria-label={`${getQty(selectedProduct.id)} cajas en el carrito`}>
                          {getQty(selectedProduct.id)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(selectedProduct, getQty(selectedProduct.id) + 1)}
                          className="px-3 py-3 text-primary-700 transition-colors hover:bg-primary-50"
                          aria-label={`Añadir otra caja de ${selectedProduct.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
