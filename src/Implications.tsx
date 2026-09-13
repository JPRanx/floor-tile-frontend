import { useState } from "react";
import type { AttentionCase, LegalAction } from "./contracts";

const FAMILY_LABEL: Record<string, string> = {
  product_match: "Identidad de producto",
  decision_required: "Decisión de riesgo",
  reconciliation_exception: "Diferencia material",
  reallocation_intent: "Cambio de plan finalizado",
  overdue_response: "Respuesta vencida",
  missing_evidence: "Evidencia faltante",
};

const FIELD_LABEL: Record<string, string> = {
  warehouse_m2: "Inventario en bodega",
  daily_velocity: "Venta diaria",
  projected_stockout: "Quiebre proyectado",
  earliest_arrival: "Primera llegada posible",
  m2: "Cantidad",
  reference: "Referencia",
  note: "Efecto",
  feed: "Fuente",
  as_of: "Fecha de evidencia",
};

function displayValue(key: string, value: unknown) {
  if (value === null || value === undefined) return "—";
  if (key.endsWith("_m2") || key === "m2") return `${String(value)} m²`;
  return String(value);
}

function actionParams(action: LegalAction, note: string): Record<string, unknown> {
  if (!note.trim()) return action.params;
  if (action.command === "AcceptImplicationRisk") return { ...action.params, note: note.trim() };
  const nested = typeof action.params.params === "object" && action.params.params !== null ? action.params.params as Record<string, unknown> : {};
  return { ...action.params, params: { ...nested, note: note.trim() } };
}

export function Implications({ cases, onResolve }: { cases: AttentionCase[]; onResolve?: (command: string, params: Record<string, unknown>) => Promise<void> }) {
  const [selected, setSelected] = useState<{ caseItem: AttentionCase; action: LegalAction } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cases.length) return <section className="implications-calm"><i className="status-dot ready" /><div><strong>Sin implicaciones materiales</strong><span>La reconciliación normal continúa sin interrumpir a Ashley.</span></div></section>;

  async function confirm() {
    if (!selected || !onResolve) return;
    setBusy(true); setError(null);
    try {
      await onResolve(selected.action.command, actionParams(selected.action, note));
      setSelected(null); setNote("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }

  return <section className="implications" aria-labelledby="implications-title">
    <div className="result-heading"><div><span className="section-kicker">ATENCIÓN MATERIAL</span><h2 id="implications-title">Implicaciones por resolver</h2><p>El sistema detuvo la automatización donde hace falta una decisión responsable.</p></div><span className="review-pill">{cases.length} abiertas</span></div>
    <div className="implication-list">{cases.map((caseItem) => <article className={`implication-card implication-${caseItem.severity}`} key={caseItem.implication_id}>
      <header><span>{FAMILY_LABEL[caseItem.family ?? ""] ?? "Implicación operativa"}</span><small>Responsable · {caseItem.owner === "ashley" ? "Ashley" : "Elicio / agente"}</small></header>
      <h3>{caseItem.consequence}</h3>
      {caseItem.why_stopped && <p><b>Por qué se detuvo:</b> {caseItem.why_stopped}</p>}
      {caseItem.recommendation && <p><b>Recomendación:</b> {caseItem.recommendation}</p>}
      {caseItem.shipment_effect && <div className="implication-effect"><strong>Efecto en el embarque</strong>{Object.entries(caseItem.shipment_effect).map(([key, value]) => <span key={key}>{FIELD_LABEL[key] ?? "Efecto"}: {displayValue(key, value)}</span>)}</div>}
      {!!caseItem.evidence?.length && <details><summary>Ver evidencia utilizada</summary>{caseItem.evidence.map((evidence, index) => <dl key={index}>{Object.entries(evidence).map(([key, value]) => <div key={key}><dt>{FIELD_LABEL[key] ?? key.replaceAll("_", " ")}</dt><dd>{displayValue(key, value)}</dd></div>)}</dl>)}</details>}
      <div className="implication-actions">{(caseItem.legal_actions ?? []).map((action) => <button type="button" key={`${caseItem.implication_id}-${action.command}-${action.label}`} onClick={() => { setSelected({ caseItem, action }); setNote(""); setError(null); }}>{action.label}</button>)}</div>
    </article>)}</div>
    {selected && <section className="implication-confirm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <span className="section-kicker">CONFIRMACIÓN</span><h3 id="confirm-title">Vas a resolver esta implicación</h3>
      <p><strong>{selected.action.label}</strong></p><p>{selected.caseItem.consequence}</p>
      <label>Nota opcional<textarea aria-label="Nota de resolución" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Deja contexto si ayuda al historial…" /></label>
      {error && <p role="alert">{error}</p>}
      <div><button type="button" className="secondary" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button><button type="button" className="calculate" disabled={busy || !onResolve} onClick={() => void confirm()}>Confirmar resolución</button></div>
    </section>}
  </section>;
}
