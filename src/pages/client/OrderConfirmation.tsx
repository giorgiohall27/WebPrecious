import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Mail } from 'lucide-react';

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const location = useLocation();
  const state = location.state as { orderId?: string; total?: number; totalLines?: number; notes?: string } | null;

  const orderId = state?.orderId || 'PED-2026-00000';
  const total = state?.total || 0;
  const totalLines = state?.totalLines || 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center animate-slide-up">
      {/* Success Icon */}
      <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-8 animate-pulse-soft">
        <CheckCircle className="w-14 h-14 text-green-500" />
      </div>

      <h1 className="text-3xl font-bold text-surface-900 mb-3">{t('orderConfirmation.title')}</h1>
      <p className="text-lg text-surface-500 mb-8">{t('orderConfirmation.subtitle')}</p>
      <p className="text-xl font-semibold text-primary-700 mb-8">
        {t('orderConfirmation.thankYou')}
      </p>

      {/* Order Card */}
      <div className="card p-8 text-left mb-8">
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-surface-100">
          <div>
            <p className="text-sm text-surface-400">{t('orderConfirmation.orderNumber')}</p>
            <p className="text-2xl font-bold font-mono text-primary-600">{orderId}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-surface-400">{t('orderConfirmation.total')}</p>
            <p className="text-2xl font-bold text-surface-900">{total.toFixed(2)} €</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-xs text-surface-400">{t('orderConfirmation.items')}</p>
            <p className="text-lg font-semibold">{totalLines} líneas</p>
          </div>
          <div>
            <p className="text-xs text-surface-400">{t('orders.date')}</p>
            <p className="text-lg font-semibold">{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Email sent notice */}
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">{t('orderConfirmation.emailSent')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center">
        <Link to="/catalog" className="btn-primary">
          <ArrowLeft className="w-4 h-4" />
          {t('orderConfirmation.backToCatalog')}
        </Link>
      </div>
    </div>
  );
}
