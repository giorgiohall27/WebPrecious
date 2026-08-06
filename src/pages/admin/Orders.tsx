import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Search, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { Order } from '../../types';
import { useOrders } from '../../store/ordersStore';

export default function Orders() {
  const { t } = useTranslation();
  const { orders } = useOrders();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const statusColors: Record<string, string> = {
    pending:               'bg-amber-50 text-amber-700 border-amber-200',
    authorization_pending: 'bg-orange-50 text-orange-700 border-orange-200',
    processing:            'bg-blue-50 text-blue-700 border-blue-200',
    completed:             'bg-green-50 text-green-700 border-green-200',
    cancelled:             'bg-red-50 text-red-700 border-red-200',
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.companyName.toLowerCase().includes(search.toLowerCase()) || o.orderId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const groupItemsByCategory = (order: Order) => {
    const groups: Record<string, typeof order.items> = {};
    order.items.forEach(item => {
      if (!groups[item.categoryName]) groups[item.categoryName] = [];
      groups[item.categoryName].push(item);
    });
    return groups;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-900">{t('orders.title')}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('orders.company')}...`} className="input-field pl-10" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field pr-8 appearance-none min-w-[160px]">
            <option value="">{t('common.all')} {t('orders.status')}</option>
            <option value="pending">{t('orders.pending')}</option>
            <option value="processing">{t('orders.processing')}</option>
            <option value="completed">{t('orders.completed')}</option>
            <option value="cancelled">{t('orders.cancelled')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-surface-400">{t('orders.noOrders')}</div>
        ) : (
          filtered.map(order => {
            const isExpanded = expandedOrder === order.id;
            const groups = groupItemsByCategory(order);

            return (
              <div key={order.id} className="card overflow-hidden">
                <div
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-surface-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-mono font-bold text-primary-600">{order.orderId}</span>
                      <span className={`badge border ${statusColors[order.status]}`}>{t(`orders.${order.status}`)}</span>
                    </div>
                    <p className="font-semibold text-surface-900">{order.companyName}</p>
                    <p className="text-xs text-surface-400">{new Date(order.createdAt).toLocaleString()} · {order.totalItems} {t('orders.items').toLowerCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-surface-900">{order.totalAmount.toFixed(2)} €</p>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-surface-400" /> : <ChevronRight className="w-5 h-5 text-surface-400" />}
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-surface-100 animate-slide-up">
                    {/* Company Info */}
                    <div className="px-6 py-4 bg-surface-50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div><span className="text-surface-400">CIF:</span> <span className="font-medium">{order.companyCif}</span></div>
                      <div><span className="text-surface-400">Email:</span> <span className="font-medium">{order.companyEmail}</span></div>
                      <div><span className="text-surface-400">{t('auth.phone')}:</span> <span className="font-medium">{order.companyPhone}</span></div>
                      <div><span className="text-surface-400">{t('auth.contactPerson')}:</span> <span className="font-medium">{order.contactPerson}</span></div>
                      <div className="sm:col-span-2"><span className="text-surface-400">{t('auth.deliveryAddress')}:</span> <span className="font-medium">{order.deliveryAddress}</span></div>
                    </div>

                    {/* Items by Category */}
                    {Object.entries(groups).map(([catName, items]) => (
                      <div key={catName}>
                        <div className="px-6 py-2 bg-primary-50 text-primary-700 text-sm font-semibold flex items-center justify-between">
                          <span>{catName}</span>
                          <span>{items.reduce((a, i) => a + i.subtotal, 0).toFixed(2)} €</span>
                        </div>
                        {items.map(item => (
                          <div key={item.productId} className="px-6 py-3 flex items-center justify-between text-sm border-t border-surface-100">
                            <div>
                              <span className="font-mono text-xs text-surface-400 mr-2">{item.sku}</span>
                              <span className="text-surface-800">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-6 text-right">
                              <span className="text-surface-500">{item.quantity} x {item.unitPrice.toFixed(2)} €</span>
                              <span className="font-bold text-surface-900 w-24 text-right">{item.subtotal.toFixed(2)} €</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Notes */}
                    {order.notes && (
                      <div className="px-6 py-3 bg-amber-50 text-sm text-amber-800 border-t border-amber-100">
                        <strong>Notas:</strong> {order.notes}
                      </div>
                    )}

                    {/* Total */}
                    <div className="px-6 py-4 bg-surface-900 text-white flex items-center justify-between">
                      <span className="font-semibold">TOTAL</span>
                      <span className="text-2xl font-bold">{order.totalAmount.toFixed(2)} €</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
