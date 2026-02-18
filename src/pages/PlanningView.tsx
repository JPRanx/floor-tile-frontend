import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { factoriesApi } from '../requests/factories';
import type { Factory } from '../requests/factories';
import { planningApi } from '../requests/planning';
import type { PlanningHorizonResponse, BoatProjection } from '../requests/planning';
import { draftsApi } from '../requests/drafts';
import { FactoryPills } from '../components/planning/FactoryPills';
import { BoatCard } from '../components/planning/BoatCard';
import { ProjectedBoatPreview } from '../components/planning/ProjectedBoatPreview';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function PlanningView() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<PlanningHorizonResponse | null>(null);

  const [factoriesLoading, setFactoriesLoading] = useState(true);
  const [horizonLoading, setHorizonLoading] = useState(false);

  const [factoriesError, setFactoriesError] = useState<string | null>(null);
  const [horizonError, setHorizonError] = useState<string | null>(null);

  // Projected boat preview modal
  const [previewBoat, setPreviewBoat] = useState<BoatProjection | null>(null);

  // Quick accept state
  const [acceptingBoatId, setAcceptingBoatId] = useState<string | null>(null);

  // Fetch active factories on mount
  useEffect(() => {
    const fetchFactories = async () => {
      try {
        setFactoriesError(null);
        const result = await factoriesApi.getAll();
        setFactories(result);
        const firstActive = result.find((f) => f.active);
        if (firstActive) {
          setSelectedFactoryId(firstActive.id);
        }
      } catch (err) {
        console.error('Failed to load factories:', err);
        setFactoriesError(t('planning.factoriesError', 'Error al cargar fabricas'));
      } finally {
        setFactoriesLoading(false);
      }
    };
    fetchFactories();
  }, [t]);

  // Fetch horizon when factory changes
  const fetchHorizon = useCallback(async (factoryId: string) => {
    try {
      setHorizonLoading(true);
      setHorizonError(null);
      const result = await planningApi.getHorizon(factoryId, 3);
      setHorizon(result);
    } catch (err) {
      console.error('Failed to load planning horizon:', err);
      setHorizonError(t('planning.horizonError', 'Error al cargar el horizonte de planificacion'));
    } finally {
      setHorizonLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (selectedFactoryId) {
      fetchHorizon(selectedFactoryId);
    }
  }, [selectedFactoryId, fetchHorizon]);

  const handleFactorySelect = (factoryId: string) => {
    setSelectedFactoryId(factoryId);
  };

  const handleDrillIn = (boatId: string) => {
    if (selectedFactoryId) {
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${boatId}`);
    }
  };

  const handlePreview = (boatId: string) => {
    const projection = horizon?.projections.find((p) => p.boat_id === boatId);
    if (projection) setPreviewBoat(projection);
  };

  const handleQuickAccept = async (projection: BoatProjection) => {
    if (!selectedFactoryId) return;
    setAcceptingBoatId(projection.boat_id);
    try {
      const items = projection.product_details
        .filter((p) => p.suggested_pallets > 0)
        .map((p) => ({
          product_id: p.product_id,
          selected_pallets: p.suggested_pallets,
        }));

      await draftsApi.save({
        boat_id: projection.boat_id,
        factory_id: selectedFactoryId,
        notes: 'Creado desde aceptar sugerido',
        items,
      });

      // Refresh horizon to reflect new draft
      await fetchHorizon(selectedFactoryId);
    } catch (err) {
      console.error('Quick accept failed:', err);
    } finally {
      setAcceptingBoatId(null);
    }
  };

  const selectedFactory = factories.find((f) => f.id === selectedFactoryId);

  // Split projections into action-needed vs completed
  const { actionBoats, completedBoats, healthStats } = useMemo(() => {
    if (!horizon) return { actionBoats: [], completedBoats: [], healthStats: null };

    const action: BoatProjection[] = [];
    const completed: BoatProjection[] = [];

    let totalCritical = 0;
    let totalUrgent = 0;
    let totalSoon = 0;
    let totalOk = 0;
    let totalProducts = 0;

    for (const p of horizon.projections) {
      if (p.draft_status === 'ordered' || p.draft_status === 'confirmed') {
        completed.push(p);
      } else {
        action.push(p);
      }
      totalCritical += p.urgency_breakdown.critical;
      totalUrgent += p.urgency_breakdown.urgent;
      totalSoon += p.urgency_breakdown.soon;
      totalOk += p.urgency_breakdown.ok;
      totalProducts += p.product_details.length;
    }

    // Sort action boats by order deadline (soonest first)
    action.sort((a, b) => (a.days_until_order_deadline ?? 999) - (b.days_until_order_deadline ?? 999));

    return {
      actionBoats: action,
      completedBoats: completed,
      healthStats: { totalCritical, totalUrgent, totalSoon, totalOk, totalProducts },
    };
  }, [horizon]);

  // Full-page loading state for factories
  if (factoriesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Factories fetch error
  if (factoriesError) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <div className="max-w-md mx-auto bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{'\u26A0\uFE0F'}</span>
            <h2 className="text-lg font-semibold text-rose-300">
              {t('common.error', 'Error')}
            </h2>
          </div>
          <p className="text-rose-200/80 mb-4">{factoriesError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-colors font-medium"
          >
            {t('common.tryAgain', 'Intentar de nuevo')}
          </button>
        </div>
      </div>
    );
  }

  const hasProjections = horizon && horizon.projections.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('planning.title', 'Planificacion de Pedidos')}
          </h1>
          {selectedFactory && (
            <p className="mt-1 text-slate-400">
              {t('planning.subtitle', 'Horizonte de {{months}} meses para {{factory}}', {
                months: horizon?.horizon_months ?? 3,
                factory: selectedFactory.name,
              })}
            </p>
          )}
        </div>

        {/* Factory pills */}
        <FactoryPills
          factories={factories}
          selectedFactoryId={selectedFactoryId}
          onSelect={handleFactorySelect}
        />

        {/* Stock health summary bar */}
        {!horizonLoading && healthStats && healthStats.totalProducts > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-800/30 rounded-xl border border-slate-700/30 px-5 py-3">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mr-1">
              {t('planning.health', 'Salud')}
            </span>
            {healthStats.totalCritical > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="font-semibold">{healthStats.totalCritical}</span>
                <span className="text-xs">{t('planning.critical', 'critico')}</span>
              </span>
            )}
            {healthStats.totalUrgent > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <span className="font-semibold">{healthStats.totalUrgent}</span>
                <span className="text-xs">{t('planning.urgent', 'urgente')}</span>
              </span>
            )}
            {healthStats.totalSoon > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold">{healthStats.totalSoon}</span>
                <span className="text-xs">{t('planning.soon', 'pronto')}</span>
              </span>
            )}
            {healthStats.totalOk > 0 && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold">{healthStats.totalOk}</span>
                <span className="text-xs">{t('planning.ok', 'ok')}</span>
              </span>
            )}
            <span className="text-slate-600 ml-auto text-xs">
              {healthStats.totalProducts} {t('planning.productsTracked', 'productos')}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-700/50" />

        {/* Horizon content */}
        {horizonLoading && (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {horizonError && !horizonLoading && (
          <div className="max-w-md mx-auto bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{'\u26A0\uFE0F'}</span>
              <h2 className="text-lg font-semibold text-rose-300">
                {t('common.error', 'Error')}
              </h2>
            </div>
            <p className="text-rose-200/80 mb-4">{horizonError}</p>
            <button
              onClick={() => selectedFactoryId && fetchHorizon(selectedFactoryId)}
              className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg hover:bg-rose-500/30 transition-colors font-medium"
            >
              {t('common.retry', 'Reintentar')}
            </button>
          </div>
        )}

        {/* Action-needed boats */}
        {!horizonLoading && !horizonError && hasProjections && actionBoats.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {t('planning.actionNeeded', 'Requiere accion')} ({actionBoats.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {actionBoats.map((projection) => (
                <BoatCard
                  key={projection.boat_id}
                  projection={projection}
                  onDrillIn={handleDrillIn}
                  onPreview={handlePreview}
                  onQuickAccept={handleQuickAccept}
                  isAccepting={acceptingBoatId === projection.boat_id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed boats */}
        {!horizonLoading && !horizonError && hasProjections && completedBoats.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {t('planning.completed', 'Completados')} ({completedBoats.length})
            </h2>
            <div className="space-y-2">
              {completedBoats.map((projection) => (
                <BoatCard
                  key={projection.boat_id}
                  projection={projection}
                  onDrillIn={handleDrillIn}
                  compact
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!horizonLoading && !horizonError && horizon && horizon.projections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">{'\u{1F6A2}'}</span>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              {t('planning.noBoats', 'Sin barcos en el horizonte')}
            </h3>
            <p className="text-slate-500 max-w-md">
              {t(
                'planning.noBoatsDesc',
                'No hay barcos programados en los proximos 3 meses para esta fabrica. Agrega barcos desde la pagina de Barcos.'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Projected Boat Preview Modal */}
      {previewBoat && (
        <ProjectedBoatPreview
          isOpen={!!previewBoat}
          onClose={() => setPreviewBoat(null)}
          onDrillIn={(boatId) => {
            setPreviewBoat(null);
            handleDrillIn(boatId);
          }}
          boatProjection={previewBoat}
        />
      )}
    </div>
  );
}
