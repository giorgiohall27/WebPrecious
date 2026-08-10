import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Beer,
  Candy,
  Flame,
  GlassWater,
  Package,
  Star,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { ThreeDMarquee } from '../../components/ui/3d-marquee';
import { useProducts } from '../../store/productsStore';
import { useAuth } from '../../store/authStore';

type CategoryStyle = {
  icon: LucideIcon;
  gradient: string;
  image: string;
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  icon: Package,
  gradient: 'from-slate-800 to-slate-600',
  image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
};

const CATEGORY_STYLE_MAP: Record<string, CategoryStyle> = {
  SWEETS: { icon: Candy, gradient: 'from-pink-900 to-pink-500', image: '/categories/sweets.jpg' },
  CHUCHES: { icon: Candy, gradient: 'from-pink-900 to-pink-500', image: '/categories/sweets.jpg' },
  CHOCOLATES: { icon: UtensilsCrossed, gradient: 'from-amber-900 to-amber-600', image: '/categories/chocolates.jpg' },
  CHOCOLATE: { icon: UtensilsCrossed, gradient: 'from-amber-900 to-amber-600', image: '/categories/chocolates.jpg' },
  SNACKS: { icon: Flame, gradient: 'from-orange-900 to-orange-500', image: '/categories/snacks.jpg' },
  ALIMENTACION: { icon: Package, gradient: 'from-rose-900 to-rose-600', image: '/categories/alimentacion.jpg' },
  ALIMENTACIÓN: { icon: Package, gradient: 'from-rose-900 to-rose-600', image: '/categories/alimentacion.jpg' },
  REFRESCOS: {
    icon: GlassWater,
    gradient: 'from-cyan-900 to-cyan-600',
    image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=800',
  },
  'BEBIDAS ALCOHOLICAS': {
    icon: Beer,
    gradient: 'from-emerald-900 to-emerald-600',
    image: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800',
  },
};

export default function ClientDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { products, categories } = useProducts();
  const { isLoggedIn, isSuperAdmin } = useAuth();
  const isEs = i18n.language === 'es';
  const canViewSensitive = isLoggedIn || isSuperAdmin;

  const activeProducts = useMemo(() => products.filter(product => product.active), [products]);
  const promoProducts = useMemo(
    () => activeProducts.filter(product => product.imageUrl).slice(0, 6),
    [activeProducts],
  );
  const homeCategories = useMemo(
    () =>
      categories
        .filter(category => category.active)
        .slice(0, 6)
        .map(category => ({
          ...category,
          ...(CATEGORY_STYLE_MAP[category.name.toUpperCase()] || DEFAULT_CATEGORY_STYLE),
        })),
    [categories],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in space-y-12">
      <div className="relative overflow-hidden rounded-2xl bg-[#0C1E35] text-white" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0">
          <ThreeDMarquee
            images={[
              'https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1521986329282-0436c1f1e212?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1532336414038-cf19250c5757?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=280&fit=crop',
              'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&h=280&fit=crop',
            ]}
            className="w-full h-full"
          />
        </div>

        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(12,30,53,0.88) 0%, rgba(12,30,53,0.40) 70%, transparent 100%)',
          }}
        />

        <div className="relative z-20 flex flex-col items-center justify-center text-center px-8 py-16 lg:py-24 h-full" style={{ minHeight: '480px' }}>
          <h1
            className="font-black uppercase mb-5 leading-none select-none"
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 8rem)',
              fontFamily: "'Tesla', 'Inter', sans-serif",
              fontWeight: 400,
              letterSpacing: '0.25em',
              textShadow: '0 2px 30px rgba(0,0,0,0.6)',
            }}
          >
            PRECIOUS SPAIN
          </h1>
          <button
            onClick={() => navigate('/catalog')}
            className="inline-flex items-center gap-2.5 bg-white text-[#0C1E35] font-bold px-10 py-4 mt-8 rounded-xl hover:bg-primary-50 transition-colors text-base shadow-2xl"
          >
            {t('clientDashboard.browseAll')}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900">
              {isEs ? 'Promociones de la Semana' : 'Promotions of the Week'}
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              {isEs ? 'Seleccion especial de productos destacados' : 'Special selection of featured products'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {promoProducts.map(product => (
            <button
              key={product.id}
              onClick={() => navigate(`/catalog?category=${product.categoryId}`)}
              className="group relative bg-white rounded-xl border border-surface-200 hover:border-primary-300 hover:shadow-lg transition-all overflow-hidden text-left"
            >
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-400 text-[#0C1E35] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                <Tag className="w-3 h-3" />
                Promo
              </div>

              <div className="aspect-square overflow-hidden bg-surface-50">
                <img
                  src={product.imageUrl || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-3">
                <p className="text-xs text-surface-400 mb-0.5">{product.brand}</p>
                <p className="text-sm font-semibold text-surface-900 line-clamp-2 leading-tight">{product.name}</p>
                <p className="text-primary-600 font-bold text-sm mt-1.5">
                  {canViewSensitive ? `EUR ${product.price.toFixed(2)}` : t('catalog.priceHidden')}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">{t('clientDashboard.ourCategories')}</p>
          <h2 className="text-xl font-bold text-surface-900 mb-1">{t('clientDashboard.shopByCategory')}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ gridAutoRows: '220px' }}>
          <button
            onClick={() => navigate('/catalog')}
            className="col-span-2 relative rounded-2xl overflow-hidden group cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#0C1E35] via-[#1a3a5c] to-[#1a47d6]" />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 30%, rgba(26,71,214,0.5) 0%, transparent 70%)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform">
                <Package className="w-7 h-7 text-white" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{t('categoryNames.allCategories')}</p>
              <p className="text-white/60 text-sm">{activeProducts.length} {t('clientDashboard.productsAvailable')}</p>
            </div>
          </button>

          {homeCategories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => navigate(`/catalog?category=${category.id}`)}
                className="relative rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img src={category.image} alt={category.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-t ${category.gradient} opacity-60`} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-base drop-shadow-lg">{category.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
