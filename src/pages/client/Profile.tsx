import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  User, Building2, Mail, Phone, MapPin, LogIn, UserPlus,
  ChevronDown, ChevronUp, Truck, Clock, Package,
} from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { useOrders } from '../../store/ordersStore';
import { useProducts } from '../../store/productsStore';

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userEmail, isGuest, userProfile } = useAuth();
  const { orders } = useOrders();
  const { products } = useProducts();
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const productsById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);

  const toggleOrder = (id: string) =>
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  /* ── Guest view ─────────────────────────────────── */
  if (isGuest) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mx-auto mb-5">
          <User className="w-8 h-8 text-surface-400" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">{t('auth.noAccount')}</h1>
        <p className="text-surface-500 text-sm mb-8 leading-relaxed">
          Crea una cuenta para acceder a tu perfil, ver tus pedidos y gestionar los datos de tu empresa.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/register')}
            className="btn-primary"
          >
            <UserPlus className="w-4 h-4" />
            {t('auth.register')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            <LogIn className="w-4 h-4" />
            {t('auth.login')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Logged-in view ─────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8 animate-fade-in space-y-8">

      {/* Account card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary-100 border-2 border-primary-200 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900">
              {userProfile?.name ?? userEmail?.split('@')[0]}
            </h1>
            <p className="text-sm text-surface-400">{userEmail}</p>
          </div>
        </div>

        {userProfile && (
          <>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Datos de la empresa</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { Icon: Building2, label: 'Empresa',    value: userProfile.name },
                { Icon: Building2, label: 'CIF',        value: userProfile.cif },
                { Icon: Mail,      label: 'Email',       value: userProfile.email },
                { Icon: Phone,     label: 'Teléfono',    value: userProfile.phone },
                { Icon: User,      label: 'Contacto',    value: userProfile.contactPerson },
                { Icon: MapPin,    label: 'Dirección',   value: userProfile.deliveryAddress },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <Icon className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-surface-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-surface-800 break-words">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Orders */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-surface-900">{t('orders.title')}</h2>
            <p className="text-xs text-surface-400 mt-0.5">{orders.length} pedidos</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="card p-10 text-center">
            <Package className="w-10 h-10 text-surface-200 mx-auto mb-3" />
            <p className="text-surface-400 text-sm">{t('clientDashboard.noRecentOrders')}</p>
          </div>
        ) : (
          <div className="card overflow-hidden divide-y divide-surface-100">
            {orders.map(order => {
              const isExpanded = expandedOrders[order.id];
              return (
                <div key={order.id}>
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-surface-50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-surface-900 truncate">{order.orderId}</p>
                      <p className="text-xs text-surface-400 mt-0.5 truncate">{order.companyName}</p>
                    </div>
                    <div className="hidden lg:flex items-center gap-1.5 text-xs text-surface-400 shrink-0">
                      <Truck className="w-3.5 h-3.5" />
                      {formatDate(order.estimatedDelivery)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-surface-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)}
                    </div>
                    <p className="text-sm font-bold text-surface-900 shrink-0">€{order.totalAmount.toFixed(2)}</p>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-surface-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-surface-400 shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="bg-surface-50 border-t border-surface-100">
                      <div className="sm:hidden flex gap-3 px-5 pt-3 pb-1">
                        <span className="flex items-center gap-1 text-xs text-surface-400">
                          <Truck className="w-3.5 h-3.5" /> {formatDate(order.estimatedDelivery)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <div className="hidden md:grid md:grid-cols-[minmax(180px,2fr)_repeat(4,minmax(100px,1fr))] gap-4 px-5 py-2 text-xs font-semibold text-surface-400 uppercase border-b border-surface-200">
                          <span>{t('products.name')}</span>
                          <span className="text-right">Unidades por caja</span>
                          <span className="text-right">Cajas pedidas</span>
                          <span className="text-right">Precio por unidad</span>
                          <span className="text-right">Subtotal</span>
                        </div>
                        <div className="divide-y divide-surface-100">
                          {order.items.map((item, i) => {
                            const catalogProduct = productsById.get(item.productId);
                            const unitsPerBox = Math.max(catalogProduct?.unitsPerBox ?? item.unitsPerBox ?? 1, 1);
                            const pricePerUnit = item.unitPrice / unitsPerBox;
                            return (
                              <div key={`${item.productId}-${i}`} className="grid grid-cols-2 md:grid-cols-[minmax(180px,2fr)_repeat(4,minmax(100px,1fr))] gap-x-4 gap-y-3 px-5 py-4 hover:bg-white transition-colors">
                                <div className="col-span-2 md:col-span-1">
                                  <p className="font-medium text-surface-800">{item.name}</p>
                                  <p className="text-xs text-surface-400">{item.categoryName}</p>
                                </div>
                                <div className="md:text-right">
                                  <p className="md:hidden text-[10px] font-semibold uppercase text-surface-400">Unidades por caja</p>
                                  <p className="text-surface-700">{unitsPerBox}</p>
                                </div>
                                <div className="text-right">
                                  <p className="md:hidden text-[10px] font-semibold uppercase text-surface-400">Cajas pedidas</p>
                                  <p className="text-surface-700">{item.quantity}</p>
                                </div>
                                <div className="md:text-right">
                                  <p className="md:hidden text-[10px] font-semibold uppercase text-surface-400">Precio por unidad</p>
                                  <p className="text-surface-700">€{pricePerUnit.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="md:hidden text-[10px] font-semibold uppercase text-surface-400">Subtotal</p>
                                  <p className="font-bold text-surface-900">€{item.subtotal.toFixed(2)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t-2 border-surface-200 bg-white px-5 py-4">
                          <span className="font-semibold text-surface-600">Total del pedido</span>
                          <span className="text-lg font-bold text-primary-700">€{order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
