import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { BentoGrid, BentoGridItem } from '../../components/ui/bento-grid';
import { ThreeDMarquee } from '../../components/ui/3d-marquee';
import {
  Wine, UtensilsCrossed, SprayCan, Package, HeartPulse, ArrowRight,
  Candy, GlassWater, Beer, Flame, Tag, Star,
} from 'lucide-react';
import { mockProducts, mockCategories } from '../../data/mockData';

/* ── Category config for the bento grid ───────────────────────── */
const CATEGORY_STYLE_MAP: Record<string, { icon: any, gradient: string, image: string }> = {
  'SWEETS': { icon: Candy, gradient: 'from-pink-900 to-pink-500', image: '/categories/sweets.jpg' },
  'CHOCOLATES': { icon: UtensilsCrossed, gradient: 'from-amber-900 to-amber-600', image: '/categories/chocolates.jpg' },
  'SNACKS': { icon: Flame, gradient: 'from-orange-900 to-orange-500', image: '/categories/snacks.jpg' },
  'ALIMENTACION': { icon: Package, gradient: 'from-rose-900 to-rose-600', image: '/categories/alimentacion.jpg' },
  'REFRESCOS': { icon: GlassWater, gradient: 'from-cyan-900 to-cyan-600', image: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=800' },
  'BEBIDAS ALCOHOLICAS': { icon: Beer, gradient: 'from-emerald-900 to-emerald-600', image: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800' },
};

const HOME_CATEGORIES = mockCategories.slice(0, 6).map(cat => ({
  ...cat,
  ...(CATEGORY_STYLE_MAP[cat.name] || { icon: Package, gradient: 'from-slate-800 to-slate-600', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800' })
}));

/* ── Promotions: IDs of promoted products (admin-configurable) ── */
const PROMO_PRODUCT_IDS = ['p-6', 'p-14', 'p-20', 'p-33', 'p-38', 'p-12'];

export default function ClientDashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isEs = i18n.language === 'es';

  /* Build promo list from mock products */
  const promoProducts = useMemo(() =>
    PROMO_PRODUCT_IDS.map(id => mockProducts.find(p => p.id === id)).filter(Boolean) as typeof mockProducts,
  []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 animate-fade-in space-y-12">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0C1E35] text-white" style={{ minHeight: '480px' }}>

        {/* ThreeDMarquee — full background */}
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

        {/* Dark center gradient so text is always readable */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(12,30,53,0.88) 0%, rgba(12,30,53,0.40) 70%, transparent 100%)' }}
        />

        {/* Content — Tesla-style title */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-8 py-16 lg:py-24 h-full" style={{ minHeight: '480px' }}>
          <h1
            className="font-black tracking-[0.25em] uppercase mb-5 leading-none select-none"
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

      {/* ── Promotions of the Week ─────────────────────────────────── */}
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
              {isEs ? 'Selección especial de productos destacados' : 'Special selection of featured products'}
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
              {/* Promo badge */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-400 text-[#0C1E35] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                <Tag className="w-3 h-3" />
                Promo
              </div>

              {/* Image */}
              <div className="aspect-square overflow-hidden bg-surface-50">
                <img
                  src={product.imageUrl || 'https://via.placeholder.com/400'}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs text-surface-400 mb-0.5">{product.brand}</p>
                <p className="text-sm font-semibold text-surface-900 line-clamp-2 leading-tight">{product.name}</p>
                <p className="text-primary-600 font-bold text-sm mt-1.5">{product.price.toFixed(2)} €</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Categories Bento ──────────────────────────────────────── */}
      <section>
        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-2">{t('clientDashboard.ourCategories')}</p>
          <h2 className="text-xl font-bold text-surface-900 mb-1">{t('clientDashboard.shopByCategory')}</h2>
        </div>

        {/* ── Row 1: All Categories (wide) + 2 small ── */}
        {/* ── Row 2: 4 equal cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" style={{ gridAutoRows: '220px' }}>

          {/* All Categories — spans 2 cols */}
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
              <p className="text-white/60 text-sm">{mockProducts.filter(p => p.active).length} {t('clientDashboard.productsAvailable')}</p>
            </div>
          </button>

          {/* Category cards: first 2 on row 1, next 4 on row 2 */}
          {HOME_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/catalog?category=${cat.id}`)}
                className="relative rounded-2xl overflow-hidden group cursor-pointer"
              >
                <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-60`} />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-bold text-base drop-shadow-lg">{cat.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
