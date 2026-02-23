/**
 * Smart Brief Generator
 * Template-based insights for products, customers, and countries.
 * Zero API cost, instant response.
 */

import type { ProductTrend, CustomerTrend, CountryTrend } from '../requests/intelligence';
import i18next from 'i18next';

// ============================================================
// TYPES
// ============================================================

export interface BriefPart {
  text: string;
  type: 'normal' | 'warning' | 'critical' | 'positive';
}

export interface Brief {
  parts: BriefPart[];
  recommendation: string;
  recommendationType: 'urgent' | 'action' | 'monitor' | 'maintain';
}

// ============================================================
// PRODUCT BRIEF
// ============================================================

export function generateProductBrief(product: ProductTrend): Brief {
  const parts: BriefPart[] = [];

  // 1. OPENING LINE — What's happening
  parts.push(getProductOpeningLine(product));

  // 2. VELOCITY CONTEXT
  parts.push(getVelocityLine(product));

  // 3. STOCK SITUATION
  parts.push(getStockLine(product));

  // 4. CONFIDENCE CAVEAT (if needed)
  const confidenceLine = getConfidenceLine(product);
  if (confidenceLine) parts.push(confidenceLine);

  // 5. DANGEROUS COMBINATIONS (if any)
  const dangerLine = getProductDangerLine(product);
  if (dangerLine) parts.push(dangerLine);

  // 6. RECOMMENDATION
  const recommendation = getProductRecommendation(product);

  return { parts, ...recommendation };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Format volume context for extreme changes (>100%)
 * Shows: "(X → Y m²)" where X is previous and Y is current
 */
function formatVolumeContext(currentVelocity: number, changePct: number): string {
  if (Math.abs(changePct) <= 100 || !currentVelocity) return '';

  // Calculate previous: current = previous * (1 + change/100)
  // So: previous = current / (1 + change/100)
  const multiplier = 1 + (changePct / 100);
  const previous = multiplier !== 0 ? currentVelocity / multiplier : 0;

  // Use weekly volumes for more meaningful numbers
  const prevWeekly = Math.round(previous * 7);
  const currWeekly = Math.round(currentVelocity * 7);

  return ' ' + i18next.t('brief.product.volumeContext', '({{prev}} → {{curr}} m\u00B2/sem)', { prev: prevWeekly, curr: currWeekly });
}

/**
 * Format revenue context for extreme customer changes (>100%)
 * Shows: "($XK → $YK)" where X is previous and Y is current revenue
 */
function formatRevenueContext(currentRevenue: number, changePct: number): string {
  if (Math.abs(changePct) <= 100 || !currentRevenue) return '';

  const multiplier = 1 + (changePct / 100);
  const previous = multiplier !== 0 ? currentRevenue / multiplier : 0;

  const formatK = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${Math.round(v)}`;

  return ' ' + i18next.t('brief.customer.revenueContext', '({{prev}} → {{curr}})', { prev: formatK(previous), curr: formatK(currentRevenue) });
}

// ============================================================
// PRODUCT OPENING LINES
// ============================================================

function getProductOpeningLine(p: ProductTrend): BriefPart {
  const name = `**${p.sku}**`;
  const change = Math.abs(p.velocity_change_pct);
  const hasHistory = p.sample_weeks >= 4;
  const velocity = p.daily_velocity_m2;
  const volumeCtx = formatVolumeContext(velocity, p.velocity_change_pct);

  // Extreme percentage from low baseline
  if (p.velocity_change_pct > 500 && !hasHistory) {
    return {
      text: i18next.t('brief.product.openingLowBaseline', '{{name}} muestra +{{change}}% \u2014 pero viene de base casi cero{{volumeCtx}}. No es crecimiento real, el producto "despert\u00F3".', { name, change: change.toFixed(0), volumeCtx }),
      type: 'normal'
    };
  }

  // Product died (no velocity but had history)
  if (velocity === 0 && hasHistory) {
    return {
      text: i18next.t('brief.product.openingDied', '{{name}} dej\u00F3 de venderse. \u00BFDescontinuado o problema de stock?', { name }),
      type: 'warning'
    };
  }

  // New product with low confidence
  if (!hasHistory && velocity > 0 && p.confidence === 'LOW') {
    return {
      text: i18next.t('brief.product.openingNew', '{{name}} es nuevo o reci\u00E9n empez\u00F3 a moverse.', { name }),
      type: 'normal'
    };
  }

  // Strong real growth
  if (p.velocity_change_pct > 25 && hasHistory && p.confidence !== 'LOW') {
    return {
      text: i18next.t('brief.product.openingStrongGrowth', '{{name}} est\u00E1 creciendo fuerte (+{{change}}%){{volumeCtx}} con demanda real.', { name, change: change.toFixed(0), volumeCtx }),
      type: 'positive'
    };
  }

  // Moderate growth
  if (p.velocity_change_pct >= 10 && p.velocity_change_pct <= 25) {
    return {
      text: i18next.t('brief.product.openingModerateGrowth', '{{name}} est\u00E1 creciendo moderadamente (+{{change}}%).', { name, change: change.toFixed(0) }),
      type: 'positive'
    };
  }

  // Severe decline
  if (p.velocity_change_pct < -50 && hasHistory) {
    return {
      text: i18next.t('brief.product.openingSevereDecline', '{{name}} cay\u00F3 fuerte (-{{change}}%){{volumeCtx}}. Revisar qu\u00E9 pas\u00F3.', { name, change: change.toFixed(0), volumeCtx }),
      type: 'warning'
    };
  }

  // Strong decline
  if (p.velocity_change_pct < -25) {
    return {
      text: i18next.t('brief.product.openingStrongDecline', '{{name}} est\u00E1 bajando significativamente (-{{change}}%){{volumeCtx}}.', { name, change: change.toFixed(0), volumeCtx }),
      type: 'warning'
    };
  }

  // Moderate decline
  if (p.velocity_change_pct < -10) {
    return {
      text: i18next.t('brief.product.openingModerateDecline', '{{name}} est\u00E1 bajando levemente (-{{change}}%).', { name, change: change.toFixed(0) }),
      type: 'normal'
    };
  }

  // Stable
  return {
    text: i18next.t('brief.product.openingStable', '{{name}} se mantiene estable.', { name }),
    type: 'normal'
  };
}

// ============================================================
// VELOCITY LINE
// ============================================================

function getVelocityLine(p: ProductTrend): BriefPart {
  if (!p.daily_velocity_m2 || p.daily_velocity_m2 === 0) {
    return { text: i18next.t('brief.product.noRecentSales', 'Sin ventas recientes.'), type: 'normal' };
  }
  return {
    text: i18next.t('brief.product.velocity', 'Vendes {{velocity}} m\u00B2/d\u00EDa.', { velocity: Number(p.daily_velocity_m2).toFixed(1) }),
    type: 'normal'
  };
}

// ============================================================
// STOCK LINES
// ============================================================

function getStockLine(p: ProductTrend): BriefPart {
  const days = p.days_of_stock;
  const stock = p.current_stock_m2;
  const velocity = p.daily_velocity_m2 || 0;

  // No inventory data
  if (stock === null || stock === undefined) {
    return {
      text: i18next.t('brief.product.noInventoryData', 'Sin datos de inventario.'),
      type: 'warning'
    };
  }

  // Has stock but no velocity (infinite days)
  if (stock > 0 && velocity === 0) {
    return {
      text: i18next.t('brief.product.stagnantStock', 'Tiene {{stock}} m\u00B2 en bodega pero sin ventas recientes. Stock estancado.', { stock: stock.toFixed(0) }),
      type: 'warning'
    };
  }

  // No stock but selling
  if (stock === 0 && velocity > 0) {
    return {
      text: i18next.t('brief.product.noStockSelling', '**Sin stock** y vendiendo {{velocity}} m\u00B2/d\u00EDa.', { velocity: velocity.toFixed(1) }),
      type: 'critical'
    };
  }

  // Critical
  if (days !== null && days < 7) {
    return {
      text: i18next.t('brief.product.stockCritical', '**CR\u00CDTICO: Solo {{days}} d\u00EDas de stock.** Pedir urgente.', { days: Math.round(days) }),
      type: 'critical'
    };
  }

  // Urgent
  if (days !== null && days < 14) {
    return {
      text: i18next.t('brief.product.stockUrgent', '**Solo {{days}} d\u00EDas de stock.** Incluir en pr\u00F3ximo pedido.', { days: Math.round(days) }),
      type: 'warning'
    };
  }

  // Low
  if (days !== null && days < 30) {
    return {
      text: i18next.t('brief.product.stockLow', 'Stock para {{days}} d\u00EDas \u2014 monitorear de cerca.', { days: Math.round(days) }),
      type: 'normal'
    };
  }

  // Very high
  if (days !== null && days > 90) {
    return {
      text: i18next.t('brief.product.stockVeryHigh', 'Stock muy alto ({{days}} d\u00EDas).', { days: Math.round(days) }),
      type: 'normal'
    };
  }

  // High
  if (days !== null && days > 60) {
    return {
      text: i18next.t('brief.product.stockHigh', 'Stock alto ({{days}} d\u00EDas). Verificar si es intencional.', { days: Math.round(days) }),
      type: 'normal'
    };
  }

  // Good
  return {
    text: i18next.t('brief.product.stockGood', 'Bien cubierto con {{days}} d\u00EDas de stock.', { days: Math.round(days!) }),
    type: 'positive'
  };
}

// ============================================================
// CONFIDENCE LINES (returns null if not needed)
// ============================================================

function getConfidenceLine(p: ProductTrend): BriefPart | null {
  const change = Math.abs(p.velocity_change_pct);
  const weeks = p.sample_weeks;

  // Low confidence with extreme change
  if (p.confidence === 'LOW' && change > 200) {
    return {
      text: i18next.t('brief.product.confidenceLowExtreme', 'El +{{change}}% parece impresionante pero con solo {{weeks}} semanas de datos, es ruido estad\u00EDstico.', { change: change.toFixed(0), weeks }),
      type: 'warning'
    };
  }

  // Low confidence general
  if (p.confidence === 'LOW') {
    return {
      text: i18next.t('brief.product.confidenceLow', 'Confianza BAJA (solo {{weeks}} semanas de datos). No actuar bas\u00E1ndose \u00FAnicamente en esta tendencia.', { weeks }),
      type: 'warning'
    };
  }

  // Medium confidence with extreme change
  if (p.confidence === 'MEDIUM' && change > 50) {
    return {
      text: i18next.t('brief.product.confidenceMedium', 'Confianza MEDIA \u2014 el cambio parece grande pero necesita m\u00E1s datos para confirmar.'),
      type: 'normal'
    };
  }

  // High confidence with erratic sales (high CV)
  if (p.cv && p.cv > 1.0) {
    return {
      text: i18next.t('brief.product.erraticSales', 'Ventas muy err\u00E1ticas \u2014 dif\u00EDcil predecir. Mantener stock de seguridad extra.'),
      type: 'warning'
    };
  }

  // High confidence, no caveat needed
  return null;
}

// ============================================================
// DANGEROUS COMBINATIONS
// ============================================================

function getProductDangerLine(p: ProductTrend): BriefPart | null {
  const days = p.days_of_stock;

  // Oversupply risk
  if (days && days > 60 && p.trend_direction === 'DOWN' && p.trend_strength !== 'WEAK') {
    return {
      text: i18next.t('brief.product.dangerOversupply', 'Stock alto + demanda bajando = riesgo de sobre-inventario.'),
      type: 'warning'
    };
  }

  // Stockout imminent
  if (days && days < 14 && p.trend_direction === 'UP') {
    return {
      text: i18next.t('brief.product.dangerStockout', 'Stock bajo + demanda subiendo = riesgo de quiebre.'),
      type: 'critical'
    };
  }

  return null;
}

// ============================================================
// PRODUCT RECOMMENDATIONS
// ============================================================

function getProductRecommendation(p: ProductTrend): { recommendation: string; recommendationType: 'urgent' | 'action' | 'monitor' | 'maintain' } {
  const days = p.days_of_stock;

  // Critical stock
  if (days !== null && days < 7) {
    return { recommendation: i18next.t('brief.product.recCritical', 'Pedir URGENTE.'), recommendationType: 'urgent' };
  }

  // Urgent stock
  if (days !== null && days < 14) {
    return { recommendation: i18next.t('brief.product.recUrgent', 'Incluir en pr\u00F3ximo pedido.'), recommendationType: 'action' };
  }

  // Low stock + trending up
  if (days !== null && days < 30 && p.trend_direction === 'UP') {
    return { recommendation: i18next.t('brief.product.recLowUp', 'Pedir pronto, demanda subiendo.'), recommendationType: 'action' };
  }

  // Low stock + trending down
  if (days !== null && days < 30 && p.trend_direction === 'DOWN') {
    return { recommendation: i18next.t('brief.product.recLowDown', 'Esperar, demanda bajando.'), recommendationType: 'monitor' };
  }

  // High stock + declining
  if (days !== null && days > 60 && p.trend_direction === 'DOWN') {
    return { recommendation: i18next.t('brief.product.recHighDown', 'No pedir m\u00E1s. Evaluar reducir precio.'), recommendationType: 'action' };
  }

  // High stock + rising
  if (days !== null && days > 60 && p.trend_direction === 'UP') {
    return { recommendation: i18next.t('brief.product.recHighUp', 'Mantener, stock se mover\u00E1.'), recommendationType: 'maintain' };
  }

  // Good stock + rising + high confidence
  if (days !== null && days >= 30 && days <= 60 && p.trend_direction === 'UP' && p.confidence === 'HIGH') {
    return { recommendation: i18next.t('brief.product.recGoodUp', 'Considerar aumentar pr\u00F3ximo pedido.'), recommendationType: 'action' };
  }

  // Low confidence
  if (p.confidence === 'LOW') {
    return { recommendation: i18next.t('brief.product.recLowConfidence', 'Monitorear. M\u00E1s datos necesarios.'), recommendationType: 'monitor' };
  }

  // No velocity but has stock
  if ((!p.daily_velocity_m2 || p.daily_velocity_m2 === 0) && p.current_stock_m2 && p.current_stock_m2 > 0) {
    return { recommendation: i18next.t('brief.product.recNoVelocity', 'Evaluar promoci\u00F3n o descontinuar.'), recommendationType: 'action' };
  }

  // Default
  return { recommendation: i18next.t('brief.product.recDefault', 'Mantener nivel actual.'), recommendationType: 'maintain' };
}


// ============================================================
// CUSTOMER BRIEF
// ============================================================

export function generateCustomerBrief(customer: CustomerTrend): Brief {
  const parts: BriefPart[] = [];

  // 1. OPENING LINE — Pattern-aware if data exists, else tier+status
  parts.push(getPatternOpeningLine(customer));

  // 2. VOLUME CONTEXT
  parts.push(getCustomerVolumeLine(customer));

  // 3. BUYING PATTERN
  parts.push(getBuyingPatternLine(customer));

  // 4. PRODUCT MIX
  const mixLine = getProductMixLine(customer);
  if (mixLine) parts.push(mixLine);

  // 5. PATTERN WARNING (if overdue)
  const patternWarning = getPatternWarningLine(customer);
  if (patternWarning) parts.push(patternWarning);

  // 6. RECOMMENDATION — Pattern-aware
  const recommendation = getPatternRecommendation(customer);

  return { parts, ...recommendation };
}

// ============================================================
// CUSTOMER OPENING LINES
// ============================================================

function getCustomerOpeningLine(c: CustomerTrend): BriefPart {
  const name = `**${c.customer_normalized}**`;
  const tier = c.tier;
  const status = c.status;
  const days = c.days_since_last_order;
  const change = c.velocity_change_pct;

  // Tier A combinations
  if (tier === 'A' && status === 'ACTIVE') {
    return {
      text: i18next.t('brief.customer.openingTierAActive', '{{name}} \u2014 Cliente VIP activo. Top 20% por volumen, comprando regularmente.', { name }),
      type: 'positive'
    };
  }

  if (tier === 'A' && status === 'COOLING') {
    return {
      text: i18next.t('brief.customer.openingTierACooling', '{{name}} \u2014 Cliente VIP enfri\u00E1ndose. Hace {{days}} d\u00EDas sin comprar.', { name, days }),
      type: 'warning'
    };
  }

  if (tier === 'A' && status === 'DORMANT') {
    return {
      text: i18next.t('brief.customer.openingTierADormant', '{{name}} \u2014 **ALERTA: Cliente VIP dormido.** {{days}} d\u00EDas sin actividad. Contactar urgente.', { name, days }),
      type: 'critical'
    };
  }

  // Tier B combinations
  if (tier === 'B' && status === 'ACTIVE') {
    return {
      text: i18next.t('brief.customer.openingTierBActive', '{{name}} \u2014 Cliente regular activo. Buen volumen, comprando normalmente.', { name }),
      type: 'positive'
    };
  }

  if (tier === 'B' && status === 'COOLING') {
    return {
      text: i18next.t('brief.customer.openingTierBCooling', '{{name}} \u2014 Cliente regular enfri\u00E1ndose. \u00DAltima compra hace {{days}} d\u00EDas.', { name, days }),
      type: 'warning'
    };
  }

  if (tier === 'B' && status === 'DORMANT') {
    return {
      text: i18next.t('brief.customer.openingTierBDormant', '{{name}} \u2014 Cliente regular dormido. Sin actividad hace {{days}} d\u00EDas.', { name, days }),
      type: 'normal'
    };
  }

  // Tier C combinations
  if (tier === 'C' && status === 'ACTIVE' && change && change > 25) {
    const revenueCtx = formatRevenueContext(c.total_revenue_usd, change);
    return {
      text: i18next.t('brief.customer.openingTierCGrowing', '{{name}} \u2014 Cliente peque\u00F1o pero **creciendo** (+{{change}}%){{revenueCtx}}. Potencial de desarrollo.', { name, change: change.toFixed(0), revenueCtx }),
      type: 'positive'
    };
  }

  if (tier === 'C' && status === 'ACTIVE') {
    return {
      text: i18next.t('brief.customer.openingTierCActive', '{{name}} \u2014 Cliente peque\u00F1o activo.', { name }),
      type: 'normal'
    };
  }

  if (tier === 'C' && status === 'DORMANT') {
    return {
      text: i18next.t('brief.customer.openingTierCDormant', '{{name}} \u2014 Cliente peque\u00F1o inactivo.', { name }),
      type: 'normal'
    };
  }

  // Default
  const statusLabel = status === 'ACTIVE'
    ? i18next.t('brief.customer.statusActive', 'activo')
    : status === 'COOLING'
      ? i18next.t('brief.customer.statusCooling', 'enfri\u00E1ndose')
      : i18next.t('brief.customer.statusDormant', 'dormido');
  return {
    text: i18next.t('brief.customer.openingDefault', '{{name}} \u2014 Cliente {{tier}}, {{statusLabel}}.', { name, tier, statusLabel }),
    type: 'normal'
  };
}

// ============================================================
// CUSTOMER VOLUME LINE
// ============================================================

function getCustomerVolumeLine(c: CustomerTrend): BriefPart {
  const volume = c.total_m2 || 0;
  const revenue = c.total_revenue_usd || 0;

  let text = '';

  // Volume classification
  if (volume > 10000) {
    text = i18next.t('brief.customer.volumeHigh', 'Ha comprado {{volume}} m\u00B2 en total \u2014 cliente de alto volumen.', { volume: volume.toLocaleString() });
  } else if (volume > 1000) {
    text = i18next.t('brief.customer.volumeMedium', '{{volume}} m\u00B2 comprados hist\u00F3ricamente.', { volume: volume.toLocaleString() });
  } else {
    text = i18next.t('brief.customer.volumeLow', 'Cliente de bajo volumen ({{volume}} m\u00B2 total).', { volume: volume.toLocaleString() });
  }

  // Add revenue if significant
  if (revenue > 10000) {
    text += ` ($${(revenue / 1000).toFixed(0)}K)`;
  }

  return { text, type: 'normal' };
}

// ============================================================
// BUYING PATTERN LINE
// ============================================================

function getBuyingPatternLine(c: CustomerTrend): BriefPart {
  const orders = c.order_count || 0;
  const avgOrder = c.avg_order_m2 || 0;

  // Not enough orders for pattern
  if (orders < 3) {
    return {
      text: i18next.t('brief.customer.tooFewOrders', 'Muy pocas compras para detectar patr\u00F3n.'),
      type: 'normal'
    };
  }

  let text = i18next.t('brief.customer.orderCount', '{{orders}} pedidos realizados.', { orders });

  // Order size
  if (avgOrder > 200) {
    text += ' ' + i18next.t('brief.customer.ordersLarge', 'Pedidos grandes (promedio {{avg}} m\u00B2).', { avg: avgOrder.toFixed(0) });
  } else if (avgOrder < 50) {
    text += ' ' + i18next.t('brief.customer.ordersSmall', 'Pedidos peque\u00F1os (promedio {{avg}} m\u00B2).', { avg: avgOrder.toFixed(0) });
  } else {
    text += ' ' + i18next.t('brief.customer.ordersMedium', 'Pedidos medianos (promedio {{avg}} m\u00B2).', { avg: avgOrder.toFixed(0) });
  }

  return { text, type: 'normal' };
}

// ============================================================
// PRODUCT MIX LINE
// ============================================================

function getProductMixLine(c: CustomerTrend): BriefPart | null {
  const topProducts = c.top_products;

  if (!topProducts || topProducts.length === 0) {
    return null;
  }

  const top = topProducts[0];
  const totalM2 = topProducts.reduce((sum, p) => sum + p.total_m2, 0);
  const topPct = totalM2 > 0 ? (top.total_m2 / totalM2) * 100 : 0;

  // Single product customer
  if (topProducts.length === 1) {
    return {
      text: i18next.t('brief.customer.mixSingle', 'Solo compra {{sku}}. Oportunidad de venta cruzada.', { sku: top.sku }),
      type: 'normal'
    };
  }

  // Concentrated
  if (topPct > 50) {
    return {
      text: i18next.t('brief.customer.mixConcentrated', 'Compra principalmente {{sku}} ({{pct}}% de sus pedidos).', { sku: top.sku, pct: topPct.toFixed(0) }),
      type: 'normal'
    };
  }

  // Diversified
  const topNames = topProducts.slice(0, 3).map(p => p.sku).join(', ');
  return {
    text: i18next.t('brief.customer.mixDiversified', 'Compra variado: {{products}}.', { products: topNames }),
    type: 'normal'
  };
}

// ============================================================
// CUSTOMER RECOMMENDATIONS
// ============================================================

function getCustomerRecommendation(c: CustomerTrend): { recommendation: string; recommendationType: 'urgent' | 'action' | 'monitor' | 'maintain' } {
  const tier = c.tier;
  const status = c.status;
  const change = c.velocity_change_pct || 0;

  // Tier A + Dormant
  if (tier === 'A' && status === 'DORMANT') {
    return { recommendation: i18next.t('brief.customer.recTierADormant', 'Contactar URGENTE. Preguntar qu\u00E9 pas\u00F3.'), recommendationType: 'urgent' };
  }

  // Tier A + Cooling
  if (tier === 'A' && status === 'COOLING') {
    return { recommendation: i18next.t('brief.customer.recTierACooling', 'Llamar para seguimiento.'), recommendationType: 'action' };
  }

  // Tier A + Active + Declining
  if (tier === 'A' && status === 'ACTIVE' && change < -25) {
    return { recommendation: i18next.t('brief.customer.recTierADeclining', 'Investigar por qu\u00E9 est\u00E1 comprando menos.'), recommendationType: 'action' };
  }

  // Tier B + Cooling
  if (tier === 'B' && status === 'COOLING') {
    return { recommendation: i18next.t('brief.customer.recTierBCooling', 'Enviar recordatorio o promoci\u00F3n.'), recommendationType: 'action' };
  }

  // Tier B + Dormant
  if (tier === 'B' && status === 'DORMANT') {
    return { recommendation: i18next.t('brief.customer.recTierBDormant', 'Campa\u00F1a de reactivaci\u00F3n.'), recommendationType: 'action' };
  }

  // Tier C + Growing
  if (tier === 'C' && status === 'ACTIVE' && change > 25) {
    return { recommendation: i18next.t('brief.customer.recTierCGrowing', 'Desarrollar relaci\u00F3n, potencial de crecimiento.'), recommendationType: 'action' };
  }

  // Active + Growing
  if (status === 'ACTIVE' && change > 10) {
    return { recommendation: i18next.t('brief.customer.recActiveGrowing', 'Mantener excelente servicio.'), recommendationType: 'maintain' };
  }

  // Default
  return { recommendation: i18next.t('brief.customer.recDefault', 'Seguimiento normal.'), recommendationType: 'maintain' };
}

// ============================================================
// PATTERN-AWARE OPENING LINE
// ============================================================

function getPatternOpeningLine(c: CustomerTrend): BriefPart {
  // Fall back to tier/status opening if no pattern data
  if (!c.avg_gap_days || c.order_count < 2) {
    return getCustomerOpeningLine(c);
  }

  const name = `**${c.customer_normalized}**`;
  const gapDays = Math.round(c.avg_gap_days);
  const predictability = c.predictability;
  const daysOverdue = c.days_overdue || 0;

  // CLOCKWORK customer that's overdue
  if (predictability === 'CLOCKWORK' && daysOverdue > 14) {
    return {
      text: i18next.t('brief.customer.patternClockworkOverdue', '{{name}} \u2014 Cliente muy regular (cada {{gapDays}} d\u00EDas) pero **{{daysOverdue}} d\u00EDas atrasado**. Inusual.', { name, gapDays, daysOverdue }),
      type: 'critical'
    };
  }

  // CLOCKWORK customer on time
  if (predictability === 'CLOCKWORK') {
    return {
      text: i18next.t('brief.customer.patternClockwork', '{{name}} \u2014 Compra como reloj cada {{gapDays}} d\u00EDas. Cliente predecible y valioso.', { name, gapDays }),
      type: 'positive'
    };
  }

  // PREDICTABLE customer that's overdue
  if (predictability === 'PREDICTABLE' && daysOverdue > 30) {
    return {
      text: i18next.t('brief.customer.patternPredictableOverdue', '{{name}} \u2014 Normalmente compra cada {{gapDays}} d\u00EDas. Ya van {{daysOverdue}} d\u00EDas de atraso.', { name, gapDays, daysOverdue }),
      type: 'warning'
    };
  }

  // PREDICTABLE customer
  if (predictability === 'PREDICTABLE') {
    return {
      text: i18next.t('brief.customer.patternPredictable', '{{name}} \u2014 Cliente predecible, compra aproximadamente cada {{gapDays}} d\u00EDas.', { name, gapDays }),
      type: 'positive'
    };
  }

  // MODERATE predictability with severe overdue
  if (predictability === 'MODERATE' && daysOverdue > 60) {
    return {
      text: i18next.t('brief.customer.patternModerateOverdue', '{{name}} \u2014 Patr\u00F3n moderado (cada ~{{gapDays}} d\u00EDas). **{{daysOverdue}} d\u00EDas sin comprar**.', { name, gapDays, daysOverdue }),
      type: 'warning'
    };
  }

  // ERRATIC customer with severe overdue
  if (predictability === 'ERRATIC' && daysOverdue > 90) {
    return {
      text: i18next.t('brief.customer.patternErraticOverdue', '{{name}} \u2014 Patr\u00F3n err\u00E1tico pero {{daysOverdue}} d\u00EDas es mucho tiempo sin comprar.', { name, daysOverdue }),
      type: 'warning'
    };
  }

  // ERRATIC customer (don't worry too much about overdue)
  if (predictability === 'ERRATIC') {
    return {
      text: i18next.t('brief.customer.patternErratic', '{{name}} \u2014 Compras muy irregulares (promedio {{gapDays}} d\u00EDas pero con mucha variaci\u00F3n).', { name, gapDays }),
      type: 'normal'
    };
  }

  // Fall back to tier/status opening
  return getCustomerOpeningLine(c);
}

// ============================================================
// PATTERN WARNING LINE
// ============================================================

function getPatternWarningLine(c: CustomerTrend): BriefPart | null {
  const daysOverdue = c.days_overdue || 0;
  const predictability = c.predictability;

  // No overdue
  if (daysOverdue <= 0) {
    return null;
  }

  // Critical: CLOCKWORK or PREDICTABLE customer severely overdue
  if ((predictability === 'CLOCKWORK' || predictability === 'PREDICTABLE') && daysOverdue > 60) {
    return {
      text: i18next.t('brief.customer.warningCriticalOverdue', '**ALERTA:** Este cliente es muy regular pero lleva {{daysOverdue}} d\u00EDas sin comprar. Posible p\u00E9rdida.', { daysOverdue }),
      type: 'critical'
    };
  }

  // Warning: Any customer 180+ days overdue
  if (daysOverdue > 180) {
    return {
      text: i18next.t('brief.customer.warningPossiblyLost', 'Sin compras hace {{daysOverdue}} d\u00EDas. Posiblemente perdido.', { daysOverdue }),
      type: 'critical'
    };
  }

  // Warning: Good predictability but moderately overdue
  if ((predictability === 'CLOCKWORK' || predictability === 'PREDICTABLE') && daysOverdue > 14) {
    return {
      text: i18next.t('brief.customer.warningOverduePattern', 'Deber\u00EDa haber comprado hace {{daysOverdue}} d\u00EDas seg\u00FAn su patr\u00F3n.', { daysOverdue }),
      type: 'warning'
    };
  }

  // Moderate warning for moderate predictability
  if (predictability === 'MODERATE' && daysOverdue > 30) {
    return {
      text: i18next.t('brief.customer.warningModerateOverdue', '{{daysOverdue}} d\u00EDas desde \u00FAltima compra, m\u00E1s de lo usual.', { daysOverdue }),
      type: 'warning'
    };
  }

  // No warning for erratic customers unless very overdue
  return null;
}

// ============================================================
// PATTERN-AWARE RECOMMENDATIONS
// ============================================================

function getPatternRecommendation(c: CustomerTrend): { recommendation: string; recommendationType: 'urgent' | 'action' | 'monitor' | 'maintain' } {
  const daysOverdue = c.days_overdue || 0;
  const predictability = c.predictability;
  const tier = c.tier;
  const expectedDate = c.expected_next_date;

  // CRITICAL: High-value + highly predictable + severely overdue
  if (tier === 'A' && (predictability === 'CLOCKWORK' || predictability === 'PREDICTABLE') && daysOverdue > 30) {
    return { recommendation: i18next.t('brief.customer.patRecCritical', 'Llamar HOY. Cliente valioso con patr\u00F3n roto.'), recommendationType: 'urgent' };
  }

  // URGENT: Any CLOCKWORK customer overdue
  if (predictability === 'CLOCKWORK' && daysOverdue > 14) {
    return { recommendation: i18next.t('brief.customer.patRecClockworkOverdue', 'Contactar pronto. Cliente muy regular atrasado.'), recommendationType: 'urgent' };
  }

  // URGENT: Tier A severely overdue
  if (tier === 'A' && daysOverdue > 60) {
    return { recommendation: i18next.t('brief.customer.patRecTierAOverdue', 'Contactar URGENTE. Cliente VIP muy atrasado.'), recommendationType: 'urgent' };
  }

  // ACTION: Predictable customer moderately overdue
  if (predictability === 'PREDICTABLE' && daysOverdue > 14) {
    return { recommendation: i18next.t('brief.customer.patRecPredictableOverdue', 'Enviar recordatorio, se pas\u00F3 de su fecha esperada.'), recommendationType: 'action' };
  }

  // ACTION: Expected date coming soon
  if (expectedDate) {
    const expected = new Date(expectedDate);
    const today = new Date();
    const daysUntil = Math.floor((expected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= 0 && daysUntil <= 7 && (predictability === 'CLOCKWORK' || predictability === 'PREDICTABLE')) {
      return { recommendation: i18next.t('brief.customer.patRecExpectedSoon', 'Contactar esta semana, deber\u00EDa comprar pronto.'), recommendationType: 'action' };
    }
  }

  // Tier B moderately overdue
  if (tier === 'B' && daysOverdue > 45) {
    return { recommendation: i18next.t('brief.customer.patRecTierBOverdue', 'Campa\u00F1a de reactivaci\u00F3n.'), recommendationType: 'action' };
  }

  // Possibly lost customer
  if (daysOverdue > 180) {
    return { recommendation: i18next.t('brief.customer.patRecLost', 'Posiblemente perdido. \u00DAltimo intento de contacto.'), recommendationType: 'action' };
  }

  // Fall back to existing recommendation logic
  return getCustomerRecommendation(c);
}


// ============================================================
// COUNTRY BRIEF
// ============================================================

export function generateCountryBrief(country: CountryTrend): Brief {
  const parts: BriefPart[] = [];

  // 1. OPENING LINE — Market position + trend
  parts.push(getCountryOpeningLine(country));

  // 2. CUSTOMER COUNT
  parts.push(getCustomerCountLine(country));

  // 3. TOP CUSTOMERS
  const topLine = getTopCustomersLine(country);
  if (topLine) parts.push(topLine);

  // 4. RECOMMENDATION
  const recommendation = getCountryRecommendation(country);

  return { parts, ...recommendation };
}

// ============================================================
// COUNTRY OPENING LINES
// ============================================================

function getCountryOpeningLine(c: CountryTrend): BriefPart {
  const name = `**${c.country_name}**`;
  const pct = c.pct_of_total_revenue || 0;
  const change = c.velocity_change_pct || 0;

  // Dominant + Growing
  if (pct > 80 && change > 10) {
    return {
      text: i18next.t('brief.country.openingDominantGrowing', '{{name}} es tu mercado principal ({{pct}}%) y sigue creciendo (+{{change}}%).', { name, pct: pct.toFixed(0), change: change.toFixed(0) }),
      type: 'positive'
    };
  }

  // Dominant + Stable
  if (pct > 80 && change >= -10 && change <= 10) {
    return {
      text: i18next.t('brief.country.openingDominantStable', '{{name}} es tu mercado principal ({{pct}}%), manteni\u00E9ndose estable.', { name, pct: pct.toFixed(0) }),
      type: 'normal'
    };
  }

  // Dominant + Declining
  if (pct > 80 && change < -10) {
    return {
      text: i18next.t('brief.country.openingDominantDeclining', '{{name}} es tu mercado principal ({{pct}}%) pero est\u00E1 bajando (-{{change}}%).', { name, pct: pct.toFixed(0), change: Math.abs(change).toFixed(0) }),
      type: 'warning'
    };
  }

  // Secondary + Growing
  if (pct >= 10 && pct <= 50 && change > 20) {
    return {
      text: i18next.t('brief.country.openingSecondaryGrowing', '{{name}} est\u00E1 creciendo fuerte (+{{change}}%). Mercado en desarrollo.', { name, change: change.toFixed(0) }),
      type: 'positive'
    };
  }

  // Secondary + Stable
  if (pct >= 10 && pct <= 50) {
    return {
      text: i18next.t('brief.country.openingSecondary', '{{name}} representa {{pct}}% del negocio.', { name, pct: pct.toFixed(0) }),
      type: 'normal'
    };
  }

  // Minor + Growing fast
  if (pct < 10 && change > 100) {
    return {
      text: i18next.t('brief.country.openingMinorNew', '{{name}} es mercado nuevo, apenas comenzando.', { name }),
      type: 'normal'
    };
  }

  // Minor market
  if (pct < 10) {
    return {
      text: i18next.t('brief.country.openingMinor', '{{name}} es un mercado peque\u00F1o ({{pct}}%).', { name, pct: pct.toFixed(0) }),
      type: 'normal'
    };
  }

  // Default
  return {
    text: i18next.t('brief.country.openingDefault', '{{name}} representa {{pct}}% del negocio.', { name, pct: pct.toFixed(0) }),
    type: 'normal'
  };
}

// ============================================================
// CUSTOMER COUNT LINE
// ============================================================

function getCustomerCountLine(c: CountryTrend): BriefPart {
  const total = c.customer_count || 0;

  if (total === 0) {
    return { text: i18next.t('brief.country.noCustomers', 'Sin clientes registrados.'), type: 'warning' };
  }

  if (total === 1) {
    return { text: i18next.t('brief.country.oneCustomer', '1 cliente \u2014 alto riesgo de concentraci\u00F3n.'), type: 'warning' };
  }

  if (total <= 3) {
    return { text: i18next.t('brief.country.fewCustomers', 'Solo {{total}} clientes \u2014 base peque\u00F1a.', { total }), type: 'normal' };
  }

  if (total >= 10) {
    return { text: i18next.t('brief.country.manyCustomers', '{{total}} clientes \u2014 base diversificada.', { total }), type: 'positive' };
  }

  return { text: i18next.t('brief.country.activeCustomers', '{{total}} clientes activos.', { total }), type: 'normal' };
}

// ============================================================
// TOP CUSTOMERS LINE
// ============================================================

function getTopCustomersLine(c: CountryTrend): BriefPart | null {
  const topCustomers = c.top_customers;

  if (!topCustomers || topCustomers.length === 0) {
    return null;
  }

  const names = topCustomers.slice(0, 3).join(', ');
  return {
    text: i18next.t('brief.country.topCustomers', 'Principales: {{names}}.', { names }),
    type: 'normal'
  };
}

// ============================================================
// COUNTRY RECOMMENDATIONS
// ============================================================

function getCountryRecommendation(c: CountryTrend): { recommendation: string; recommendationType: 'urgent' | 'action' | 'monitor' | 'maintain' } {
  const pct = c.pct_of_total_revenue || 0;
  const change = c.velocity_change_pct || 0;
  const customers = c.customer_count || 0;

  // Dominant + Declining
  if (pct > 80 && change < -10) {
    return { recommendation: i18next.t('brief.country.recDominantDeclining', 'Investigar qu\u00E9 est\u00E1 pasando en {{country}}.', { country: c.country_name }), recommendationType: 'urgent' };
  }

  // Secondary + Growing
  if (pct >= 10 && pct <= 50 && change > 20) {
    return { recommendation: i18next.t('brief.country.recSecondaryGrowing', 'Invertir en este mercado, est\u00E1 creciendo.'), recommendationType: 'action' };
  }

  // Single customer dependency
  if (customers === 1) {
    return { recommendation: i18next.t('brief.country.recSingleCustomer', 'Buscar m\u00E1s clientes para diversificar.'), recommendationType: 'action' };
  }

  // Few customers
  if (customers <= 3 && pct >= 10) {
    return { recommendation: i18next.t('brief.country.recFewCustomers', 'Desarrollar m\u00E1s clientes para reducir riesgo.'), recommendationType: 'action' };
  }

  // Small but growing
  if (pct < 10 && change > 50) {
    return { recommendation: i18next.t('brief.country.recEmerging', 'Mercado emergente, considerar inversi\u00F3n.'), recommendationType: 'monitor' };
  }

  // Healthy + Growing
  if (customers >= 5 && change > 0) {
    return { recommendation: i18next.t('brief.country.recHealthy', 'Mantener estrategia actual.'), recommendationType: 'maintain' };
  }

  // Default
  return { recommendation: i18next.t('brief.country.recDefault', 'Monitorear desempe\u00F1o.'), recommendationType: 'monitor' };
}
