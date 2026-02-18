import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { factoriesApi } from '../requests/factories';
import type { Factory } from '../requests/factories';
import { planningApi } from '../requests/planning';
import type { PlanningHorizonResponse, BoatProjection } from '../requests/planning';
import { draftsApi } from '../requests/drafts';
import { FactoryLane } from '../components/planning/FactoryLane';
import { BoatCard } from '../components/planning/BoatCard';
import { Briefing } from '../components/planning/Briefing';
import { ProjectedBoatPreview } from '../components/planning/ProjectedBoatPreview';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function PlanningView() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [factories, setFactories] = useState<Factory[]>([]);
  const [factoriesLoading, setFactoriesLoading] = useState(true);
  const [factoriesError, setFactoriesError] = useState<string | null>(null);

  // Horizon data per factory
  const [horizons, setHorizons] = useState<Map<string, PlanningHorizonResponse>>(new Map());
  const [horizonLoading, setHorizonLoading] = useState<Set<string>>(new Set());

  // Selected factory for detail view
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);

  // Preview modal
  const [previewBoat, setPreviewBoat] = useState<BoatProjection | null>(null);

  // Quick accept state
  const [acceptingBoatId, setAcceptingBoatId] = useState<string | null>(null);

  // Fetch factories on mount
  useEffect(() => {
    const fetchFactories = async () => {
      try {
        setFactoriesError(null);
        const result = await factoriesApi.getAll();
        setFactories(result);
      } catch (err) {
        console.error('Failed to load factories:', err);
        setFactoriesError(t('planning.factoriesError', 'Error al cargar fabricas'));
      } finally {
        setFactoriesLoading(false);
      }
    };
    fetchFactories();
  }, [t]);

  // Fetch horizons for all active factories
  const fetchHorizon = useCallback(async (factoryId: string) => {
    setHorizonLoading((prev) => new Set(prev).add(factoryId));
    try {
      const result = await planningApi.getHorizon(factoryId, 3);
      setHorizons((prev) => {
        const next = new Map(prev);
        next.set(factoryId, result);
        return next;
      });
    } catch (err) {
      console.error(`Failed to load horizon for factory ${factoryId}:`, err);
    } finally {
      setHorizonLoading((prev) => {
        const next = new Set(prev);
        next.delete(factoryId);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    const activeFactories = factories.filter((f) => f.active);
    for (const factory of activeFactories) {
      fetchHorizon(factory.id);
    }
    // Auto-select first active factory
    if (activeFactories.length > 0 && !selectedFactoryId) {
      setSelectedFactoryId(activeFactories[0].id);
    }
  }, [factories, fetchHorizon, selectedFactoryId]);

  const handleFactorySelect = (factoryId: string) => {
    setSelectedFactoryId((prev) => (prev === factoryId ? null : factoryId));
  };

  const handleBoatClick = (factoryId: string, boatId: string) => {
    // Select the factory and scroll to detail
    setSelectedFactoryId(factoryId);
    // Could also navigate to OB, but keeping on planning page for now
  };

  const handleDrillIn = (boatId: string) => {
    if (selectedFactoryId) {
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${boatId}`);
    }
  };

  const handlePreview = (boatId: string) => {
    const horizon = selectedFactoryId ? horizons.get(selectedFactoryId) : null;
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

      // Refresh horizon for this factory
      await fetchHorizon(selectedFactoryId);
    } catch (err) {
      console.error('Quick accept failed:', err);
    } finally {
      setAcceptingBoatId(null);
    }
  };

  // Selected factory's data
  const selectedHorizon = selectedFactoryId ? horizons.get(selectedFactoryId) : null;
  const selectedFactory = factories.find((f) => f.id === selectedFactoryId);

  // Split into action vs completed for detail view
  const { actionBoats, completedBoats, healthStats } = useMemo(() => {
    if (!selectedHorizon) return { actionBoats: [], completedBoats: [], healthStats: null };

    const action: BoatProjection[] = [];
    const completed: BoatProjection[] = [];
    let totalCritical = 0;
    let totalUrgent = 0;
    let totalSoon = 0;
    let totalOk = 0;
    let totalProducts = 0;

    for (const p of selectedHorizon.projections) {
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

    action.sort((a, b) => (a.days_until_order_deadline ?? 999) - (b.days_until_order_deadline ?? 999));

    return {
      actionBoats: action,
      completedBoats: completed,
      healthStats: { totalCritical, totalUrgent, totalSoon, totalOk, totalProducts },
    };
  }, [selectedHorizon]);

  // Full-page loading
  if (factoriesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (factoriesError) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
        <div className="max-w-md mx-auto bg-rose-500/10 border border-rose-500/30 rounded-xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{'\u26A0\uFE0F'}</span>
            <h2 className="text-lg font-semibold text-rose-300">{t('common.error', 'Error')}</h2>
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

  return (
    <div className="min-h-screen bg-slate-950 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page header + briefing */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {t('planning.title', 'Tus Pedidos Preparados')}
          </h1>
          <div className="flex items-center justify-between">
            <Briefing horizons={horizons} factoryCount={factories.filter((f) => f.active).length} />
            <span className="text-xs text-slate-600">
              {t('planning.horizon', 'proximos 3 meses')}
            </span>
          </div>
        </div>

        {/* Factory swimlanes */}
        <div className="space-y-3">
          {factories.map((factory) => (
            <FactoryLane
              key={factory.id}
              factory={factory}
              horizon={horizons.get(factory.id) ?? null}
              loading={horizonLoading.has(factory.id)}
              isSelected={selectedFactoryId === factory.id}
              onSelect={() => handleFactorySelect(factory.id)}
              onBoatClick={(boatId) => handleBoatClick(factory.id, boatId)}
            />
          ))}
        </div>

        {/* Detail view for selected factory */}
        {selectedFactoryId && selectedHorizon && (
          <>
            {/* Divider */}
            <div className="border-t border-slate-700/50 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  {selectedFactory?.name} — {t('planning.detail', 'Detalle')}
                </h2>
                {/* Health stats */}
                {healthStats && healthStats.totalProducts > 0 && (
                  <div className="flex items-center gap-3 text-xs">
                    {healthStats.totalCritical > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {healthStats.totalCritical}
                      </span>
                    )}
                    {healthStats.totalUrgent > 0 && (
                      <span className="flex items-center gap-1 text-orange-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        {healthStats.totalUrgent}
                      </span>
                    )}
                    {healthStats.totalSoon > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {healthStats.totalSoon}
                      </span>
                    )}
                    {healthStats.totalOk > 0 && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {healthStats.totalOk}
                      </span>
                    )}
                    <span className="text-slate-600">{healthStats.totalProducts} prod</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action-needed boats */}
            {actionBoats.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('planning.actionNeeded', 'Requiere accion')} ({actionBoats.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            {completedBoats.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('planning.completed', 'Completados')} ({completedBoats.length})
                </h3>
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
            {actionBoats.length === 0 && completedBoats.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl">{'\u{1F6A2}'}</span>
                <p className="text-slate-500 mt-3">
                  {t('planning.noBoatsDesc', 'No hay barcos programados para esta fabrica.')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview modal */}
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
