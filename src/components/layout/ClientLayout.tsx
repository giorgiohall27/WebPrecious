import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  LogIn,
  LogOut,
  LayoutDashboard,
  MapPin,
  Search,
  ShoppingBag,
  ShoppingCart,
  KeyRound,
  User,
  X,
} from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import CartDrawer from '../cart/CartDrawer';
import { useCart } from '../../store/cartStore';
import { useAuth } from '../../store/authStore';
import { useProducts } from '../../store/productsStore';

export default function ClientLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const { products } = useProducts();
  const { isLoggedIn, isSuperAdmin, isSupplier, userEmail, logout, logoutSuperAdmin, logoutSupplier, userProfile, supplierProfile } = useAuth();
  const itemCount = getItemCount();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return [];

    return products
      .filter(product => product.active && [product.name, product.brand, product.sku].some(value =>
        value?.toLocaleLowerCase().includes(query)
      ))
      .sort((a, b) => {
        const aStartsWith = a.name.toLocaleLowerCase().startsWith(query);
        const bStartsWith = b.name.toLocaleLowerCase().startsWith(query);
        return Number(bStartsWith) - Number(aStartsWith) || a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [products, searchQuery]);

  useEffect(() => {
    const closeSearchSuggestions = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearchFocused(false);
    };

    document.addEventListener('mousedown', closeSearchSuggestions);
    return () => document.removeEventListener('mousedown', closeSearchSuggestions);
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    setSearchFocused(false);
    navigate(query ? `/catalog?search=${encodeURIComponent(query)}` : '/catalog');
    setSearchQuery('');
  };

  const openProduct = (productId: string) => {
    setSearchFocused(false);
    navigate(`/catalog?product=${encodeURIComponent(productId)}`);
    setSearchQuery('');
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    if (isSuperAdmin) logoutSuperAdmin();
    if (isSupplier) logoutSupplier();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0C1E35]" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2 sm:flex-nowrap sm:gap-3 sm:py-0 sm:h-14 lg:px-8">
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

            <form onSubmit={handleSearch} className="order-2 w-full sm:order-none sm:flex-1 sm:max-w-xl" role="search">
              <div className="relative" ref={searchContainerRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={event => {
                    setSearchQuery(event.target.value);
                    setSearchFocused(true);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onKeyDown={event => {
                    if (event.key === 'Escape') setSearchFocused(false);
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={t('common.search')}
                  autoComplete="off"
                  aria-label={t('common.search')}
                  aria-autocomplete="list"
                  aria-expanded={searchFocused && searchSuggestions.length > 0}
                  aria-controls="product-search-suggestions"
                  className="w-full pl-9 pr-4 py-2 bg-white border border-white/20 rounded-lg text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:border-primary-400 transition-colors"
                />
                {searchFocused && searchSuggestions.length > 0 && (
                  <div
                    id="product-search-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-dropdown z-50"
                  >
                    {searchSuggestions.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onClick={() => openProduct(product.id)}
                        className="flex w-full items-center gap-3 border-b border-surface-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-surface-100 bg-surface-50">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-black text-primary-600">
                              {(product.brand || product.name)[0]}
                            </div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-normal break-words text-sm font-bold leading-snug text-surface-900">{product.name}</span>
                          <span className="block whitespace-normal break-words text-xs leading-snug text-surface-500">
                            {[product.brand, product.sku].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="flex items-center gap-0.5 shrink-0 ml-auto">
              {(isLoggedIn || isSupplier) && (
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(true);
                    setUserMenuOpen(false);
                  }}
                  className="relative flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white hover:bg-white/8 rounded-lg transition-colors"
                  aria-label="Abrir carrito"
                >
                  <ShoppingCart style={{ width: '18px', height: '18px' }} />
                  <span className="hidden sm:inline text-sm font-medium">{t('nav.cart')}</span>
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-amber-400 text-[#0C1E35] text-[10px] font-bold rounded-full flex items-center justify-center">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </button>
              )}

              <LanguageSwitcher />

              {(isLoggedIn || isSuperAdmin || isSupplier) ? (
                <>
                  <div className="relative">
                    <button
                      onClick={() => {
                        setUserMenuOpen(!userMenuOpen);
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
                          <p className="text-sm font-semibold text-surface-900">{supplierProfile?.name ?? userProfile?.name ?? (isSuperAdmin ? 'Super Admin' : 'Empresa')}</p>
                          <p className="text-xs text-surface-400">{supplierProfile?.email || userEmail || 'Panel de administración'}</p>
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
                          {isSupplier && (
                            <>
                              <button
                                onClick={() => { setUserMenuOpen(false); navigate('/catalog'); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg transition-colors font-medium"
                              >
                                <ShoppingBag className="w-4 h-4 text-primary-600" />
                                Crear pedido
                              </button>
                              <button
                                onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 rounded-lg transition-colors font-medium"
                              >
                                <LayoutDashboard className="w-4 h-4 text-primary-600" />
                                Mis pedidos
                              </button>
                            </>
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
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4 text-center lg:text-left relative">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary-500/30 flex items-center justify-center">
              <ShoppingBag className="w-3 h-3 text-primary-300" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">PRECIOUS SPAIN S.L.</span>
              <p className="text-xs text-white/45 mt-0.5">CIF B93450534</p>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-xs text-white/65 lg:items-start">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Calle%20Jacaranda%2013%2C%20Local%201%2C%2029651%20Las%20Lagunas%20de%20Mijas%2C%20M%C3%A1laga"
              target="_blank"
              rel="noreferrer"
              className="flex max-w-sm items-start justify-center gap-1.5 text-center hover:text-white transition-colors lg:text-left"
            >
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Calle Jacaranda 13, Local 1 · Las Lagunas, Mijas Costa 29651</span>
            </a>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-5 lg:items-start">
            <a href="tel:+34648227263" className="hover:text-white transition-colors">+34 648 227 263</a>
            <a href="mailto:giorgiohall27@gmail.com" className="hover:text-white transition-colors">giorgiohall27@gmail.com</a>
            </div>
          </div>
          <p className="text-xs text-white/30">© 2026 Precious Spain · Portal Mayorista</p>
          {!isLoggedIn && !isSuperAdmin && !isSupplier && (
            <Link
              to="/login?mode=staff"
              className="absolute -right-1 -bottom-2 flex h-7 w-7 items-center justify-center rounded-full text-white/25 transition-colors hover:bg-white/10 hover:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Acceso interno"
              title="Acceso interno"
            >
              <KeyRound className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </footer>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
