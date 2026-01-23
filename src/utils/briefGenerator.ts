/**
 * Smart Brief Generator
 * Template-based insights for products, customers, and countries.
 * Zero API cost, instant response.
 */

import type { ProductTrend, CustomerTrend, CountryTrend } from '../requests/intelligence';

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

  return ` (${prevWeekly} → ${currWeekly} m²/sem)`;
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

  return ` (${formatK(previous)} → ${formatK(currentRevenue)})`;
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
      text: `${name} muestra +${change.toFixed(0)}% — pero viene de base casi cero${volumeCtx}. No es crecimiento real, el producto "despertó".`,
      type: 'normal'
    };
  }

  // Product died (no velocity but had history)
  if (velocity === 0 && hasHistory) {
    return {
      text: `${name} dejó de venderse. ¿Descontinuado o problema de stock?`,
      type: 'warning'
    };
  }

  // New product with low confidence
  if (!hasHistory && velocity > 0 && p.confidence === 'LOW') {
    return {
      text: `${name} es nuevo o recién empezó a moverse.`,
      type: 'normal'
    };
  }

  // Strong real growth
  if (p.velocity_change_pct > 25 && hasHistory && p.confidence !== 'LOW') {
    return {
      text: `${name} está creciendo fuerte (+${change.toFixed(0)}%)${volumeCtx} con demanda real.`,
      type: 'positive'
    };
  }

  // Moderate growth
  if (p.velocity_change_pct >= 10 && p.velocity_change_pct <= 25) {
    return {
      text: `${name} está creciendo moderadamente (+${change.toFixed(0)}%).`,
      type: 'positive'
    };
  }

  // Severe decline
  if (p.velocity_change_pct < -50 && hasHistory) {
    return {
      text: `${name} cayó fuerte (-${change.toFixed(0)}%)${volumeCtx}. Revisar qué pasó.`,
      type: 'warning'
    };
  }

  // Strong decline
  if (p.velocity_change_pct < -25) {
    return {
      text: `${name} está bajando significativamente (-${change.toFixed(0)}%)${volumeCtx}.`,
      type: 'warning'
    };
  }

  // Moderate decline
  if (p.velocity_change_pct < -10) {
    return {
      text: `${name} está bajando levemente (-${change.toFixed(0)}%).`,
      type: 'normal'
    };
  }

  // Stable
  return {
    text: `${name} se mantiene estable.`,
    type: 'normal'
  };
}

// ============================================================
// VELOCITY LINE
// ============================================================

function getVelocityLine(p: ProductTrend): BriefPart {
  if (!p.daily_velocity_m2 || p.daily_velocity_m2 === 0) {
    return { text: 'Sin ventas recientes.', type: 'normal' };
  }
  return {
    text: `Vendes ${p.daily_velocity_m2.toFixed(1)} m²/día.`,
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
      text: 'Sin datos de inventario.',
      type: 'warning'
    };
  }

  // Has stock but no velocity (infinite days)
  if (stock > 0 && velocity === 0) {
    return {
      text: `Tiene ${stock.toFixed(0)} m² en bodega pero sin ventas recientes. Stock estancado.`,
      type: 'warning'
    };
  }

  // No stock but selling
  if (stock === 0 && velocity > 0) {
    return {
      text: `**Sin stock** y vendiendo ${velocity.toFixed(1)} m²/día.`,
      type: 'critical'
    };
  }

  // Critical
  if (days !== null && days < 7) {
    return {
      text: `**CRÍTICO: Solo ${Math.round(days)} días de stock.** Pedir urgente.`,
      type: 'critical'
    };
  }

  // Urgent
  if (days !== null && days < 14) {
    return {
      text: `**Solo ${Math.round(days)} días de stock.** Incluir en próximo pedido.`,
      type: 'warning'
    };
  }

  // Low
  if (days !== null && days < 30) {
    return {
      text: `Stock para ${Math.round(days)} días — monitorear de cerca.`,
      type: 'normal'
    };
  }

  // Very high
  if (days !== null && days > 90) {
    return {
      text: `Stock muy alto (${Math.round(days)} días).`,
      type: 'normal'
    };
  }

  // High
  if (days !== null && days > 60) {
    return {
      text: `Stock alto (${Math.round(days)} días). Verificar si es intencional.`,
      type: 'normal'
    };
  }

  // Good
  return {
    text: `Bien cubierto con ${Math.round(days!)} días de stock.`,
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
      text: `El +${change.toFixed(0)}% parece impresionante pero con solo ${weeks} semanas de datos, es ruido estadístico.`,
      type: 'warning'
    };
  }

  // Low confidence general
  if (p.confidence === 'LOW') {
    return {
      text: `Confianza BAJA (solo ${weeks} semanas de datos). No actuar basándose únicamente en esta tendencia.`,
      type: 'warning'
    };
  }

  // Medium confidence with extreme change
  if (p.confidence === 'MEDIUM' && change > 50) {
    return {
      text: `Confianza MEDIA — el cambio parece grande pero necesita más datos para confirmar.`,
      type: 'normal'
    };
  }

  // High confidence with erratic sales (high CV)
  if (p.cv && p.cv > 1.0) {
    return {
      text: 'Ventas muy erráticas — difícil predecir. Mantener stock de seguridad extra.',
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
      text: 'Stock alto + demanda bajando = riesgo de sobre-inventario.',
      type: 'warning'
    };
  }

  // Stockout imminent
  if (days && days < 14 && p.trend_direction === 'UP') {
    return {
      text: 'Stock bajo + demanda subiendo = riesgo de quiebre.',
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
    return { recommendation: 'Pedir URGENTE.', recommendationType: 'urgent' };
  }

  // Urgent stock
  if (days !== null && days < 14) {
    return { recommendation: 'Incluir en próximo pedido.', recommendationType: 'action' };
  }

  // Low stock + trending up
  if (days !== null && days < 30 && p.trend_direction === 'UP') {
    return { recommendation: 'Pedir pronto, demanda subiendo.', recommendationType: 'action' };
  }

  // Low stock + trending down
  if (days !== null && days < 30 && p.trend_direction === 'DOWN') {
    return { recommendation: 'Esperar, demanda bajando.', recommendationType: 'monitor' };
  }

  // High stock + declining
  if (days !== null && days > 60 && p.trend_direction === 'DOWN') {
    return { recommendation: 'No pedir más. Evaluar reducir precio.', recommendationType: 'action' };
  }

  // High stock + rising
  if (days !== null && days > 60 && p.trend_direction === 'UP') {
    return { recommendation: 'Mantener, stock se moverá.', recommendationType: 'maintain' };
  }

  // Good stock + rising + high confidence
  if (days !== null && days >= 30 && days <= 60 && p.trend_direction === 'UP' && p.confidence === 'HIGH') {
    return { recommendation: 'Considerar aumentar próximo pedido.', recommendationType: 'action' };
  }

  // Low confidence
  if (p.confidence === 'LOW') {
    return { recommendation: 'Monitorear. Más datos necesarios.', recommendationType: 'monitor' };
  }

  // No velocity but has stock
  if ((!p.daily_velocity_m2 || p.daily_velocity_m2 === 0) && p.current_stock_m2 && p.current_stock_m2 > 0) {
    return { recommendation: 'Evaluar promoción o descontinuar.', recommendationType: 'action' };
  }

  // Default
  return { recommendation: 'Mantener nivel actual.', recommendationType: 'maintain' };
}


// ============================================================
// CUSTOMER BRIEF
// ============================================================

export function generateCustomerBrief(customer: CustomerTrend): Brief {
  const parts: BriefPart[] = [];

  // 1. OPENING LINE — Tier + Status combo
  parts.push(getCustomerOpeningLine(customer));

  // 2. VOLUME CONTEXT
  parts.push(getCustomerVolumeLine(customer));

  // 3. BUYING PATTERN
  parts.push(getBuyingPatternLine(customer));

  // 4. PRODUCT MIX
  const mixLine = getProductMixLine(customer);
  if (mixLine) parts.push(mixLine);

  // 5. RECOMMENDATION
  const recommendation = getCustomerRecommendation(customer);

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
      text: `${name} — Cliente VIP activo. Top 20% por volumen, comprando regularmente.`,
      type: 'positive'
    };
  }

  if (tier === 'A' && status === 'COOLING') {
    return {
      text: `${name} — Cliente VIP enfriándose. Hace ${days} días sin comprar.`,
      type: 'warning'
    };
  }

  if (tier === 'A' && status === 'DORMANT') {
    return {
      text: `${name} — **ALERTA: Cliente VIP dormido.** ${days} días sin actividad. Contactar urgente.`,
      type: 'critical'
    };
  }

  // Tier B combinations
  if (tier === 'B' && status === 'ACTIVE') {
    return {
      text: `${name} — Cliente regular activo. Buen volumen, comprando normalmente.`,
      type: 'positive'
    };
  }

  if (tier === 'B' && status === 'COOLING') {
    return {
      text: `${name} — Cliente regular enfriándose. Última compra hace ${days} días.`,
      type: 'warning'
    };
  }

  if (tier === 'B' && status === 'DORMANT') {
    return {
      text: `${name} — Cliente regular dormido. Sin actividad hace ${days} días.`,
      type: 'normal'
    };
  }

  // Tier C combinations
  if (tier === 'C' && status === 'ACTIVE' && change && change > 25) {
    const revenueCtx = formatRevenueContext(c.total_revenue_usd, change);
    return {
      text: `${name} — Cliente pequeño pero **creciendo** (+${change.toFixed(0)}%)${revenueCtx}. Potencial de desarrollo.`,
      type: 'positive'
    };
  }

  if (tier === 'C' && status === 'ACTIVE') {
    return {
      text: `${name} — Cliente pequeño activo.`,
      type: 'normal'
    };
  }

  if (tier === 'C' && status === 'DORMANT') {
    return {
      text: `${name} — Cliente pequeño inactivo.`,
      type: 'normal'
    };
  }

  // Default
  return {
    text: `${name} — Cliente ${tier}, ${status === 'ACTIVE' ? 'activo' : status === 'COOLING' ? 'enfriándose' : 'dormido'}.`,
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
    text = `Ha comprado ${volume.toLocaleString()} m² en total — cliente de alto volumen.`;
  } else if (volume > 1000) {
    text = `${volume.toLocaleString()} m² comprados históricamente.`;
  } else {
    text = `Cliente de bajo volumen (${volume.toLocaleString()} m² total).`;
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
      text: 'Muy pocas compras para detectar patrón.',
      type: 'normal'
    };
  }

  let text = `${orders} pedidos realizados.`;

  // Order size
  if (avgOrder > 200) {
    text += ` Pedidos grandes (promedio ${avgOrder.toFixed(0)} m²).`;
  } else if (avgOrder < 50) {
    text += ` Pedidos pequeños (promedio ${avgOrder.toFixed(0)} m²).`;
  } else {
    text += ` Pedidos medianos (promedio ${avgOrder.toFixed(0)} m²).`;
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
      text: `Solo compra ${top.sku}. Oportunidad de venta cruzada.`,
      type: 'normal'
    };
  }

  // Concentrated
  if (topPct > 50) {
    return {
      text: `Compra principalmente ${top.sku} (${topPct.toFixed(0)}% de sus pedidos).`,
      type: 'normal'
    };
  }

  // Diversified
  const topNames = topProducts.slice(0, 3).map(p => p.sku).join(', ');
  return {
    text: `Compra variado: ${topNames}.`,
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
    return { recommendation: 'Contactar URGENTE. Preguntar qué pasó.', recommendationType: 'urgent' };
  }

  // Tier A + Cooling
  if (tier === 'A' && status === 'COOLING') {
    return { recommendation: 'Llamar para seguimiento.', recommendationType: 'action' };
  }

  // Tier A + Active + Declining
  if (tier === 'A' && status === 'ACTIVE' && change < -25) {
    return { recommendation: 'Investigar por qué está comprando menos.', recommendationType: 'action' };
  }

  // Tier B + Cooling
  if (tier === 'B' && status === 'COOLING') {
    return { recommendation: 'Enviar recordatorio o promoción.', recommendationType: 'action' };
  }

  // Tier B + Dormant
  if (tier === 'B' && status === 'DORMANT') {
    return { recommendation: 'Campaña de reactivación.', recommendationType: 'action' };
  }

  // Tier C + Growing
  if (tier === 'C' && status === 'ACTIVE' && change > 25) {
    return { recommendation: 'Desarrollar relación, potencial de crecimiento.', recommendationType: 'action' };
  }

  // Active + Growing
  if (status === 'ACTIVE' && change > 10) {
    return { recommendation: 'Mantener excelente servicio.', recommendationType: 'maintain' };
  }

  // Default
  return { recommendation: 'Seguimiento normal.', recommendationType: 'maintain' };
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
      text: `${name} es tu mercado principal (${pct.toFixed(0)}%) y sigue creciendo (+${change.toFixed(0)}%).`,
      type: 'positive'
    };
  }

  // Dominant + Stable
  if (pct > 80 && change >= -10 && change <= 10) {
    return {
      text: `${name} es tu mercado principal (${pct.toFixed(0)}%), manteniéndose estable.`,
      type: 'normal'
    };
  }

  // Dominant + Declining
  if (pct > 80 && change < -10) {
    return {
      text: `${name} es tu mercado principal (${pct.toFixed(0)}%) pero está bajando (-${Math.abs(change).toFixed(0)}%).`,
      type: 'warning'
    };
  }

  // Secondary + Growing
  if (pct >= 10 && pct <= 50 && change > 20) {
    return {
      text: `${name} está creciendo fuerte (+${change.toFixed(0)}%). Mercado en desarrollo.`,
      type: 'positive'
    };
  }

  // Secondary + Stable
  if (pct >= 10 && pct <= 50) {
    return {
      text: `${name} representa ${pct.toFixed(0)}% del negocio.`,
      type: 'normal'
    };
  }

  // Minor + Growing fast
  if (pct < 10 && change > 100) {
    return {
      text: `${name} es mercado nuevo, apenas comenzando.`,
      type: 'normal'
    };
  }

  // Minor market
  if (pct < 10) {
    return {
      text: `${name} es un mercado pequeño (${pct.toFixed(0)}%).`,
      type: 'normal'
    };
  }

  // Default
  return {
    text: `${name} representa ${pct.toFixed(0)}% del negocio.`,
    type: 'normal'
  };
}

// ============================================================
// CUSTOMER COUNT LINE
// ============================================================

function getCustomerCountLine(c: CountryTrend): BriefPart {
  const total = c.customer_count || 0;

  if (total === 0) {
    return { text: 'Sin clientes registrados.', type: 'warning' };
  }

  if (total === 1) {
    return { text: '1 cliente — alto riesgo de concentración.', type: 'warning' };
  }

  if (total <= 3) {
    return { text: `Solo ${total} clientes — base pequeña.`, type: 'normal' };
  }

  if (total >= 10) {
    return { text: `${total} clientes — base diversificada.`, type: 'positive' };
  }

  return { text: `${total} clientes activos.`, type: 'normal' };
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
    text: `Principales: ${names}.`,
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
    return { recommendation: `Investigar qué está pasando en ${c.country_name}.`, recommendationType: 'urgent' };
  }

  // Secondary + Growing
  if (pct >= 10 && pct <= 50 && change > 20) {
    return { recommendation: 'Invertir en este mercado, está creciendo.', recommendationType: 'action' };
  }

  // Single customer dependency
  if (customers === 1) {
    return { recommendation: 'Buscar más clientes para diversificar.', recommendationType: 'action' };
  }

  // Few customers
  if (customers <= 3 && pct >= 10) {
    return { recommendation: 'Desarrollar más clientes para reducir riesgo.', recommendationType: 'action' };
  }

  // Small but growing
  if (pct < 10 && change > 50) {
    return { recommendation: 'Mercado emergente, considerar inversión.', recommendationType: 'monitor' };
  }

  // Healthy + Growing
  if (customers >= 5 && change > 0) {
    return { recommendation: 'Mantener estrategia actual.', recommendationType: 'maintain' };
  }

  // Default
  return { recommendation: 'Monitorear desempeño.', recommendationType: 'monitor' };
}
