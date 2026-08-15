import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Tag, Trash2 } from 'lucide-react';
import { useProducts } from '../../store/productsStore';
import { usePromotions } from '../../store/promotionsStore';

export default function Promotions() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const { promotions, upsertPromotion, removePromotion, clearPromotions } = usePromotions();
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [promoPrice, setPromoPrice] = useState('');

  const activeProducts = useMemo(() => products.filter(product => product.active), [products]);
  const promotionRows = useMemo(
    () =>
      promotions
        .map(promotion => ({
          promotion,
          product: products.find(product => product.id === promotion.productId),
        }))
        .filter(row => row.product),
    [products, promotions],
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeProducts.filter(product =>
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.brand ?? '').toLowerCase().includes(query)
    );
  }, [activeProducts, search]);

  const selectedProduct = activeProducts.find(product => product.id === selectedProductId);

  const handleAddPromotion = () => {
    if (!selectedProduct) return;
    const price = Number.parseFloat(promoPrice);
    if (!Number.isFinite(price) || price < 0) return;
    upsertPromotion({ productId: selectedProduct.id, promoPrice: price, active: true });
    setSelectedProductId('');
    setPromoPrice('');
    setSearch('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{t('promotions.title')}</h1>
          <p className="text-sm text-surface-500 mt-1">{t('promotions.subtitle')}</p>
        </div>
        {promotions.length > 0 && (
          <button onClick={clearPromotions} className="btn-secondary text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> {t('promotions.clearAll')}
          </button>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              className="input-field pl-10"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t('promotions.searchProduct')}
            />
          </div>
          <input
            className="input-field"
            type="number"
            min="0"
            step="0.01"
            value={promoPrice}
            onChange={event => setPromoPrice(event.target.value)}
            placeholder={t('promotions.promoPrice')}
          />
          <button
            onClick={handleAddPromotion}
            disabled={!selectedProduct || !promoPrice}
            className="btn-primary disabled:bg-surface-300 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> {t('promotions.add')}
          </button>
        </div>

        <div className="max-h-72 overflow-auto border border-surface-100 rounded-xl divide-y divide-surface-100">
          {filteredProducts.map(product => {
            const selected = selectedProductId === product.id;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  setSelectedProductId(product.id);
                  setPromoPrice(String(product.price));
                }}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-primary-50 transition-colors ${selected ? 'bg-primary-50' : 'bg-white'}`}
              >
                <div className="w-12 h-12 rounded-lg bg-surface-50 border border-surface-100 overflow-hidden shrink-0">
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-surface-900 truncate">{product.name}</p>
                  <p className="text-xs text-surface-400">{product.sku} · {product.brand || '-'}</p>
                </div>
                <span className="text-sm font-bold text-surface-900">EUR {product.price.toFixed(2)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600" />
          <h2 className="font-bold text-surface-900">{t('promotions.activePromotions')}</h2>
        </div>
        {promotionRows.length === 0 ? (
          <div className="p-10 text-center text-surface-400">{t('promotions.empty')}</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {promotionRows.map(({ promotion, product }) => product && (
              <div key={promotion.productId} className="p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-surface-50 border border-surface-100 overflow-hidden shrink-0">
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-900 truncate">{product.name}</p>
                  <p className="text-xs text-surface-400">{product.brand || '-'} · {product.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-surface-400 line-through">EUR {product.price.toFixed(2)}</p>
                  <p className="text-lg font-black text-amber-600">EUR {promotion.promoPrice.toFixed(2)}</p>
                </div>
                <button onClick={() => removePromotion(product.id)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
