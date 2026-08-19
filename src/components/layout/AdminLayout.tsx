import { useTranslation } from 'react-i18next';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Package, FolderTree, ClipboardList, LogOut, Menu, X, ShoppingBag, Building2, Monitor, Tag, FilePlus2 } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useState } from 'react';
import { useAuth } from '../../store/authStore';

const navItems = [
  { key: 'dashboard', label: 'Panel', path: '/admin/dashboard', icon: LayoutDashboard },
  { key: 'companies', label: 'Clientes', path: '/admin/companies', icon: Building2 },
  { key: 'preorders', label: 'Preventa', path: '/admin/preorders', icon: FilePlus2 },
  { key: 'products', label: 'Productos', path: '/admin/products', icon: Package },
  { key: 'categories', label: 'Categorias', path: '/admin/categories', icon: FolderTree },
  { key: 'promotions', label: 'Promociones', path: '/admin/promotions', icon: Tag },
  { key: 'orders', label: 'Pedidos', path: '/admin/orders', icon: ClipboardList },
  { key: 'viewWeb', label: 'Ver web', path: '/', icon: Monitor },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logoutSuperAdmin } = useAuth();

  return (
    <div className="flex min-h-screen bg-surface-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-surface-200 transform transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-100">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-surface-900">WebPedidos</h1>
              <p className="text-xs text-surface-400">{t('auth.adminLogin')}</p>
            </div>
            <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5 text-surface-400" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={active ? 'sidebar-link-active' : 'sidebar-link'}
                  id={`admin-nav-${item.key}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.key === 'viewWeb' ? t('nav.viewWeb') : item.key === 'promotions' ? t('nav.promotions') : item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="px-4 py-4 border-t border-surface-100">
            <button
              onClick={() => {
                logoutSuperAdmin();
                navigate('/admin');
              }}
              className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50"
              id="admin-logout-btn"
            >
              <LogOut className="w-5 h-5" />
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-surface-200 px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="lg:hidden btn-icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-icon"
              aria-label="Volver atras"
              title="Volver atras"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1" />
          <LanguageSwitcher />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
