import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  KeyRound,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useAuth } from '../../store/authStore';

export default function ClientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isSuperAdmin, isSupplier, loginWithPin, loginSuperAdminWithPin, loginSupplierWithPin } = useAuth();

  const preferredAdmin = searchParams.get('mode') === 'admin';
  const preferredSupplier = searchParams.get('mode') === 'supplier';
  const [pin, setPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [supplierPin, setSupplierPin] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);

  useEffect(() => {
    if (preferredAdmin && isSuperAdmin) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (preferredSupplier && isSupplier) {
      navigate('/supplier/preorders', { replace: true });
      return;
    }
    if (!preferredAdmin && isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, isSuperAdmin, isSupplier, navigate, preferredAdmin, preferredSupplier]);

  const handlePinChange = (value: string) => {
    setPin(value.replace(/\D/g, '').slice(0, 6));
    setCompanyError('');
  };

  const handleAdminPinChange = (value: string) => {
    setAdminPin(value.replace(/\D/g, '').slice(0, 6));
    setAdminError('');
  };

  const handleCompanySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCompanyError('');
    setCompanyLoading(true);

    const result = await loginWithPin(pin);
    setCompanyLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setCompanyError(result.error || 'PIN incorrecto');
    }
  };

  const handleAdminSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    const result = await loginSuperAdminWithPin(adminPin);
    setAdminLoading(false);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setAdminError(result.error || 'Acceso denegado');
    }
  };

  const handleSupplierSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSupplierError('');
    setSupplierLoading(true);
    const result = await loginSupplierWithPin(supplierPin);
    setSupplierLoading(false);
    if (result.success) navigate('/supplier/preorders');
    else setSupplierError(result.error || 'Acceso denegado');
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg border border-surface-200 bg-white text-surface-600 hover:text-surface-900 hover:border-primary-300 hover:bg-primary-50 transition-colors flex items-center justify-center"
            aria-label="Volver atras"
            title="Volver atras"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0C1E35] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-surface-900 tracking-tight">Precious Spain</span>
          </Link>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">{t('auth.loginPortalLabel')}</p>
            <h1 className="text-4xl lg:text-5xl font-black text-surface-900 tracking-[0.16em] uppercase">Precious Spain</h1>
            <p className="text-sm text-surface-500 mt-3">{t('auth.chooseAccess')}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form
              onSubmit={handleCompanySubmit}
              className={`w-full max-w-xl justify-self-center bg-white rounded-2xl shadow-xl border overflow-hidden lg:col-span-2 ${preferredAdmin || preferredSupplier ? 'border-surface-200' : 'border-primary-200 ring-4 ring-primary-50'}`}
            >
              <div className="bg-[#0C1E35] px-7 py-7 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at 18% 22%, rgba(59,130,246,0.9), transparent 38%)' }} />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{t('auth.companyAccess')}</h2>
                    <p className="text-sm text-white/65">{t('auth.companyPinAccess')}</p>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">{t('auth.companyPin')}</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-surface-200 rounded-xl text-center text-2xl font-black tracking-[0.45em] text-surface-900 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                      placeholder="000000"
                      value={pin}
                      onChange={event => handlePinChange(event.target.value)}
                      autoFocus={!preferredAdmin && !preferredSupplier}
                      required
                    />
                  </div>
                </div>

                {companyError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                    {companyError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={companyLoading || pin.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-[#0C1E35] hover:bg-[#162d4d] disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-[#0C1E35]/20"
                >
                  {companyLoading ? t('auth.verifying') : t('auth.enterAsCompany')}
                  {!companyLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            <div className="lg:col-span-2 mt-5 flex items-center gap-4" aria-hidden="true">
              <div className="h-px flex-1 bg-surface-200" />
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-surface-400">Otros accesos</span>
              <div className="h-px flex-1 bg-surface-200" />
            </div>

            <form onSubmit={handleSupplierSubmit} className={`bg-white rounded-2xl shadow-xl border overflow-hidden ${preferredSupplier ? 'border-primary-200 ring-4 ring-primary-50' : 'border-surface-200'}`}>
              <div className="bg-primary-700 px-7 py-7 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}><Truck className="w-7 h-7" /></div>
                  <div><h2 className="text-2xl font-bold mb-1">Preventa / Proveedor</h2><p className="text-sm text-white/70">Acceso para preparar preventas</p></div>
                </div>
              </div>
              <div className="p-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">PIN de proveedor</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-surface-200 rounded-xl text-center text-2xl font-black tracking-[0.45em] focus:outline-none focus:ring-2 focus:ring-primary-500/30" placeholder="000000" value={supplierPin} onChange={event => { setSupplierPin(event.target.value.replace(/\D/g, '').slice(0, 6)); setSupplierError(''); }} required />
                  </div>
                </div>
                {supplierError && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">{supplierError}</div>}
                <button type="submit" disabled={supplierLoading || supplierPin.length !== 6} className="w-full flex items-center justify-center gap-2 bg-primary-700 hover:bg-primary-800 disabled:bg-surface-300 text-white font-bold py-3.5 rounded-xl transition-colors text-sm">
                  {supplierLoading ? t('auth.verifying') : 'Entrar como proveedor'}
                  {!supplierLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>

            <form
              onSubmit={handleAdminSubmit}
              className={`bg-white rounded-2xl shadow-xl border overflow-hidden ${preferredAdmin ? 'border-primary-200 ring-4 ring-primary-50' : 'border-surface-200'}`}
            >
              <div className="bg-surface-900 px-7 py-7 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{ background: 'linear-gradient(135deg, transparent 0%, rgba(37,99,235,0.7) 45%, transparent 72%)' }} />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
                    <ShieldCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Super Admin</h2>
                    <p className="text-sm text-white/65">{t('auth.adminPanelInternal')}</p>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">{t('auth.superAdminPin')}</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-surface-200 rounded-xl text-center text-2xl font-black tracking-[0.45em] text-surface-900 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 transition-all"
                      placeholder="000000"
                      value={adminPin}
                      onChange={event => handleAdminPinChange(event.target.value)}
                      autoFocus={preferredAdmin}
                      required
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 font-medium">
                    {adminError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={adminLoading || adminPin.length !== 6}
                  className="w-full flex items-center justify-center gap-2 bg-surface-900 hover:bg-[#162d4d] disabled:bg-surface-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors text-sm shadow-lg shadow-surface-900/20"
                >
                  {adminLoading ? t('auth.verifying') : t('auth.enterAdminPanel')}
                  {!adminLoading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
