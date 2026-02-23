import { useTranslation } from 'react-i18next';

interface BreadcrumbProps {
  currentView: string;
  filterLabel?: string;
  onBack: () => void;
}

// Country names for display
const countryNames: Record<string, string> = {
  GT: 'Guatemala',
  HN: 'Honduras',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  CR: 'Costa Rica',
  PA: 'Panamá',
  CO: 'Colombia',
};

export function Breadcrumb({ currentView, filterLabel, onBack }: BreadcrumbProps) {
  const { t } = useTranslation();

  const getBackLabel = () => {
    switch (currentView) {
      case 'customers':
        return t('intelligence.breadcrumb.backToRegion');
      case 'products':
        return t('intelligence.breadcrumb.backToRegion');
      default:
        return t('intelligence.breadcrumb.backToRegion');
    }
  };

  const getCurrentLabel = () => {
    if (filterLabel) {
      if (countryNames[filterLabel]) return countryNames[filterLabel];
      const statusKey = filterLabel.toLowerCase();
      if (statusKey === 'active') return t('intelligence.breadcrumb.active', 'Activos');
      if (statusKey === 'cooling') return t('intelligence.breadcrumb.cooling', 'Enfriándose');
      if (statusKey === 'dormant') return t('intelligence.breadcrumb.dormant', 'Dormidos');
      return filterLabel;
    }
    return null;
  };

  const currentLabel = getCurrentLabel();

  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>{getBackLabel()}</span>
      </button>
      {currentLabel && (
        <>
          <span className="text-slate-600">/</span>
          <span className="text-white font-medium">{currentLabel}</span>
        </>
      )}
    </div>
  );
}
