import { useMemo, useState } from 'react';
import { CheckCircle2, Minus, Plus, Search, Send, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { useOrders } from '../../store/ordersStore';
import { useProducts } from '../../store/productsStore';
import { notifyAdminNewOrder } from '../../lib/orderEmails';
import { Product } from '../../types';
import { usePromotions } from '../../store/promotionsStore';

type PreorderLine = { product: Product; quantity: number; unitPrice: number; isPromotion: boolean };

export default function Preorders() {
  const { companies } = useAuth();
  const { products, categories } = useProducts();
  const { promotions } = usePromotions();
  const { addAdminPreorder } = useOrders();
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lines, setLines] = useState<PreorderLine[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedCompany = companies.find(company => company.id === companyId);
  const promotionByProductId = useMemo(
    () => new Map(promotions.filter(promotion => promotion.active).map(promotion => [promotion.productId, promotion])),
    [promotions],
  );
  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter(product => product.active && (!categoryId || product.categoryId === categoryId) && (!query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.brand ?? '').toLowerCase().includes(query)
    )).slice(0, 60);
  }, [categoryId, products, search]);

  const totals = useMemo(() => lines.reduce((acc, line) => {
    const units = line.product.unitsPerBox || 1;
    const subtotal = line.unitPrice * units * line.quantity;
    const tax = subtotal * ((line.product.iva ?? 0) / 100);
    return { subtotal: acc.subtotal + subtotal, tax: acc.tax + tax, total: acc.total + subtotal + tax };
  }, { subtotal: 0, tax: 0, total: 0 }), [lines]);

  const addProduct = (product: Product) => {
    const promotion = promotionByProductId.get(product.id);
    setLines(current => current.some(line => line.product.id === product.id)
      ? current.map(line => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { product, quantity: 1, unitPrice: promotion?.promoPrice ?? product.price, isPromotion: Boolean(promotion) }]);
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setLines(current => current.filter(line => line.product.id !== productId));
      return;
    }
    setLines(current => current.map(line => line.product.id === productId ? { ...line, quantity } : line));
  };

  const sendPreorder = async () => {
    if (!selectedCompany || lines.length === 0) return;
    setSending(true);
    setError('');
    setMessage('');
    const now = new Date();
    const delivery = new Date(now);
    delivery.setDate(delivery.getDate() + 3);
    const order = {
      id: `preorder-${Date.now()}`,
      orderId: `PRE-${now.getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      companyCif: selectedCompany.cif,
      companyEmail: selectedCompany.email,
      companyPhone: selectedCompany.phone,
      contactPerson: selectedCompany.contactPerson,
      deliveryAddress: selectedCompany.deliveryAddress,
      items: lines.map(({ product, quantity, unitPrice }) => {
        const units = product.unitsPerBox || 1;
        const boxPrice = unitPrice * units;
        return {
          productId: product.id,
          sku: product.sku,
          brand: product.brand || '',
          name: product.name,
          categoryName: product.categoryName || '',
          quantity,
          unitPrice: boxPrice,
          subtotal: boxPrice * quantity * (1 + ((product.iva ?? 0) / 100)),
          iva: product.iva ?? 0,
          unitsPerBox: units,
        };
      }),
      totalItems: lines.length,
      totalAmount: totals.total,
      notes: notes ? `[PREVENTA CREADA POR SUPER ADMIN] ${notes}` : '[PREVENTA CREADA POR SUPER ADMIN]',
      status: 'pending' as const,
      createdAt: now.toISOString(),
      estimatedDelivery: delivery.toISOString().split('T')[0],
    };

    const saved = await addAdminPreorder(order);
    if (!saved) {
      setError('No se pudo guardar la preventa. Comprueba que la migración de base de datos esté aplicada.');
      setSending(false);
      return;
    }
    const emailSent = await notifyAdminNewOrder({ ...order, id: saved.id, orderId: saved.orderId });
    setLines([]);
    setNotes('');
    if (emailSent) {
      setMessage(`Preventa ${saved.orderId} creada y enviada al correo de Precious Spain.`);
    } else {
      setError(`La preventa ${saved.orderId} se guardó, pero el correo no pudo enviarse. Revisa la configuración de correo.`);
    }
    setSending(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Super Admin</p>
        <h1 className="text-2xl font-bold text-surface-900">Crear preventa</h1>
        <p className="text-sm text-surface-500 mt-1">Elige un cliente, prepara su pedido y envíalo al correo de la empresa.</p>
      </div>

      {(message || error) && (
        <div className={`rounded-xl px-4 py-3 border text-sm font-medium flex items-center gap-2 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {!error && <CheckCircle2 className="w-4 h-4" />}{error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 items-start">
        <section className="card p-5 space-y-4">
          <label className="block">
            <span className="input-label">Cliente</span>
            <select value={companyId} onChange={event => setCompanyId(event.target.value)} className="input-field" required>
              <option value="">Selecciona un cliente</option>
              {companies.filter(company => company.active).map(company => (
                <option key={company.id} value={company.id}>{company.name} · {company.cif || 'Sin CIF'}</option>
              ))}
            </select>
          </label>
          {selectedCompany && (
            <div className="grid sm:grid-cols-2 gap-3 rounded-xl bg-primary-50 border border-primary-100 p-4 text-sm">
              <p><strong>{selectedCompany.name}</strong><br /><span className="text-surface-500">{selectedCompany.cif}</span></p>
              <p className="text-surface-600">{selectedCompany.email}<br />{selectedCompany.phone}</p>
              <p className="sm:col-span-2 text-surface-600">Entrega: {selectedCompany.deliveryAddress || 'Sin dirección'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-3">
            <select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="input-field" aria-label="Filtrar por categoría">
              <option value="">Todas las categorías</option>
              {categories.filter(category => category.active).map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} className="input-field pl-10" placeholder="Buscar por nombre, SKU o marca" />
            </div>
          </div>
          <div className="max-h-[560px] overflow-auto border border-surface-100 rounded-xl divide-y divide-surface-100">
            {filteredProducts.map(product => {
              const promotion = promotionByProductId.get(product.id);
              const unitPrice = promotion?.promoPrice ?? product.price;
              return (
              <button key={product.id} type="button" onClick={() => addProduct(product)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-primary-50 transition-colors">
                <div className="w-12 h-12 rounded-lg bg-surface-50 border border-surface-100 overflow-hidden shrink-0">
                  {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain p-1" />}
                </div>
                <div className="min-w-0 flex-1">
                  {promotion && <span className="inline-flex mb-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">Promoción</span>}
                  <p className="font-semibold text-sm text-surface-900 truncate">{product.name}</p>
                  <p className="text-xs text-surface-400">{product.sku} · {product.brand || '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-surface-900">{(unitPrice * (product.unitsPerBox || 1)).toFixed(2)} € / caja</p>
                  <p className="text-[11px] text-surface-400">{unitPrice.toFixed(2)} € / unidad · {product.unitsPerBox || 1} uds.</p>
                  {promotion && <p className="text-[10px] text-surface-400 line-through">Antes: {(product.price * (product.unitsPerBox || 1)).toFixed(2)} € / caja</p>}
                </div>
                <Plus className="w-4 h-4 text-primary-600" />
              </button>
            );})}
          </div>
        </section>

        <aside className="card p-5 space-y-4 xl:sticky xl:top-20">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-bold text-surface-900">Pedido de preventa</h2>
          </div>
          {lines.length === 0 ? <p className="py-8 text-center text-sm text-surface-400">Añade productos para empezar.</p> : (
            <div className="space-y-3 max-h-80 overflow-auto pr-1">
              {lines.map(line => (
                <div key={line.product.id} className="border border-surface-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-primary-600 break-words">
                        {line.product.brand || 'Sin marca'}
                      </p>
                      <p className="text-sm font-semibold text-surface-800 break-words mt-0.5">{line.product.name}</p>
                      <p className="text-[11px] text-surface-500 mt-1">{line.product.unitsPerBox || 1} unidades por caja</p>
                      {line.isPromotion && <span className="inline-flex mt-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">Promoción</span>}
                    </div>
                    <button onClick={() => setQuantity(line.product.id, 0)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-surface-200 rounded-lg overflow-hidden">
                      <button onClick={() => setQuantity(line.product.id, line.quantity - 1)} className="p-1.5"><Minus className="w-3.5 h-3.5" /></button>
                      <input type="number" min="1" value={line.quantity} onChange={event => setQuantity(line.product.id, Number(event.target.value) || 1)} className="w-12 text-center text-sm border-x border-surface-200 py-1 focus:outline-none" />
                      <button onClick={() => setQuantity(line.product.id, line.quantity + 1)} className="p-1.5"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="font-bold text-sm">{(line.unitPrice * (line.product.unitsPerBox || 1) * line.quantity * (1 + ((line.product.iva ?? 0) / 100))).toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-surface-200 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-surface-500">Subtotal</span><span>{totals.subtotal.toFixed(2)} €</span></div>
            <div className="flex justify-between"><span className="text-surface-500">IVA</span><span>{totals.tax.toFixed(2)} €</span></div>
            <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-primary-600">{totals.total.toFixed(2)} €</span></div>
          </div>
          <div>
            <textarea value={notes} onChange={event => setNotes(event.target.value)} className="input-field min-h-24 resize-none" placeholder="Notas para esta preventa" />
            <p className="text-[11px] text-surface-400 mt-1">Sin límite de palabras.</p>
          </div>
          <button onClick={sendPreorder} disabled={!selectedCompany || lines.length === 0 || sending} className="btn-primary w-full justify-center disabled:bg-surface-300 disabled:cursor-not-allowed">
            <Send className="w-4 h-4" />{sending ? 'Enviando…' : 'Crear y enviar preventa'}
          </button>
          <p className="text-[11px] text-center text-surface-400">Se enviará a giorgiohall27@gmail.com</p>
        </aside>
      </div>
    </div>
  );
}
