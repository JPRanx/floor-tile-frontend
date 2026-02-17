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

        return (
          <button
            key={factory.id}
            onClick={() => isActive && onSelect(factory.id)}
            disabled={!isActive}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
              ${isSelected
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : isActive
                  ? 'bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white'
                  : 'bg-slate-800/20 text-slate-600 border border-slate-800/30 cursor-not-allowed'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {factory.name}
              {!isActive && (
                <span className="text-xs text-slate-600">
                  {t('planning.comingSoon', 'Próximamente')}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
