import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, Send, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useCart } from '../../store/cartStore';
import { useProducts } from '../../store/productsStore';
import { useOrders } from '../../store/ordersStore';
import { useAuth } from '../../store/authStore';
import { useState } from 'react';

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getGroupedByCategory, getCategoryTotal, getTotal, clearCart } = useCart();
  const { adjustStock } = useProducts();
  const { addOrder } = useOrders();
  const { userProfile } = useAuth();
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const companyName   = userProfile?.companyName   ?? '';
  const companyCif    = userProfile?.cif            ?? '';
  const companyEmail  = userProfile?.email          ?? '';
  const companyPhone  = userProfile?.phone          ?? '';
  const contactPerson = userProfile?.contactPerson  ?? '';
  const deliveryAddr  = userProfile?.deliveryAddress ?? '';

  const grouped = getGroupedByCategory();
  const total = getTotal();
  const totalLines = items.length;

  const handleRemove = (productId: string, qty: number) => {
    adjustStock(productId, qty);
    removeItem(productId);
  };

  const handleUpdateQty = (productId: string, oldQty: number, newQty: number) => {
    const delta = oldQty - newQty; // positive = restoring stock, negative = consuming more
    adjustStock(productId, delta);
    updateQuantity(productId, newQty);
  };

  const handleSendOrder = () => {
    setSending(true);
    const itemsSnapshot = [...items];
    const totalSnapshot = getTotal();
    setTimeout(() => {
      const orderId = `PED-2026-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
      const now = new Date();
      const delivery = new Date(now);
      delivery.setDate(delivery.getDate() + 3);
      addOrder({
        id: `ord-${Date.now()}`,
        orderId,
        companyId: 'comp-demo',
        companyName,
        companyCif,
        companyEmail,
        companyPhone,
        contactPerson,
        deliveryAddress: deliveryAddr,
        items: itemsSnapshot.map(i => ({
          productId: i.product.id,
          sku: i.product.sku,
          name: i.product.name,
          categoryName: i.product.categoryName || '',
          quantity: i.quantity,
          unitPrice: i.product.price,
          subtotal: i.product.price * i.quantity,
        })),
        totalItems: itemsSnapshot.length,
        totalAmount: totalSnapshot,
        notes: notes || undefined,
        status: 'authorization_pending',
        createdAt: now.toISOString(),
        estimatedDelivery: delivery.toISOString().split('T')[0],
      });
      clearCart();
      navigate('/order-confirmation', { state: { orderId, total: totalSnapshot, totalLines, notes } });
    }, 1500);
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10 text-surface-300" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 mb-2">{t('cart.empty')}</h2>
        <p className="text-surface-500 mb-8">{t('cart.emptySubtitle')}</p>
        <Link to="/catalog" className="btn-primary">
          {t('cart.browseCatalog')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-6 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/catalog')} className="btn-icon">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-surface-900">{t('cart.title')}</h1>
        <span className="badge-info">{totalLines} {t('cart.products')}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Items */}
        <div className="flex-1 space-y-4">
          {Object.entries(grouped).map(([catName, catItems]) => (
            <div key={catName} className="card overflow-hidden">
              {/* Category Header */}
              <div className="px-6 py-3 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
                <h3 className="font-semibold text-primary-700">{catName} <span className="text-primary-400 font-normal">({catItems.length} {t('cart.products')})</span></h3>
                <span className="font-bold text-primary-700">{getCategoryTotal(catName).toFixed(2)} €</span>
              </div>

              {/* Items */}
              {catItems.map(item => {
                const overStock = item.quantity > item.product.stock;
                const unitsPerBox = item.product.unitsPerBox || 1;
                const boxCount = Math.round(item.quantity / unitsPerBox);
                const boxPrice = item.product.price * unitsPerBox;
                return (
                  <div key={item.product.id} className="px-6 py-4 flex items-center gap-4 border-t border-surface-100 first:border-t-0">
                    {/* Product Image */}
                    <div className="w-14 h-14 rounded-lg bg-surface-50 flex items-center justify-center shrink-0 overflow-hidden border border-surface-100">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                          <span className="text-lg font-black text-primary-400">{(item.product.brand || item.product.name || 'P')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-surface-400">{item.product.sku} · {boxPrice.toFixed(2)} €/caja{unitsPerBox > 1 ? ` (${unitsPerBox} uds × €${item.product.price.toFixed(2)})` : ''}</p>
                      {overStock && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3" /> {t('cart.maxStock')}: {item.product.stock}
                        </p>
                      )}
                    </div>

                    {/* Quantity (in boxes) */}
                    <div className="flex flex-col items-center">
                      {unitsPerBox > 1 && (
                        <span className="text-[9px] text-surface-400 font-bold uppercase mb-0.5">Cajas</span>
                      )}
                      <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden">
                        <button onClick={() => handleUpdateQty(item.product.id, item.quantity, item.quantity - unitsPerBox)} className="px-2 py-1.5 hover:bg-surface-50"><Minus className="w-3.5 h-3.5" /></button>
                        <input
                          type="number"
                          value={boxCount}
                          onChange={e => {
                            const newBoxes = parseInt(e.target.value) || 1;
                            handleUpdateQty(item.product.id, item.quantity, newBoxes * unitsPerBox);
                          }}
                          className="w-14 text-center text-sm border-x border-surface-200 py-1.5 focus:outline-none"
                          min="1"
                        />
                        <button onClick={() => handleUpdateQty(item.product.id, item.quantity, item.quantity + unitsPerBox)} className="px-2 py-1.5 hover:bg-surface-50"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right w-24 shrink-0">
                      <p className="font-bold text-surface-900">{(item.product.price * item.quantity).toFixed(2)} €</p>
                    </div>

                    {/* Remove */}
                    <button onClick={() => handleRemove(item.product.id, item.quantity)} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-96 shrink-0">
          <div className="card p-6 sticky top-20 space-y-5">
            <h3 className="text-lg font-bold text-surface-900">{t('cart.orderSummary')}</h3>

            {/* Category breakdown */}
            <div className="space-y-2">
              {Object.entries(grouped).map(([catName, catItems]) => (
                <div key={catName} className="flex items-center justify-between text-sm">
                  <span className="text-surface-600">{catName} ({catItems.length})</span>
                  <span className="font-medium">{getCategoryTotal(catName).toFixed(2)} €</span>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-200 pt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-surface-500">{t('cart.totalLines')}</span>
                <span className="font-medium">{totalLines}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-surface-900">{t('cart.grandTotal')}</span>
                <span className="text-2xl font-bold text-primary-600">{total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Company Data */}
            <div className="border-t border-surface-200 pt-4">
              <h4 className="font-medium text-surface-700 mb-3">{t('cart.companyData')}</h4>
              <div className="space-y-2 text-sm">
                <input className="input-field text-sm" placeholder={t('auth.companyName')} value={companyName} onChange={() => {}} readOnly={!!userProfile} />
                <input className="input-field text-sm" placeholder={t('auth.cif')} value={companyCif} onChange={() => {}} readOnly={!!userProfile} />
                <input className="input-field text-sm" placeholder={t('auth.email')} value={companyEmail} onChange={() => {}} readOnly={!!userProfile} />
                <input className="input-field text-sm" placeholder={t('auth.phone')} value={companyPhone} onChange={() => {}} readOnly={!!userProfile} />
                <input className="input-field text-sm" placeholder={t('auth.deliveryAddress')} value={deliveryAddr} onChange={() => {}} readOnly={!!userProfile} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="input-label">{t('cart.notes')}</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="input-field min-h-[80px] resize-none text-sm"
                placeholder={t('cart.notesPlaceholder')}
              />
            </div>

            {/* Send Order */}
            <button
              onClick={handleSendOrder}
              disabled={sending}
              className="btn-primary w-full py-3 text-base"
              id="send-order-btn"
            >
              {sending ? (
                <>{t('cart.sending')}</>
              ) : (
                <><Send className="w-5 h-5" /> {t('cart.sendOrder')}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 px-4 py-3 flex items-center justify-between gap-3 z-40 shadow-lg">
        <div>
          <p className="text-xs text-surface-500">{t('cart.grandTotal')}</p>
          <p className="text-lg font-bold text-primary-600">{total.toFixed(2)} €</p>
        </div>
        <button
          onClick={handleSendOrder}
          disabled={sending}
          className="btn-primary py-3 px-6 text-sm"
        >
          {sending ? t('cart.sending') : <><Send className="w-4 h-4" /> {t('cart.sendOrder')}</>}
        </button>
      </div>
    </div>
  );
}
