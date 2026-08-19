import { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../store/cartStore';
import { useProducts } from '../../store/productsStore';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { items, removeItem, updateQuantity, getSubtotal, getTaxTotal, getTotal } = useCart();
  const { adjustStock } = useProducts();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open]);

  const changeQuantity = (productId: string, current: number, next: number, unitsPerBox: number) => {
    if (next <= 0) {
      adjustStock(productId, current * unitsPerBox);
      removeItem(productId);
      return;
    }
    adjustStock(productId, (current - next) * unitsPerBox);
    updateQuantity(productId, next);
  };

  return (
    <div className={`fixed inset-0 z-[80] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!open}>
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-[#07111f]/55 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        aria-label="Cerrar carrito"
        tabIndex={open ? 0 : -1}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compra"
        className={`absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200 bg-[#0C1E35] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">{t('cart.drawerTitle')}</h2>
              <p className="text-xs text-white/55">{items.length} {t('cart.products')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" aria-label="Cerrar carrito">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-surface-300" />
            </div>
            <h3 className="font-bold text-surface-900">{t('cart.empty')}</h3>
            <p className="text-sm text-surface-500 mt-1">{t('cart.drawerEmptySubtitle')}</p>
            <button type="button" onClick={onClose} className="btn-primary mt-6">{t('cart.keepShopping')}</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
              {items.map(item => {
                const unitsPerBox = item.product.unitsPerBox || 1;
                const unitPrice = item.unitPriceOverride ?? item.product.price;
                const total = unitPrice * unitsPerBox * item.quantity * (1 + ((item.product.iva ?? 0) / 100));
                return (
                  <div key={`${item.product.id}-${unitPrice}`} className="p-4 flex gap-3">
                    <div className="w-16 h-16 rounded-lg bg-surface-50 border border-surface-100 overflow-hidden shrink-0">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary-400 font-black">{item.product.name[0]}</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 break-words">
                            {item.product.brand || 'Sin marca'}
                          </p>
                          <p className="text-sm font-semibold text-surface-900 break-words mt-0.5">{item.product.name}</p>
                          <p className="text-[11px] text-surface-500 mt-1">{unitsPerBox} {t('cart.unitsPerBoxLabel')}</p>
                          {item.unitPriceOverride !== undefined && (
                            <span className="inline-flex mt-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">{t('cart.promotionProduct')}</span>
                          )}
                          <p className="text-[11px] text-surface-400 mt-1">{item.product.sku}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => changeQuantity(item.product.id, item.quantity, 0, unitsPerBox)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          aria-label={`Eliminar ${item.product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden">
                          <button type="button" onClick={() => changeQuantity(item.product.id, item.quantity, item.quantity - 1, unitsPerBox)} className="p-1.5 hover:bg-surface-50" aria-label="Restar una caja">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center text-sm font-semibold border-x border-surface-200 py-1">{item.quantity}</span>
                          <button type="button" onClick={() => changeQuantity(item.product.id, item.quantity, item.quantity + 1, unitsPerBox)} className="p-1.5 hover:bg-surface-50" aria-label="Añadir una caja">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="font-bold text-surface-900">{total.toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-surface-200 bg-surface-50 p-5 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-surface-500">{t('cart.subtotal')}</span><span>{getSubtotal().toFixed(2)} €</span></div>
              <div className="flex justify-between text-sm"><span className="text-surface-500">{t('cart.ivaTotal')}</span><span>{getTaxTotal().toFixed(2)} €</span></div>
              <div className="flex justify-between items-end border-t border-surface-200 pt-3">
                <span className="font-bold text-surface-900">{t('cart.grandTotal')}</span>
                <span className="text-2xl font-black text-primary-600">{getTotal().toFixed(2)} €</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/cart');
                }}
                className="btn-primary w-full justify-center py-3"
              >
                {t('cart.reviewAndSend')}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary w-full justify-center">{t('cart.keepShopping')}</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
