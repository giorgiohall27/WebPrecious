import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, Send, ArrowLeft } from 'lucide-react';
import { useCart } from '../../store/cartStore';
import { useProducts } from '../../store/productsStore';
import { useOrders } from '../../store/ordersStore';
import { useAuth } from '../../store/authStore';
import { useState } from 'react';
import { notifyAdminNewOrder } from '../../lib/orderEmails';
import { Order } from '../../types';
import { formatProductPackaging } from '../../utils/productPackaging';

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, getGroupedByCategory, getCategoryTotal, getSubtotal, getTaxTotal, getTotal, clearCart } = useCart();
  const { adjustStock } = useProducts();
  const { addOrder, addAdminPreorder } = useOrders();
  const { userProfile, isSupplier, supplierProfile, companies } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [pendingSavedOrder, setPendingSavedOrder] = useState<Order | null>(null);

  const selectedCompany = isSupplier ? companies.find(company => company.id === selectedCompanyId) : userProfile;
  const companyName   = selectedCompany?.name          ?? '';
  const companyCif    = selectedCompany?.cif            ?? '';
  const companyEmail  = selectedCompany?.email          ?? '';
  const companyPhone  = selectedCompany?.phone          ?? '';
  const contactPerson = selectedCompany?.contactPerson  ?? '';
  const deliveryAddr  = selectedCompany?.deliveryAddress ?? '';
  const supplierName = supplierProfile?.contactPerson || supplierProfile?.name || '';

  const grouped = getGroupedByCategory();
  const subtotal = getSubtotal();
  const taxTotal = getTaxTotal();
  const total = getTotal();
  const totalLines = items.length;

  const handleRemove = (productId: string, boxes: number, unitsPerBox: number) => {
    adjustStock(productId, boxes * unitsPerBox);
    removeItem(productId);
  };

  const handleUpdateQty = (productId: string, oldBoxes: number, newBoxes: number, unitsPerBox: number) => {
    const clampedBoxes = Math.max(1, newBoxes);
    const deltaBoxes = oldBoxes - clampedBoxes; // positive = restoring stock, negative = consuming more
    adjustStock(productId, deltaBoxes * unitsPerBox);
    updateQuantity(productId, clampedBoxes);
  };

  const handleSendOrder = async () => {
    if (isSupplier && !selectedCompany) {
      setEmailError('Selecciona el cliente para el que estás preparando el pedido.');
      return;
    }
    setSending(true);
    setEmailError('');
    const itemsSnapshot = [...items];
    const totalSnapshot = getTotal();

    const orderId = `${isSupplier ? 'PRE' : 'PED'}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
    const now = new Date();
    const delivery = new Date(now);
    delivery.setDate(delivery.getDate() + 3);
    const order = {
      id: `ord-${Date.now()}`,
      orderId,
      companyId: selectedCompany?.id ?? 'comp-pin',
      companyName,
      companyCif,
      companyEmail,
      companyPhone,
      contactPerson,
      deliveryAddress: deliveryAddr,
      items: itemsSnapshot.map(i => ({
        productId: i.product.id,
        sku: i.product.sku,
        brand: i.product.brand || '',
        name: i.product.name,
        categoryName: i.product.categoryName || '',
        quantity: i.quantity,
        unitPrice: (i.unitPriceOverride ?? i.product.price) * (i.product.unitsPerBox || 1),
        subtotal: (i.unitPriceOverride ?? i.product.price) * (i.product.unitsPerBox || 1) * i.quantity * (1 + ((i.product.iva ?? 0) / 100)),
        iva: i.product.iva ?? 0,
        unitsPerBox: i.product.unitsPerBox || 1,
      })),
      totalItems: itemsSnapshot.length,
      totalAmount: totalSnapshot,
      notes: isSupplier
        ? (notes ? `[PREVENTA CREADA POR: ${supplierName}] ${notes}` : `[PREVENTA CREADA POR: ${supplierName}]`)
        : notes || undefined,
      status: isSupplier ? 'pending' as const : 'authorization_pending' as const,
      createdAt: now.toISOString(),
      estimatedDelivery: delivery.toISOString().split('T')[0],
    };
    const savedOrder = pendingSavedOrder ?? await (isSupplier ? addAdminPreorder(order) : addOrder(order));

    if (savedOrder) {
      const orderToEmail: Order = pendingSavedOrder ?? {
        ...order,
        id: savedOrder.id,
        orderId: savedOrder.orderId,
      };
      const emailSent = await notifyAdminNewOrder(orderToEmail);

      if (emailSent) {
        setPendingSavedOrder(null);
        clearCart();
        navigate('/order-confirmation', {
          state: {
            orderId: orderToEmail.orderId,
            total: orderToEmail.totalAmount,
            totalLines: orderToEmail.totalItems,
            notes: orderToEmail.notes,
          },
        });
        return;
      }

      setPendingSavedOrder(orderToEmail);
      setEmailError('El pedido se ha guardado, pero el correo no pudo enviarse. Pulsa de nuevo para reintentar el correo; no se creará otro pedido.');
      setSending(false);
    } else {
      setSending(false);
      setEmailError('No se pudo guardar el pedido. Revisa la sesión e inténtalo de nuevo.');
    }
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
              <div className="px-4 sm:px-6 py-3 bg-primary-50 border-b border-primary-100 flex items-start justify-between gap-3">
                <h3 className="min-w-0 font-semibold text-primary-700 break-words">{catName} <span className="text-primary-400 font-normal">({catItems.length} {t('cart.products')})</span></h3>
                <span className="shrink-0 font-bold text-primary-700">{getCategoryTotal(catName).toFixed(2)} €</span>
              </div>

              {/* Items */}
              {catItems.map(item => {
                const unitsPerBox = item.product.unitsPerBox || 1;
                const packaging = formatProductPackaging(item.product);
                const unitPrice = item.unitPriceOverride ?? item.product.price;
                const boxPrice = unitPrice * unitsPerBox;
                const lineSubtotal = boxPrice * item.quantity;
                const lineTax = lineSubtotal * ((item.product.iva ?? 0) / 100);
                const lineTotal = lineSubtotal + lineTax;
                return (
                  <div
                    key={item.product.id}
                    className="px-4 sm:px-6 py-4 grid grid-cols-[3.5rem_minmax(0,1fr)_auto_2.5rem] sm:grid-cols-[3.5rem_minmax(0,1fr)_auto_6rem_2.5rem] items-center gap-x-3 sm:gap-x-4 gap-y-3 border-t border-surface-100 first:border-t-0"
                  >
                    {/* Product Image */}
                    <div className="w-14 h-14 row-span-2 sm:row-span-1 rounded-lg bg-surface-50 flex items-center justify-center overflow-hidden border border-surface-100">
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
                    <div className="min-w-0 col-span-3 sm:col-span-1">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 break-words [overflow-wrap:anywhere]">
                        {item.product.brand || 'Sin marca'}
                      </p>
                      <p className="font-medium text-surface-900 text-sm break-words [overflow-wrap:anywhere] mt-0.5">{item.product.name}</p>
                      <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-primary-100 bg-primary-50 px-2.5 py-1.5 text-xs text-primary-800">
                        <span className="font-medium text-primary-600">{t('cart.boxContents')}:</span>
                        <span className="font-bold">{packaging}</span>
                      </div>
                      {item.unitPriceOverride !== undefined && (
                        <span className="inline-flex my-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">{t('cart.promotionProduct')}</span>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-surface-500">
                          {t('cart.unitPrice')}: <strong className="text-surface-800">{unitPrice.toFixed(2)} €</strong>
                        </span>
                        <span className="text-surface-500">
                          {t('cart.boxPrice')}: <strong className="text-surface-800">{boxPrice.toFixed(2)} €</strong>
                        </span>
                        {item.product.iva === 21 && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-bold text-sky-700">IVA 21%</span>
                        )}
                      </div>
                    </div>

                    {/* Quantity (in boxes) */}
                    <div className="col-start-2 sm:col-start-auto flex flex-col items-start sm:items-center">
                      {unitsPerBox > 1 && (
                        <span className="text-[9px] text-surface-400 font-bold uppercase mb-0.5">{t('cart.boxes')}</span>
                      )}
                      <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden">
                        <button onClick={() => handleUpdateQty(item.product.id, item.quantity, item.quantity - 1, unitsPerBox)} className="px-2 py-1.5 hover:bg-surface-50"><Minus className="w-3.5 h-3.5" /></button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => {
                            const newBoxes = parseInt(e.target.value) || 1;
                            handleUpdateQty(item.product.id, item.quantity, newBoxes, unitsPerBox);
                          }}
                          className="w-14 text-center text-sm border-x border-surface-200 py-1.5 focus:outline-none"
                          min="1"
                        />
                        <button onClick={() => handleUpdateQty(item.product.id, item.quantity, item.quantity + 1, unitsPerBox)} className="px-2 py-1.5 hover:bg-surface-50"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="col-start-3 sm:col-start-auto text-right min-w-[5.5rem]">
                      <p className="font-bold text-surface-900">{lineTotal.toFixed(2)} €</p>
                      <p className="text-[10px] text-surface-400">IVA {lineTax.toFixed(2)} €</p>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(item.product.id, item.quantity, unitsPerBox)}
                      className="col-start-4 sm:col-start-auto btn-icon text-red-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`${t('common.delete', 'Eliminar')} ${item.product.name}`}
                    >
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
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-surface-500">{t('cart.subtotal')}</span>
                <span className="font-medium">{subtotal.toFixed(2)} €</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-surface-500">{t('cart.ivaTotal')}</span>
                <span className="font-medium">{taxTotal.toFixed(2)} €</span>
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
                {isSupplier && (
                  <div>
                    <label className="input-label">Cliente del pedido *</label>
                    <select
                      className="input-field text-sm"
                      value={selectedCompanyId}
                      onChange={event => { setSelectedCompanyId(event.target.value); setEmailError(''); }}
                      required
                    >
                      <option value="">Selecciona un cliente</option>
                      {companies.filter(company => company.active).map(company => (
                        <option key={company.id} value={company.id}>{company.name}{company.cif ? ` · ${company.cif}` : ''}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-surface-400">Pedido preparado por {supplierName || supplierProfile?.name}.</p>
                  </div>
                )}
                <input className="input-field text-sm" placeholder={t('auth.companyName')} value={companyName} readOnly />
                <input className="input-field text-sm" placeholder={t('auth.cif')} value={companyCif} readOnly />
                <input className="input-field text-sm" placeholder={t('auth.email')} value={companyEmail} readOnly />
                <input className="input-field text-sm" placeholder={t('auth.phone')} value={companyPhone} readOnly />
                <input className="input-field text-sm" placeholder={t('auth.deliveryAddress')} value={deliveryAddr} readOnly />
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
              <p className="text-[11px] text-surface-400 mt-1">{t('cart.notesUnlimited')}</p>
            </div>

            {/* Send Order */}
            {emailError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {emailError}
              </div>
            )}
            <button
              onClick={handleSendOrder}
              disabled={sending || (isSupplier && !selectedCompany)}
              className="btn-primary w-full py-3 text-base"
              id="send-order-btn"
            >
              {sending ? (
                <>{t('cart.sending')}</>
              ) : (
                <><Send className="w-5 h-5" /> {pendingSavedOrder ? 'Reintentar correo' : t('cart.sendOrder')}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-between gap-3 z-40 shadow-lg">
        <div>
          <p className="text-xs text-surface-500">{t('cart.grandTotal')}</p>
          <p className="text-lg font-bold text-primary-600">{total.toFixed(2)} €</p>
        </div>
        <button
          onClick={handleSendOrder}
          disabled={sending || (isSupplier && !selectedCompany)}
          className="btn-primary py-3 px-6 text-sm"
        >
          {sending ? t('cart.sending') : <><Send className="w-4 h-4" /> {pendingSavedOrder ? 'Reintentar correo' : t('cart.sendOrder')}</>}
        </button>
      </div>
    </div>
  );
}
