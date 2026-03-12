import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function FactoryRequestBuilder() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const month = searchParams.get('month') || '';
  const factoryId = searchParams.get('factory_id') || '';

  // Format month for display
  const monthDisplay = month
    ? new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date(month + '-01'))
    : '';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-xl font-bold text-white">
          {t('factoryRequests.title', 'Solicitud de Produccion')}
        </h1>
        {monthDisplay && (
          <p className="text-lg text-indigo-400 capitalize">{monthDisplay}</p>
        )}
        {factoryId && (
          <p className="text-slate-500 text-xs">
            {t('factoryRequests.factoryLabel', 'Fabrica')}: {factoryId}
          </p>
        )}
        <p className="text-slate-400">
          {t('factoryRequests.comingSoon', 'Disponible pronto')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
        >
          {'\u2190'} {t('factoryRequests.backToPlanning', 'Volver al Planning')}
        </button>
      </div>
    </div>
  );
}
