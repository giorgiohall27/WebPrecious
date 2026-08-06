import { useTranslation } from 'react-i18next';
import { Package, ClipboardList, AlertTriangle, FolderTree, TrendingUp, ArrowUpRight } from 'lucide-react';
import { mockProducts, mockOrders, mockCategories } from '../../data/mockData';

export default function Dashboard() {
  const { t } = useTranslation();

  const totalProducts = mockProducts.length;
  const monthlyOrders = mockOrders.length;
  const activeCategories = mockCategories.filter(c => c.active).length;

  const kpis = [
    { label: t('dashboard.totalProducts'), value: totalProducts, icon: Package, color: 'from-blue-500 to-blue-600', change: '+12%' },
    { label: t('dashboard.monthlyOrders'), value: monthlyOrders, icon: ClipboardList, color: 'from-emerald-500 to-emerald-600', change: '+8%' },
    { label: t('dashboard.activeCategories'), value: activeCategories, icon: FolderTree, color: 'from-violet-500 to-violet-600', change: '+2' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">{t('dashboard.title')}</h1>
        <p className="text-surface-500 mt-1">WebPedidos B2B Portal</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="card p-6 group hover:shadow-card-hover transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-sm`}>
                <kpi.icon className="w-6 h-6 text-white" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {kpi.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-surface-900">{kpi.value}</p>
              <p className="text-sm text-surface-500 mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900">{t('dashboard.recentOrders')}</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-surface-100">
            {mockOrders.map(order => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-surface-900">{order.companyName}</p>
                  <p className="text-xs text-surface-400">{order.orderId} · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-surface-900">{order.totalAmount.toFixed(2)} €</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-green-50 text-green-700' :
                    order.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    order.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {t(`orders.${order.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
