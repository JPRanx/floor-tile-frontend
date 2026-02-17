import { useTranslation } from 'react-i18next';
import type { Factory } from '../../requests/factories';

interface FactoryPillsProps {
  factories: Factory[];
  selectedFactoryId: string | null;
  onSelect: (factoryId: string) => void;
}

export function FactoryPills({ factories, selectedFactoryId, onSelect }: FactoryPillsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {factories.map((factory) => {
        const isSelected = factory.id === selectedFactoryId;
        const isActive = factory.active;

        const pill = (
          <button
            onClick={() => isActive && onSelect(factory.id)}
            disabled={!isActive}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${isSelected
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : isActive
                  ? 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white'
                  : 'bg-gradient-to-r from-slate-800/20 via-slate-700/10 to-slate-800/20 text-slate-600 border border-slate-800/30 cursor-not-allowed bg-[length:8px_8px]'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {factory.name}
              {!isActive && (
                <svg
                  className="w-3 h-3 text-slate-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        );

        if (!isActive) {
          return (
            <div key={factory.id} className="relative group">
              {pill}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {t('planning.comingSoonTooltip', 'Próximamente — Esta fábrica aún no está activa en el sistema')}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            </div>
          );
        }

        return (
          <div key={factory.id}>
            {pill}
          </div>
        );
      })}
    </div>
  );
}
