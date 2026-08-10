import { useTranslation } from 'react-i18next';
import { Package, ClipboardList, FolderTree, TrendingUp, ArrowUpRight, Building2, KeyRound } from 'lucide-react';
import { useAuth } from '../../store/authStore';
import { Link } from 'react-router-dom';
import { useOrders } from '../../store/ordersStore';
import { useProducts } from '../../store/productsStore';

export default function Dashboard() {
  const { t } = useTranslation();
  const { companies } = useAuth();
  const { orders } = useOrders();
  const { products, categories } = useProducts();

  const totalProducts = products.length;
  const monthlyOrders = orders.length;
  const activeCategories = categories.filter(c => c.active).length;
  const activeCompanies = companies.filter(company => company.active).length;

  const kpis = [
    { label: t('dashboard.totalProducts'), value: totalProducts, icon: Package, color: 'from-blue-500 to-blue-600', change: '+12%', path: '/admin/products' },
    { label: t('dashboard.monthlyOrders'), value: monthlyOrders, icon: ClipboardList, color: 'from-emerald-500 to-emerald-600', change: '+8%', path: '/admin/orders' },
    { label: t('dashboard.activeCategories'), value: activeCategories, icon: FolderTree, color: 'from-violet-500 to-violet-600', change: '+2', path: '/admin/categories' },
    { label: 'Empresas activas', value: activeCompanies, icon: Building2, color: 'from-slate-700 to-slate-900', change: `${companies.length} total`, path: '/admin/companies' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">{t('dashboard.title')}</h1>
        <p className="text-surface-500 mt-1">WebPedidos B2B Portal</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Link key={i} to={kpi.path} className="card p-6 group hover:shadow-card-hover transition-all duration-300 block">
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
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,360px] gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900">{t('dashboard.recentOrders')}</h2>
            <Link to="/admin/orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-surface-100">
            {orders.map(order => (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-surface-900">{order.companyName}</p>
                  <p className="text-xs text-surface-400">{order.orderId} · {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-surface-900">{order.totalAmount.toFixed(2)} €</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-green-50 text-green-700' :
                    order.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                    order.status === 'rejected' ? 'bg-red-50 text-red-700' :
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

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <h2 className="text-lg font-semibold text-surface-900">Empresas con PIN</h2>
            <Link to="/admin/companies" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Gestionar <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-surface-100">
            {companies.slice(0, 5).map(company => (
              <div key={company.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-900 truncate">{company.name}</p>
                  <p className="text-xs text-surface-400">{company.active ? 'Activa' : 'Pausada'}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 bg-primary-50 border border-primary-100 rounded-full px-2 py-1">
                  <KeyRound className="w-3 h-3" />
                  {company.pin}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
