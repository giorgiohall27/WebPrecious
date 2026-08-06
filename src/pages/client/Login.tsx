import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useAuth } from '../../store/authStore';

export default function ClientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = login(email.trim(), password);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">

      {/* Minimal top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0C1E35] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-surface-900 tracking-tight">Precious Spain</span>
        </Link>
        <LanguageSwitcher />
      </div>

      {/* Centered form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          <div className="bg-white rounded-2xl shadow-xl border border-surface-200 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#0C1E35] flex items-center justify-center mx-auto mb-5">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-surface-900 mb-1">{t('auth.loginTitle')}</h1>
              <p className="text-sm text-surface-500">{t('auth.loginSubtitle')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">{t('auth.email')}</label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                  placeholder="email@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-surface-700">{t('auth.password')}</label>
                  <a href="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium">{t('auth.forgotPassword')}</a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-sm text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all pr-11"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} /> : <Eye className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#0C1E35] hover:bg-[#162d4d] text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-[#0C1E35]/20"
              >
                {loading ? 'Verificando...' : t('auth.login')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Register link */}
            <div className="mt-6 pt-6 border-t border-surface-100 text-center">
              <p className="text-sm text-surface-500">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold">{t('auth.register')}</Link>
              </p>
            </div>
          </div>

          {/* Admin link */}
          <div className="text-center mt-5">
            <Link to="/admin" className="text-xs text-surface-400 hover:text-surface-600 transition-colors">
              {t('auth.adminLogin')} →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
