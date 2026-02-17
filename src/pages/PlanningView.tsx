import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { factoriesApi } from '../requests/factories';
import type { Factory } from '../requests/factories';
import { planningApi } from '../requests/planning';
import type { PlanningHorizonResponse, BoatProjection } from '../requests/planning';
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

  // Fetch active factories on mount
  useEffect(() => {
    const fetchFactories = async () => {
      try {
        setFactoriesError(null);
        const result = await factoriesApi.getAll();
        setFactories(result);
        // Default to first active factory
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

  const selectedFactory = factories.find((f) => f.id === selectedFactoryId);

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

  return (
    <div className="min-h-screen bg-slate-950 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
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

        {/* Boat cards grid */}
        {!horizonLoading && !horizonError && horizon && horizon.projections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {horizon.projections.map((projection) => (
              <BoatCard
                key={projection.boat_id}
                projection={projection}
                onDrillIn={handleDrillIn}
                onPreview={handlePreview}
              />
            ))}
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
