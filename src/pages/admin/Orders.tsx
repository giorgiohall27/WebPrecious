import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { CheckCircle, Search, XCircle, ChevronDown, ChevronRight, SlidersHorizontal, Send } from 'lucide-react';
import { Order, OrderItemAvailability } from '../../types';
import { useOrders } from '../../store/ordersStore';
import { notifyCustomerOrderDecision } from '../../lib/orderEmails';

type ItemDecision = {
  availabilityStatus: OrderItemAvailability;
  adminNote: string;
};

export default function Orders() {
  const { t } = useTranslation();
  const { orders, updateOrderStatus, updateOrderWithItemDecisions } = useOrders();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [modifyingOrderId, setModifyingOrderId] = useState<string | null>(null);
  const [itemDecisions, setItemDecisions] = useState<Record<string, Record<string, ItemDecision>>>({});

  const statusColors: Record<string, string> = {
    pending:               'bg-amber-50 text-amber-700 border-amber-200',
    authorization_pending: 'bg-orange-50 text-orange-700 border-orange-200',
    accepted:              'bg-emerald-50 text-emerald-700 border-emerald-200',
    accepted_modified:     'bg-cyan-50 text-cyan-700 border-cyan-200',
    rejected:              'bg-red-50 text-red-700 border-red-200',
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

  const ensureDecisions = (order: Order) => {
    setItemDecisions(prev => {
      if (prev[order.id]) return prev;
      return {
        ...prev,
        [order.id]: Object.fromEntries(order.items.map(item => [
          item.productId,
          {
            availabilityStatus: item.availabilityStatus ?? 'available',
            adminNote: item.adminNote ?? '',
          },
        ])),
      };
    });
  };

  const handleAccept = async (order: Order) => {
    const updated = await updateOrderStatus(order.id, 'accepted');
    if (updated) notifyCustomerOrderDecision(updated, 'accepted');
  };

  const handleReject = async (order: Order) => {
    const updated = await updateOrderStatus(order.id, 'rejected');
    if (updated) notifyCustomerOrderDecision(updated, 'rejected');
  };

  const handleStartModification = (order: Order) => {
    ensureDecisions(order);
    setModifyingOrderId(order.id);
    setExpandedOrder(order.id);
  };

  const setItemDecision = (orderId: string, productId: string, availabilityStatus: OrderItemAvailability) => {
    setItemDecisions(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [productId]: {
          availabilityStatus,
          adminNote: prev[orderId]?.[productId]?.adminNote ?? '',
        },
      },
    }));
  };

  const setItemNote = (orderId: string, productId: string, adminNote: string) => {
    setItemDecisions(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [productId]: {
          availabilityStatus: prev[orderId]?.[productId]?.availabilityStatus ?? 'available',
          adminNote,
        },
      },
    }));
  };

  const handleSaveModification = async (order: Order) => {
    const decisionsForOrder = itemDecisions[order.id] ?? {};
    const updated = await updateOrderWithItemDecisions(order.id, order.items.map(item => ({
      productId: item.productId,
      availabilityStatus: decisionsForOrder[item.productId]?.availabilityStatus ?? 'available',
      adminNote: decisionsForOrder[item.productId]?.adminNote ?? '',
    })));

    if (updated) {
      setModifyingOrderId(null);
      notifyCustomerOrderDecision(updated, 'accepted_modified');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-900">{t('orders.title')}</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t('orders.company')}...`} className="input-field pl-10" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field pr-8 appearance-none min-w-[190px]">
            <option value="">{t('common.all')} {t('orders.status')}</option>
            <option value="authorization_pending">{t('orders.authorization_pending')}</option>
            <option value="accepted">{t('orders.accepted')}</option>
            <option value="accepted_modified">{t('orders.accepted_modified')}</option>
            <option value="rejected">{t('orders.rejected')}</option>
            <option value="pending">{t('orders.pending')}</option>
            <option value="processing">{t('orders.processing')}</option>
            <option value="completed">{t('orders.completed')}</option>
            <option value="cancelled">{t('orders.cancelled')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card p-12 text-center text-surface-400">{t('orders.noOrders')}</div>
        ) : (
          filtered.map(order => {
            const isExpanded = expandedOrder === order.id;
            const groups = groupItemsByCategory(order);
            const isBeingModified = modifyingOrderId === order.id;
            const decisionsForOrder = itemDecisions[order.id] ?? {};

            return (
              <div key={order.id} className="card overflow-hidden">
                <div
                  className="flex flex-col gap-4 px-6 py-4 hover:bg-surface-50 transition-colors lg:flex-row lg:items-center"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0 cursor-pointer">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-sm font-mono font-bold text-primary-600">{order.orderId}</span>
                      <span className={`badge border ${statusColors[order.status]}`}>{t(`orders.${order.status}`)}</span>
                    </div>
                    <p className="font-semibold text-surface-900">{order.companyName}</p>
                    <p className="text-xs text-surface-400">{new Date(order.createdAt).toLocaleString()} · {order.totalItems} {t('orders.items').toLowerCase()}</p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="text-xl font-bold text-surface-900">{order.totalAmount.toFixed(2)} €</p>
                    {order.status === 'authorization_pending' && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleAccept(order);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Aceptar
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartModification(order);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Aceptar con modificaciones
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleReject(order);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                  <button className="btn-icon self-start lg:self-auto" onClick={(event) => {
                    event.stopPropagation();
                    setExpandedOrder(isExpanded ? null : order.id);
                  }}>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-surface-400" /> : <ChevronRight className="w-5 h-5 text-surface-400" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-surface-100 animate-slide-up">
                    <div className="px-6 py-4 bg-surface-50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div><span className="text-surface-400">CIF:</span> <span className="font-medium">{order.companyCif}</span></div>
                      <div><span className="text-surface-400">Email:</span> <span className="font-medium">{order.companyEmail}</span></div>
                      <div><span className="text-surface-400">{t('auth.phone')}:</span> <span className="font-medium">{order.companyPhone}</span></div>
                      <div><span className="text-surface-400">{t('auth.contactPerson')}:</span> <span className="font-medium">{order.contactPerson}</span></div>
                      <div className="sm:col-span-2"><span className="text-surface-400">{t('auth.deliveryAddress')}:</span> <span className="font-medium">{order.deliveryAddress}</span></div>
                    </div>

                    {isBeingModified && (
                      <div className="px-6 py-4 bg-cyan-50 border-t border-cyan-100">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <h3 className="font-bold text-cyan-900">Aceptar con modificaciones</h3>
                            <p className="text-sm text-cyan-700">Marca qué productos sí llegarán y cuáles no. Al guardar se enviará el email al cliente.</p>
                          </div>
                          <button
                            onClick={() => handleSaveModification(order)}
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            Guardar y avisar
                          </button>
                        </div>
                      </div>
                    )}

                    {Object.entries(groups).map(([catName, items]) => (
                      <div key={catName}>
                        <div className="px-6 py-2 bg-primary-50 text-primary-700 text-sm font-semibold flex items-center justify-between">
                          <span>{catName}</span>
                          <span>{items.reduce((a, i) => a + i.subtotal, 0).toFixed(2)} €</span>
                        </div>
                        {items.map(item => {
                          const decision = decisionsForOrder[item.productId];
                          const currentAvailability = decision?.availabilityStatus ?? item.availabilityStatus ?? 'available';

                          return (
                            <div key={item.productId} className="px-6 py-3 text-sm border-t border-surface-100">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <span className="font-mono text-xs text-surface-400 mr-2">{item.sku}</span>
                                  <span className="text-surface-800">{item.name}</span>
                                  {item.availabilityStatus === 'unavailable' && (
                                    <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">No llegará</span>
                                  )}
                                  {item.availabilityStatus === 'available' && order.status === 'accepted_modified' && (
                                    <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Sí llegará</span>
                                  )}
                                  {item.adminNote && <p className="mt-1 text-xs text-surface-500">{item.adminNote}</p>}
                                </div>
                                <div className="flex items-center gap-6 text-right">
                                  <span className="text-surface-500">{item.quantity} x {item.unitPrice.toFixed(2)} €</span>
                                  <span className="font-bold text-surface-900 w-24 text-right">{item.subtotal.toFixed(2)} €</span>
                                </div>
                              </div>

                              {isBeingModified && (
                                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setItemDecision(order.id, item.productId, 'available')}
                                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${currentAvailability === 'available' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'}`}
                                    >
                                      Sí tengo stock
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setItemDecision(order.id, item.productId, 'unavailable')}
                                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${currentAvailability === 'unavailable' ? 'bg-red-600 text-white' : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'}`}
                                    >
                                      No tengo stock
                                    </button>
                                  </div>
                                  <input
                                    value={decision?.adminNote ?? ''}
                                    onChange={event => setItemNote(order.id, item.productId, event.target.value)}
                                    className="input-field text-xs py-2"
                                    placeholder="Nota opcional para este producto"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {order.notes && (
                      <div className="px-6 py-3 bg-amber-50 text-sm text-amber-800 border-t border-amber-100">
                        <strong>Notas:</strong> {order.notes}
                      </div>
                    )}

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
