import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { factoriesApi } from '../requests/factories';
import type { Factory } from '../requests/factories';
import { planningApi } from '../requests/planning';
import type { PlanningHorizonResponse, BoatProjection } from '../requests/planning';
import { draftsApi } from '../requests/drafts';
import { boatsApi } from '../requests/boats';
import { dataHubApi } from '../requests/dataHub';
import type { DataFreshnessResponse } from '../requests/dataHub';
import { FactoryLane } from '../components/planning/FactoryLane';
import { BoatCard } from '../components/planning/BoatCard';
import { Briefing } from '../components/planning/Briefing';
import { PipelineStrip } from '../components/planning/PipelineStrip';
import { ProjectedBoatPreview } from '../components/planning/ProjectedBoatPreview';
import { FactoryOrderSignalCard } from '../components/planning/FactoryOrderSignalCard';
import { FactoryTimeline } from '../components/planning/FactoryTimeline';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface TimelineMilestone {
  key: string;
  label: string;
  date: string;
  passed: boolean;
  is_current: boolean;
}

function buildTimeline(p: BoatProjection | undefined): { milestones: TimelineMilestone[]; current_milestone: string } | null {
  if (!p) return null;
  const today = new Date().toISOString().slice(0, 10);
  const milestones: TimelineMilestone[] = [];

  if (p.production_request_date) milestones.push({
    key: 'factory_request_cutoff', label: 'Solicitud producción',
    date: p.production_request_date, passed: p.production_request_date < today, is_current: false,
  });
  if (p.siesa_order_date) milestones.push({
    key: 'piggyback_cutoff', label: 'Pedido SIESA',
    date: p.siesa_order_date, passed: p.siesa_order_date < today, is_current: false,
  });
  if (p.order_by_date) milestones.push({
    key: 'order_deadline', label: 'Cierre pedido',
    date: p.order_by_date, passed: p.order_by_date < today, is_current: false,
  });
  milestones.push({
    key: 'departure', label: 'Zarpe',
    date: p.departure_date, passed: p.departure_date < today, is_current: false,
  });
  milestones.push({
    key: 'arrival', label: 'Llegada',
    date: p.arrival_date, passed: p.arrival_date < today, is_current: false,
  });

  // "Current" = first future milestone (the next thing that needs to happen)
  const firstFutureIdx = milestones.findIndex(m => !m.passed);
  if (firstFutureIdx >= 0) milestones[firstFutureIdx].is_current = true;
  else milestones[milestones.length - 1].is_current = true;

  return { milestones, current_milestone: milestones.find(m => m.is_current)?.key ?? '' };
}

export function PlanningView() {
  const { t, i18n } = useTranslation();
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

  // Estimated boats visibility
  const [showAllEstimated, setShowAllEstimated] = useState(false);

  // Focal boat for timeline (index into actionBoats)
  const [focalBoatIdx, setFocalBoatIdx] = useState(0);

  // Inline notifications (4a)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 5000 : 3000);
  }, []);

  // Horizon fetch error tracking (4d)
  const [horizonErrors, setHorizonErrors] = useState<Set<string>>(new Set());

  // 5c: Staleness banner state
  const [freshness, setFreshness] = useState<DataFreshnessResponse | null>(null);
  const [staleDismissed, setStaleDismissed] = useState(false);

  // 5c: Fetch data freshness on mount
  useEffect(() => {
    dataHubApi.getFreshness()
      .then(data => setFreshness(data))
      .catch(() => {});
  }, []);

  // 5c: Compute stale items
  const staleItems = useMemo(() => {
    if (!freshness) return [];
    const items: { type: string; label: string; daysAgo: number | null; critical: boolean }[] = [];
    const thresholds: Record<string, { label: string; warn: number; critical: number }> = {
      sales: { label: 'Ventas', warn: 7, critical: 14 },
      inventory: { label: 'Inventario', warn: 3, critical: 7 },
      siesa: { label: 'SIESA', warn: 3, critical: 7 },
      in_transit: { label: 'En tránsito', warn: 7, critical: 14 },
    };
    const now = Date.now();
    for (const [key, config] of Object.entries(thresholds)) {
      const d = freshness[key as keyof typeof freshness];
      if (!d?.last_updated) {
        items.push({ type: key, label: config.label, daysAgo: null, critical: true });
        continue;
      }
      const daysAgo = Math.floor((now - new Date(d.last_updated).getTime()) / 86400000);
      if (daysAgo >= config.warn) {
        items.push({ type: key, label: config.label, daysAgo, critical: daysAgo >= config.critical });
      }
    }
    return items;
  }, [freshness]);
  const hasCritical = staleItems.some(i => i.critical);

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
      // DEBUG: trace stability data from Planning API
      console.log('[PV DEBUG] Factory:', result.factory_name, 'Boats:', result.projections?.length);
      for (const p of result.projections ?? []) {
        const si = p.stability_impact;
        if (si) {
          console.log(`[PV DEBUG] ${p.boat_name}: recovering=${si.recovering_count}, blocked=${si.blocked_count}, stabilizes=${si.stabilizes_count}, progress=${si.progress_before_pct}->${si.progress_after_pct}`);
        }
      }
      setHorizons((prev) => {
        const next = new Map(prev);
        next.set(factoryId, result);
        return next;
      });
      setHorizonErrors((prev) => { const next = new Set(prev); next.delete(factoryId); return next; });
    } catch (err) {
      console.error(`Failed to load horizon for factory ${factoryId}:`, err);
      setHorizonErrors((prev) => new Set(prev).add(factoryId));
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

  const handleBoatClick = (factoryId: string, _boatId: string) => {
    setSelectedFactoryId(factoryId);
  };

  // Materialize an estimated boat into a real DB record, returns the real boat ID
  const materializeEstimatedBoat = async (projection: BoatProjection): Promise<string> => {
    const dep = new Date(projection.departure_date);
    const arr = new Date(projection.arrival_date);
    const transitDays = Math.max(1, Math.round((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));

    const realBoat = await boatsApi.create({
      vessel_name: projection.boat_name.replace(/\s*\(est\.\)\s*$/, ''),
      shipping_line: projection.carrier || undefined,
      departure_date: projection.departure_date,
      arrival_date: projection.arrival_date,
      transit_days: transitDays,
      origin_port: projection.origin_port,
      carrier: projection.carrier || undefined,
    });
    return realBoat.id;
  };

  const findProjection = (boatId: string): BoatProjection | undefined => {
    const horizon = selectedFactoryId ? horizons.get(selectedFactoryId) : null;
    return horizon?.projections.find((p) => p.boat_id === boatId);
  };

  const handleDrillIn = async (boatId: string) => {
    if (!selectedFactoryId) return;

    const projection = findProjection(boatId);
    if (projection?.is_estimated) {
      try {
        const realId = await materializeEstimatedBoat(projection);
        navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${realId}`);
      } catch (err) {
        console.error('Failed to create estimated boat:', err);
        showNotification('error', 'Error al cargar detalles. Intenta de nuevo.');
      }
    } else {
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${boatId}`);
    }
  };

  const handleExportFromCard = async (boatId: string) => {
    if (!selectedFactoryId) return;

    const projection = findProjection(boatId);
    if (projection?.is_estimated) {
      try {
        const realId = await materializeEstimatedBoat(projection);
        navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${realId}&action=export`);
      } catch (err) {
        console.error('Failed to create estimated boat:', err);
        showNotification('error', 'Error al preparar exportación. Intenta de nuevo.');
      }
    } else {
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${boatId}&action=export`);
    }
  };

  const handlePreview = (boatId: string) => {
    const horizon = selectedFactoryId ? horizons.get(selectedFactoryId) : null;
    const projection = horizon?.projections.find((p) => p.boat_id === boatId);
    if (projection) setPreviewBoat(projection);
  };

  const handleQuickAccept = async (projection: BoatProjection) => {
    if (!selectedFactoryId || acceptingBoatId) return;

    // Idempotency: if a draft already exists, just navigate (4h)
    if (projection.draft_id) {
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${projection.boat_id}`);
      return;
    }

    setAcceptingBoatId(projection.boat_id);
    let materialized = false;
    try {
      // Materialize estimated boats before saving draft (FK constraint)
      let boatId = projection.boat_id;
      if (projection.is_estimated) {
        boatId = await materializeEstimatedBoat(projection);
        materialized = true;
      }

      const items = projection.product_details
        .filter((p) => p.suggested_pallets > 0)
        .map((p) => ({
          product_id: p.product_id,
          selected_pallets: p.suggested_pallets,
        }));

      await draftsApi.save({
        boat_id: boatId,
        factory_id: selectedFactoryId,
        notes: 'Creado desde aceptar sugerido',
        items,
      });

      showNotification('success', 'Borrador creado exitosamente');
      // Navigate to Order Builder detail for BL allocation
      navigate(`/order-builder?factory_id=${selectedFactoryId}&boat_id=${boatId}`);
    } catch (err) {
      console.error('Quick accept failed:', err);
      if (materialized) {
        showNotification('error', 'Barco creado pero error al guardar borrador. Ve a Order Builder para completar.');
      } else {
        showNotification('error', 'Error al aceptar sugerido. Intenta de nuevo.');
      }
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

    action.sort((a, b) => (a.days_until_siesa_deadline ?? a.days_until_order_deadline ?? 999) - (b.days_until_siesa_deadline ?? b.days_until_order_deadline ?? 999));

    return {
      actionBoats: action,
      completedBoats: completed,
      healthStats: { totalCritical, totalUrgent, totalSoon, totalOk, totalProducts },
    };
  }, [selectedHorizon]);

  // Full-page loading
  if (factoriesLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (factoriesError) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
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
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            {t('planning.title', 'Tus Pedidos Preparados')}
          </h1>
          <span className="text-xs text-slate-600">
            {t('planning.horizon', 'proximos 3 meses')}
          </span>
        </div>

        {/* 5c: Staleness warning banner */}
        {staleItems.length > 0 && !staleDismissed && (
          <div className={`px-4 py-2 rounded-lg border text-sm flex items-center justify-between ${
            hasCritical ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {staleItems.map(item => (
                <span key={item.type}>
                  {item.label}: {item.daysAgo === null ? t('common.noData', 'Sin datos') : t('common.daysAgoLabel', 'hace {{count}} días', { count: item.daysAgo })}
                </span>
              ))}
            </div>
            <button onClick={() => setStaleDismissed(true)} className="ml-3 text-slate-500 hover:text-slate-300 flex-shrink-0">{'\u2715'}</button>
          </div>
        )}

        {/* Briefing for selected factory */}
        <Briefing
          horizon={selectedHorizon ?? null}
          loading={selectedFactoryId != null && horizonLoading.has(selectedFactoryId)}
        />

        {/* Factory Order Signal */}
        {selectedHorizon?.factory_order_signal && (
          <FactoryOrderSignalCard signal={selectedHorizon.factory_order_signal} lang={i18n.language} />
        )}

        {/* Inline notification (4a) */}
        {notification && (
          <div className={`mx-4 mt-2 px-4 py-2 rounded-lg text-sm flex items-center justify-between ${
            notification.type === 'error'
              ? 'bg-red-500/10 border border-red-500/30 text-red-300'
              : 'bg-green-500/10 border border-green-500/30 text-green-300'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 text-xs opacity-70 hover:opacity-100">{'\u2715'}</button>
          </div>
        )}

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
              onDirectAccess={() => navigate(`/order-builder?factory_id=${factory.id}`)}
            />
          ))}
        </div>

        {/* Horizon fetch error state (4d) */}
        {selectedFactoryId && horizonErrors.has(selectedFactoryId) && !horizonLoading.has(selectedFactoryId) && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-4xl mb-4">{'\u26A0\uFE0F'}</span>
            <p className="text-lg font-medium text-slate-300 mb-2">Error al cargar datos</p>
            <p className="text-sm text-slate-500 mb-4">Verifica tu conexión e intenta de nuevo.</p>
            <button
              onClick={() => selectedFactoryId && fetchHorizon(selectedFactoryId)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Detail view for selected factory */}
        {selectedFactoryId && selectedHorizon && !horizonErrors.has(selectedFactoryId) && (
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
                    <span className="text-slate-600">{healthStats.totalProducts} {t('planning.prod')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Focal boat timeline */}
            {actionBoats.length > 0 && (
              <FactoryTimeline timeline={buildTimeline(actionBoats[Math.min(focalBoatIdx, actionBoats.length - 1)])} />
            )}

            {/* Action-needed boats */}
            {actionBoats.length > 0 && (() => {
              const realAction = actionBoats.filter((p) => !p.is_estimated);
              const estimatedAction = actionBoats.filter((p) => p.is_estimated);
              const visibleEstimated = showAllEstimated ? estimatedAction : estimatedAction.slice(0, 3);
              const hiddenEstimatedCount = estimatedAction.length - visibleEstimated.length;
              const visibleAction = [...realAction, ...visibleEstimated].sort(
                (a, b) => (a.days_until_siesa_deadline ?? a.days_until_order_deadline ?? 999) - (b.days_until_siesa_deadline ?? b.days_until_order_deadline ?? 999)
              );

              return (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {t('planning.actionNeeded', 'Requiere accion')} ({visibleAction.length}{hiddenEstimatedCount > 0 ? `+${hiddenEstimatedCount}` : ''})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {visibleAction.map((projection, idx) => (
                      <BoatCard
                        key={projection.boat_id}
                        projection={projection}
                        onDrillIn={handleDrillIn}
                        onPreview={handlePreview}
                        onQuickAccept={handleQuickAccept}
                        onExport={handleExportFromCard}
                        isAccepting={acceptingBoatId === projection.boat_id}
                        isSelected={idx === Math.min(focalBoatIdx, visibleAction.length - 1)}
                        onSelect={() => setFocalBoatIdx(idx)}
                      />
                    ))}
                  </div>
                  {hiddenEstimatedCount > 0 && (
                    <button
                      onClick={() => setShowAllEstimated(true)}
                      className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-300 border border-dashed border-slate-700/50 hover:border-slate-600/50 rounded-xl transition-colors"
                    >
                      {t('planning.estimatedBoatsMore', { count: hiddenEstimatedCount })}
                    </button>
                  )}
                  {showAllEstimated && estimatedAction.length > 3 && (
                    <button
                      onClick={() => setShowAllEstimated(false)}
                      className="w-full py-2 text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      {t('planning.showLess')}
                    </button>
                  )}
                </div>
              );
            })()}

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
                      onExport={handleExportFromCard}
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

      {/* Pipeline strip at bottom */}
      <PipelineStrip horizon={selectedHorizon ?? null} />

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
