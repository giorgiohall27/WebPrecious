import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Home,
  LogIn,
  LogOut,
  LayoutDashboard,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import { useCart } from '../../store/cartStore';
import { useAuth } from '../../store/authStore';

export default function ClientLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const { isLoggedIn, isSuperAdmin, userEmail, logout, logoutSuperAdmin, userProfile } = useAuth();
  const itemCount = getItemCount();

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/catalog?search=${encodeURIComponent(query)}` : '/catalog');
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    if (isSuperAdmin) logoutSuperAdmin();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0C1E35]" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 text-white/70 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
              aria-label="Volver atras"
              title="Volver atras"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <Link
              to="/"
              className="p-2 text-white/70 hover:text-white hover:bg-white/8 rounded-lg transition-colors shrink-0"
              aria-label="Home"
            >
              <Home className="w-5 h-5" />
            </Link>

            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder={t('common.search')}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-white/20 rounded-lg text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:border-primary-400 transition-colors"
                />
              </div>
            </form>

            <div className="flex items-center gap-0.5 shrink-0 ml-auto">
              {isLoggedIn && (
                <Link
                  to="/cart"
                  className="relative flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                >
                  <ShoppingCart style={{ width: '18px', height: '18px' }} />
                  <span className="hidden sm:inline text-sm font-medium">{t('nav.cart')}</span>
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-400 text-[#0C1E35] text-[10px] font-bold rounded-full flex items-center justify-center">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>
              )}

              <LanguageSwitcher />

              {(isLoggedIn || isSuperAdmin) ? (
                <>
                  {isLoggedIn && (
                    <div className="relative">
                      <button
                        onClick={() => {
                          setNotifOpen(!notifOpen);
                          setUserMenuOpen(false);
                        }}
                        className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                        aria-label="Notificaciones"
                      >
                        <Bell className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
                      </button>
                      {notifOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-surface-200 rounded-lg shadow-dropdown overflow-hidden z-50 animate-fade-in">
                          <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
                            <p className="text-sm font-semibold text-surface-900">{t('clientDashboard.notifications')}</p>
                            <button onClick={() => setNotifOpen(false)} className="text-surface-400 hover:text-surface-600 p-0.5">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-7 h-7 text-surface-200 mx-auto mb-2" />
                            <p className="text-sm text-surface-400">{t('clientDashboard.noNotifications')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => {
                        setUserMenuOpen(!userMenuOpen);
                        setNotifOpen(false);
                      }}
                      className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 text-white/70 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                      aria-label="Empresa"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white/80" />
                      </div>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-surface-200 rounded-xl shadow-dropdown overflow-hidden z-50 animate-fade-in">
                        <div className="px-4 py-3 border-b border-surface-100">
                          <p className="text-sm font-semibold text-surface-900">{userProfile?.name ?? (isSuperAdmin ? 'Super Admin' : 'Empresa')}</p>
                          <p className="text-xs text-surface-400">{userEmail ?? 'Panel de administración'}</p>
                        </div>
                        <div className="p-2 space-y-1">
                          {isSuperAdmin && (
                            <button
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate('/admin/dashboard');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg transition-colors font-medium"
                            >
                              <LayoutDashboard className="w-4 h-4 text-primary-600" />
                              Panel Admin
                            </button>
                          )}
                          {isLoggedIn && (
                            <button
                              onClick={() => {
                                setUserMenuOpen(false);
                                navigate('/profile');
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg transition-colors font-medium"
                            >
                              <User className="w-4 h-4 text-primary-600" />
                              Mi perfil
                            </button>
                          )}
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                          >
                            <LogOut className="w-4 h-4" />
                            {t('auth.logout')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-2 text-white/80 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm font-medium">{t('auth.login')}</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-[#0C1E35] border-t border-white/5 py-6 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary-500/30 flex items-center justify-center">
              <ShoppingBag className="w-3 h-3 text-primary-300" />
            </div>
            <span className="text-sm font-medium text-white">Precious Spain</span>
          </div>
          <p className="text-xs text-white/30">(c) 2026 Precious Spain - Portal B2B Mayorista</p>
        </div>
      </footer>
    </div>
  );
}
