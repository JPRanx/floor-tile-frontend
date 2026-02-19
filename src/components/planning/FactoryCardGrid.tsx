import type { Factory } from '../../requests/factories';
import type { PlanningHorizonResponse } from '../../requests/planning';

interface FactoryCardGridProps {
  factories: Factory[];
  horizons: Map<string, PlanningHorizonResponse>;
  horizonLoading: Set<string>;
  selectedFactoryId: string | null;
  onSelectFactory: (factoryId: string) => void;
}

interface FactoryCardProps {
  factory: Factory;
  horizon: PlanningHorizonResponse | null;
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function getUrgencyColor(days: number): string {
  if (days <= 0) return 'text-red-400';
  if (days <= 7) return 'text-amber-400';
  return 'text-emerald-400';
}

function getUrgencyDot(days: number): string {
  if (days <= 0) return 'bg-red-400';
  if (days <= 7) return 'bg-amber-400';
  return 'bg-emerald-400';
}

function FactoryCard({ factory, horizon, isSelected, isLoading, onClick }: FactoryCardProps) {
  if (!factory.active) {
    return (
      <div className="bg-slate-800/20 rounded-xl border border-slate-700/20 px-4 py-3 opacity-50 cursor-not-allowed">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{'\u{1F512}'}</span>
          <span className="text-slate-400 font-semibold text-sm">{factory.name}</span>
        </div>
        <span className="text-slate-600 text-xs">pr{'\u00F3'}ximamente</span>
      </div>
    );
  }

  const boatCount = horizon?.projections.length ?? 0;

  // Find most urgent boat (non-completed)
  let mostUrgentName: string | null = null;
  let mostUrgentDays: number | null = null;

  if (horizon) {
    for (const p of horizon.projections) {
      if (p.draft_status === 'ordered' || p.draft_status === 'confirmed') continue;
      const days = p.days_until_siesa_deadline ?? p.days_until_order_deadline;
      if (days != null && (mostUrgentDays == null || days < mostUrgentDays)) {
        mostUrgentDays = days;
        mostUrgentName = p.boat_name;
      }
    }
  }

  return (
    <button
      onClick={onClick}
      className={`
        text-left rounded-xl border px-4 py-3 transition-all duration-200
        hover:bg-slate-800/50 hover:border-slate-600/60
        ${isSelected
          ? 'bg-slate-800/50 border-indigo-500/50 ring-2 ring-indigo-500/30'
          : 'bg-slate-800/30 border-slate-700/40'}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{'\u{1F3ED}'}</span>
        <span className="text-white font-semibold text-sm">{factory.name}</span>
      </div>

      {isLoading ? (
        <span className="text-slate-500 text-xs animate-pulse">Cargando...</span>
      ) : (
        <div className="space-y-0.5">
          <div className="text-slate-400 text-xs">
            {boatCount} {boatCount === 1 ? 'barco' : 'barcos'}
          </div>
          {mostUrgentName != null && mostUrgentDays != null && (
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getUrgencyDot(mostUrgentDays)}`} />
              <span className={`text-xs truncate ${getUrgencyColor(mostUrgentDays)}`}>
                {mostUrgentName} {mostUrgentDays < 0 ? `${Math.abs(mostUrgentDays)}d vencido` : `${mostUrgentDays}d`}
              </span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}

export function FactoryCardGrid({
  factories,
  horizons,
  horizonLoading,
  selectedFactoryId,
  onSelectFactory,
}: FactoryCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {factories.map((factory) => (
        <FactoryCard
          key={factory.id}
          factory={factory}
          horizon={horizons.get(factory.id) ?? null}
          isSelected={selectedFactoryId === factory.id}
          isLoading={horizonLoading.has(factory.id)}
          onClick={() => {
            if (factory.active) onSelectFactory(factory.id);
          }}
        />
      ))}
    </div>
  );
}
