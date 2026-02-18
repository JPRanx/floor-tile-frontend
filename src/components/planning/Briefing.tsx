import type { PlanningHorizonResponse } from '../../requests/planning';

interface BriefingProps {
  horizons: Map<string, PlanningHorizonResponse>;
}

export function Briefing({ horizons }: BriefingProps) {
  if (horizons.size === 0) return null;

  let totalBoats = 0;
  let overdueBoats = 0;
  let thisWeekBoats = 0;
  let totalCritical = 0;
  let completedBoats = 0;
  let nextDeadlineDays = Infinity;

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
        if (p.days_until_order_deadline < nextDeadlineDays) {
          nextDeadlineDays = p.days_until_order_deadline;
        }
      }
    }
  }

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
    <p className={`text-sm font-medium ${toneStyles[tone]}`}>
      {sentence}
    </p>
  );
}
