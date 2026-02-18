import { useTranslation } from 'react-i18next';
import type { BoatProjection, PlanningHorizonResponse } from '../../requests/planning';

interface BriefingProps {
  horizons: Map<string, PlanningHorizonResponse>;
}

interface FactoryOrderLine {
  boatName: string;
  departureDate: string;
  orderByDate: string;
  daysLeft: number;
  productCount: number;
  isEstimated: boolean;
}

interface MonthGroup {
  monthKey: string; // "2026-03"
  boatCount: number;
  totalProducts: number;
  mostUrgentDays: number;
  boatNames: string[];
}

export function Briefing({ horizons }: BriefingProps) {
  const { t, i18n } = useTranslation();
  if (horizons.size === 0) return null;

  let totalBoats = 0;
  let overdueBoats = 0;
  let thisWeekBoats = 0;
  let totalCritical = 0;
  let completedBoats = 0;

  // Collect boats that need factory orders (non-completed, with products needing action)
  const factoryOrderLines: FactoryOrderLine[] = [];

  for (const horizon of horizons.values()) {
    for (const p of horizon.projections) {
      totalBoats++;
      const isCompleted = p.draft_status === 'ordered' || p.draft_status === 'confirmed';
      if (isCompleted) {
        completedBoats++;
        continue;
      }
      totalCritical += p.urgency_breakdown.critical;
      if (p.days_until_order_deadline != null) {
        if (p.days_until_order_deadline < 0) overdueBoats++;
        else if (p.days_until_order_deadline <= 7) thisWeekBoats++;
      }

      // Count products that need ordering (critical + urgent)
      const needsOrderCount = countProductsNeedingOrder(p);
      if (needsOrderCount > 0 && p.order_by_date && p.days_until_order_deadline != null) {
        factoryOrderLines.push({
          boatName: p.boat_name,
          departureDate: p.departure_date,
          orderByDate: p.order_by_date,
          daysLeft: p.days_until_order_deadline,
          productCount: needsOrderCount,
          isEstimated: p.is_estimated,
        });
      }
    }
  }

  // Sort by boat departure (next boat first)
  factoryOrderLines.sort((a, b) => a.departureDate.localeCompare(b.departureDate));

  // Group by departure month (factory orders are monthly)
  const monthGroups: MonthGroup[] = [];
  const monthMap = new Map<string, MonthGroup>();
  for (const line of factoryOrderLines) {
    const monthKey = line.departureDate.slice(0, 7); // "2026-03"
    let group = monthMap.get(monthKey);
    if (!group) {
      group = { monthKey, boatCount: 0, totalProducts: 0, mostUrgentDays: Infinity, boatNames: [] };
      monthMap.set(monthKey, group);
      monthGroups.push(group);
    }
    group.boatCount++;
    group.totalProducts += line.productCount;
    group.mostUrgentDays = Math.min(group.mostUrgentDays, line.daysLeft);
    group.boatNames.push(line.boatName);
  }

  const actionBoats = totalBoats - completedBoats;

  // Build the briefing sentence
  let sentence: string;
  let tone: 'calm' | 'warning' | 'urgent';

  if (totalBoats === 0) {
    sentence = t('planning.briefing.noBoats');
    tone = 'calm';
  } else if (actionBoats === 0) {
    sentence = t('planning.briefing.allDone', { count: totalBoats });
    tone = 'calm';
  } else if (overdueBoats > 0) {
    const criticalNote = totalCritical > 0 ? ` ${t('planning.briefing.criticalProducts', { count: totalCritical })}` : '';
    sentence = `${t('planning.briefing.overdue', { count: overdueBoats })}${criticalNote}`;
    tone = 'urgent';
  } else if (thisWeekBoats > 0) {
    const criticalNote = totalCritical > 0 ? ` ${t('planning.briefing.criticalProducts', { count: totalCritical })}` : '';
    sentence = `${t('planning.briefing.thisWeek', { count: thisWeekBoats })}${criticalNote}`;
    tone = 'warning';
  } else if (totalCritical > 0) {
    sentence = `${t('planning.briefing.toReview', { count: actionBoats })} ${t('planning.briefing.criticalProducts', { count: totalCritical })}`;
    tone = 'warning';
  } else {
    sentence = t('planning.briefing.allClear', { count: actionBoats });
    tone = 'calm';
  }

  const toneStyles = {
    calm: 'text-emerald-300/80',
    warning: 'text-amber-300/80',
    urgent: 'text-red-300/80',
  };

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${toneStyles[tone]}`}>
        {sentence}
      </p>

      {/* Factory order summary — grouped by month */}
      {monthGroups.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            {t('planning.briefing.factoryOrders')}
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {monthGroups.map((group) => {
              const monthDate = new Date(group.monthKey + '-01T00:00:00');
              const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(monthDate);
              const days = group.mostUrgentDays;
              return (
                <span key={group.monthKey} className="text-xs text-slate-400">
                  <span className="text-slate-300 font-medium capitalize">{monthLabel}:</span>
                  {' '}
                  <span className={days < 0 ? 'text-red-400 font-medium' : days <= 7 ? 'text-orange-400 font-medium' : ''}>
                    {t('planning.briefing.monthSummary', {
                      products: group.totalProducts,
                      boats: group.boatCount,
                      defaultValue: '{{products}} prod. across {{boats}} boats',
                    })}
                  </span>
                  {' — '}
                  <span className={days < 0 ? 'text-red-400' : days <= 3 ? 'text-red-300' : days <= 7 ? 'text-orange-300' : 'text-slate-500'}>
                    {days < 0
                      ? t('planning.briefing.overdueShort', { days: Math.abs(days) })
                      : days <= 3
                        ? t('planning.briefing.orderNow')
                        : t('planning.briefing.inDays', { days })}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function countProductsNeedingOrder(projection: BoatProjection): number {
  // Match factory request logic: any product with projected stockout (suggested_pallets > 0)
  return projection.product_details.filter(
    (p) => p.suggested_pallets > 0
  ).length;
}
