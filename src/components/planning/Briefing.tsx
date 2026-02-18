import type { BoatProjection, PlanningHorizonResponse } from '../../requests/planning';

interface BriefingProps {
  horizons: Map<string, PlanningHorizonResponse>;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${day} ${months[d.getMonth()]}`;
}

interface FactoryOrderLine {
  boatName: string;
  departureDate: string;
  orderByDate: string;
  daysLeft: number;
  productCount: number;
  isEstimated: boolean;
}

export function Briefing({ horizons }: BriefingProps) {
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
  const visibleLines = factoryOrderLines.slice(0, 4);

  const actionBoats = totalBoats - completedBoats;

  // Build the briefing sentence
  let sentence: string;
  let tone: 'calm' | 'warning' | 'urgent';

  if (totalBoats === 0) {
    sentence = 'Sin barcos programados en el horizonte.';
    tone = 'calm';
  } else if (actionBoats === 0) {
    sentence = `Todos los pedidos colocados. ${totalBoats} envio${totalBoats > 1 ? 's' : ''} en camino.`;
    tone = 'calm';
  } else if (overdueBoats > 0) {
    const criticalNote = totalCritical > 0 ? ` ${totalCritical} producto${totalCritical > 1 ? 's' : ''} critico${totalCritical > 1 ? 's' : ''}.` : '';
    sentence = `${overdueBoats} pedido${overdueBoats > 1 ? 's' : ''} vencido${overdueBoats > 1 ? 's' : ''}.${criticalNote}`;
    tone = 'urgent';
  } else if (thisWeekBoats > 0) {
    const criticalNote = totalCritical > 0 ? ` ${totalCritical} producto${totalCritical > 1 ? 's' : ''} critico${totalCritical > 1 ? 's' : ''}.` : '';
    sentence = `${thisWeekBoats} barco${thisWeekBoats > 1 ? 's' : ''} necesita${thisWeekBoats > 1 ? 'n' : ''} pedido esta semana.${criticalNote}`;
    tone = 'warning';
  } else if (totalCritical > 0) {
    sentence = `${actionBoats} barco${actionBoats > 1 ? 's' : ''} por revisar. ${totalCritical} producto${totalCritical > 1 ? 's' : ''} critico${totalCritical > 1 ? 's' : ''}.`;
    tone = 'warning';
  } else {
    sentence = `Todo bajo control. ${actionBoats} envio${actionBoats > 1 ? 's' : ''} preparado${actionBoats > 1 ? 's' : ''} para los proximos 3 meses.`;
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

      {/* Factory order summary */}
      {visibleLines.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Pedidos a fabrica
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            {visibleLines.map((line) => (
              <span key={line.departureDate} className="text-xs text-slate-400">
                <span className={line.daysLeft < 0 ? 'text-red-400 font-medium' : line.daysLeft <= 7 ? 'text-orange-400 font-medium' : ''}>
                  {line.productCount} prod.
                </span>
                {' para '}
                <span className="text-slate-300">{line.boatName}</span>
                {' '}
                <span className="text-slate-500">
                  ({formatDateShort(line.departureDate)})
                </span>
                {' — '}
                <span className={line.daysLeft < 0 ? 'text-red-400' : line.daysLeft <= 3 ? 'text-red-300' : line.daysLeft <= 7 ? 'text-orange-300' : 'text-slate-500'}>
                  {line.daysLeft < 0
                    ? `vencido ${Math.abs(line.daysLeft)}d`
                    : line.daysLeft <= 3
                      ? 'pedir ahora'
                      : `en ${line.daysLeft}d`}
                </span>
              </span>
            ))}
            {factoryOrderLines.length > visibleLines.length && (
              <span className="text-xs text-slate-600">
                +{factoryOrderLines.length - visibleLines.length} mas
              </span>
            )}
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
