import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { CountryTrend } from '../../requests/intelligence';
import { Sparkline } from './Sparkline';
import { ConfidenceBadge } from './ConfidenceBadge';
import { TrendArrow } from './TrendArrow';
import { generateCountryBrief } from '../../utils/briefGenerator';

interface CountryCardProps {
  country: CountryTrend;
  index: number;
  onClick?: (countryCode: string) => void;
}

// Country flag emojis
const countryFlags: Record<string, string> = {
  GT: '🇬🇹',
  HN: '🇭🇳',
  SV: '🇸🇻',
  NI: '🇳🇮',
  CR: '🇨🇷',
  PA: '🇵🇦',
  CO: '🇨🇴',
  MX: '🇲🇽',
  OTHER: '🌎',
};

// Glow colors based on trend
function getGlowClass(direction: CountryTrend['trend_direction']): string {
  switch (direction) {
    case 'UP':
      return 'hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]';
    case 'DOWN':
      return 'hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]';
    default:
      return 'hover:shadow-[0_0_30px_rgba(245,158,11,0.2)]';
  }
}

function getSparklineColor(direction: CountryTrend['trend_direction']): 'emerald' | 'rose' | 'amber' {
  switch (direction) {
    case 'UP':
      return 'emerald';
    case 'DOWN':
      return 'rose';
    default:
      return 'amber';
  }
}

// Recommendation badge colors (compact)
const recommendationColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-300',
  action: 'bg-amber-500/20 text-amber-300',
  monitor: 'bg-blue-500/20 text-blue-300',
  maintain: 'bg-emerald-500/20 text-emerald-300',
};

export function CountryCard({ country, index, onClick }: CountryCardProps) {
  const { t } = useTranslation();
  const flag = countryFlags[country.country_code] || countryFlags.OTHER;
  const glowClass = getGlowClass(country.trend_direction);
  const sparklineColor = getSparklineColor(country.trend_direction);

  // Generate brief
  const brief = useMemo(() => generateCountryBrief(country), [country]);

  const handleClick = () => {
    if (onClick) {
      onClick(country.country_code);
    }
  };

  // Format revenue
  const formatRevenue = (value: number) => {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  // Format m²
  const formatM2 = (value: number) => {
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K m²`;
    return `${value.toLocaleString()} m²`;
  };

  return (
    <div
      onClick={handleClick}
      className={`
        bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5
        transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1
        ${glowClass}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Header: Flag + Name + Trend */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{flag}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{country.country_name}</h3>
            <p className="text-slate-400 text-sm">
              {country.customer_count} {t('intelligence.countryCard.customers', 'clientes')}
            </p>
          </div>
        </div>
        <TrendArrow
          direction={country.trend_direction}
          strength={country.trend_strength}
          changePct={country.velocity_change_pct}
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{t('intelligence.countryCard.revenue', 'Ingresos')}</p>
          <p className="text-emerald-400 font-bold text-xl">
            {formatRevenue(country.total_revenue_usd)}
          </p>
          <p className="text-slate-500 text-xs">
            {t('intelligence.countryCard.ofTotal', '{{pct}}% del total', { pct: country.pct_of_total_revenue.toFixed(1) })}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">{t('intelligence.countryCard.volume', 'Volumen')}</p>
          <p className="text-indigo-400 font-bold text-xl">
            {formatM2(country.total_m2)}
          </p>
          <p className="text-slate-500 text-xs">
            {t('intelligence.countryCard.weeklyVolume', '~{{amount}}/sem', { amount: formatM2(country.avg_weekly_m2) })}
          </p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mb-4">
        <Sparkline data={country.sparkline} color={sparklineColor} height={50} />
      </div>

      {/* Brief Recommendation */}
      <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ${recommendationColors[brief.recommendationType]}`}>
        {brief.recommendation}
      </div>

      {/* Footer: Top Customers + Confidence */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <div className="flex-1 min-w-0">
          {country.top_customers.length > 0 && (
            <p className="text-slate-500 text-xs truncate">
              {t('intelligence.countryCard.topPrefix', 'Top:')} {country.top_customers.slice(0, 2).join(', ')}
            </p>
          )}
        </div>
        <ConfidenceBadge level={country.confidence} />
      </div>
    </div>
  );
}
