import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  KeyRound,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useAuth } from '../../store/authStore';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isLoggedIn, isSuperAdmin, loginWithPin, loginSuperAdminWithPin } = useAuth();

  const preferredAdmin = searchParams.get('mode') === 'admin';
  const [pin, setPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [companyError, setCompanyError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [companyLoading, setCompanyLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    if (preferredAdmin && isSuperAdmin) {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (!preferredAdmin && isLoggedIn) {
      navigate('/catalog', { replace: true });
    }
  }, [isLoggedIn, isSuperAdmin, navigate, preferredAdmin]);

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
      navigate('/catalog');
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

  return (
    <div className="min-h-screen bg-[#f4f6fa] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <Link to="/login" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0C1E35] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-surface-900 tracking-tight">Precious Spain</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">Portal B2B Mayorista</p>
            <h1 className="text-4xl lg:text-5xl font-black text-surface-900 tracking-[0.16em] uppercase">Precious Spain</h1>
            <p className="text-sm text-surface-500 mt-3">Elige tu acceso</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <form
              onSubmit={handleCompanySubmit}
              className={`bg-white rounded-2xl shadow-xl border overflow-hidden ${preferredAdmin ? 'border-surface-200' : 'border-primary-200 ring-4 ring-primary-50'}`}
            >
              <div className="bg-[#0C1E35] px-7 py-7 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(circle at 18% 22%, rgba(59,130,246,0.9), transparent 38%)' }} />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Empresa</h2>
                    <p className="text-sm text-white/65">Acceso privado por PIN de 6 digitos.</p>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">PIN de empresa</label>
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
                      autoFocus={!preferredAdmin}
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
                  {companyLoading ? 'Verificando...' : 'Entrar como empresa'}
                  {!companyLoading && <ArrowRight className="w-4 h-4" />}
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
                    <p className="text-sm text-white/65">Panel interno de gestion.</p>
                  </div>
                </div>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-surface-700 mb-2">PIN Super Admin</label>
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
                  {adminLoading ? 'Verificando...' : 'Entrar al panel'}
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
