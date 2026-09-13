import { useEffect, useMemo, useState } from "react";
import type { PlanRow, Product, SourceHub, Workspace } from "./contracts";
import { ManualInput } from "./ManualInput";
import { Implications } from "./Implications";
import { downloadRecommendations } from "./exportRecommendations";

const READY = new Set(["ready", "fresh", "current", "available"]);
const MATERIAL = new Set(["material", "consequential", "high", "critical", "blocking"]);
const n = (value: string | null | undefined) => Number(value ?? 0);
const m2 = (value: number) => `${value.toFixed(2)} m²`;
const pallets = (value: number, product: Product) => value / Math.max(n(product.m2_per_pallet), 0.01);
type Drafts = Record<string, number>;

function OrderSummary({ kind, title, rows, values, onChange, onReview, reviewLabel }: {
  kind: "shipment" | "production"; title: string;
  rows: Array<{ product: Product; initial: number; capped?: boolean; gross?: number; qualified?: number; futureDemand?: number; buffer?: number; warehouse?: number; incoming?: number; focusShipment?: number; projectedBalance?: number; qualifiedRows?: Workspace["progression"]["production_need"][number]["qualified_production_rows"]; excludedRows?: Workspace["progression"]["production_need"][number]["excluded_production_rows"] }>;
  values: Drafts; onChange: (id: string, value: number) => void;
  onReview?: () => void; reviewLabel?: string;
}) {
  const total = rows.reduce((sum, row) => sum + (values[row.product.id] ?? row.initial), 0);
  const totalPallets = rows.reduce((sum, row) => sum + pallets(values[row.product.id] ?? row.initial, row.product), 0);
  return <section className="order-card" role="region" aria-label={kind === "shipment" ? "Resumen de embarque" : "Resumen de producción"}>
    <header><div><span className="section-kicker">{kind === "shipment" ? "PEDIDO 01 · SIESA" : "PEDIDO 02 · FÁBRICA"}</span><h2>{title}</h2></div><span className="review-pill">Por revisar</span></header>
    <div className="order-total"><strong>{m2(total)}</strong><span>{totalPallets.toFixed(2)} pallets{kind === "production" ? " por producir" : ""}</span></div>
    <div className="order-lines">{rows.map(({ product, initial, capped, gross, qualified, futureDemand, buffer, warehouse, incoming, focusShipment, projectedBalance, qualifiedRows, excludedRows }) => {
      const value = values[product.id] ?? initial;
      return <div className="order-line" key={product.id}>
        <div><strong>{product.name ?? product.sku ?? product.id}</strong><small>{product.sku ?? product.id}</small></div>
        <label><span className="sr-only">{product.name ?? product.id} m²</span><input aria-label={`${product.name ?? product.id} m²`} type="number" min="0" step={product.edit_increment_m2 || "67.20"} value={value} onChange={(event) => onChange(product.id, event.currentTarget.valueAsNumber || 0)} /></label>
        <span>{pallets(value, product).toFixed(2)} pal.</span>
        {capped && <em>SIESA limita el embarque; la necesidad restante pasa visible a producción.</em>}
        {kind === "production" && <div className="production-netting">
          <p>Demanda hasta la frontera · {m2(futureDemand ?? 0)}</p>
          <p>Bodega al corte actual · {m2(warehouse ?? 0)}</p>
          <p>Entradas calificadas · +{m2(incoming ?? 0)}</p>
          <p>Embarque foco no duplicado · +{m2(focusShipment ?? 0)}</p>
          <p>Saldo proyectado en la frontera · {m2(projectedBalance ?? 0)}</p>
          <p>Buffer objetivo por velocidad · {m2(buffer ?? 0)}</p>
          <p>Necesidad bruta · {m2(gross ?? initial)}</p>
          <p>Producción aprobada calificada · {m2(qualified ?? 0)}</p>
          <p>Producción nueva requerida · {m2(initial)}</p>
          {qualifiedRows?.map((row, index) => <p key={`${row.production_ref}-${index}`}>{row.production_ref} · {row.status === "in_progress" ? "En producción" : "Programada"} · {row.m2} m²</p>)}
          {excludedRows?.map((row, index) => <p key={`${row.production_ref}-${index}`}>{row.production_ref} · {row.excluded_reason === "completed_waiting_for_siesa_visibility" ? "Terminada, esperando visibilidad SIESA" : row.excluded_reason === "ready_after_anchor_cutoff" ? "No llega al corte del barco ancla" : "Excluida"} · no se descuenta</p>)}
        </div>}
      </div>;
    })}</div>
    {onReview && <button className="secondary" type="button" onClick={onReview}>{reviewLabel ?? (kind === "shipment" ? "Revisar pedido de embarque" : "Revisar pedido de producción")}</button>}
  </section>;
}

type Confirmation = "shipment-save" | "shipment-finalize" | "production-open" | "production-save" | "production-finalize";

export function Composer({ workspace, sourceHub = { sources: [] }, onFocusChange, onCalculate, onSourcesApplied, onResolve, onOrderAction }: { workspace: Workspace; sourceHub?: SourceHub; onFocusChange?: (id: string) => void; onCalculate?: (inputs: { focusSailingId: string; productionAnchorSailingId: string; factoryOrderDate: string }) => Promise<void>; onSourcesApplied?: () => void; onResolve?: (command: string, params: Record<string, unknown>) => Promise<void>; onOrderAction?: (command: string, params: Record<string, unknown>) => Promise<void> }) {
  const sailings = useMemo(() => [...workspace.sailing_rail].filter((boat) => boat.timing_state !== "departed").sort((a, b) => a.departure.localeCompare(b.departure)), [workspace.sailing_rail]);
  const initialFocus = sailings.find((boat) => boat.decision === "use")?.sailing_id ?? sailings[0]?.sailing_id ?? "";
  const initialFocusDate = sailings.find((boat) => boat.sailing_id === initialFocus)?.departure ?? "";
  const initialAnchor = sailings.find((boat) => boat.departure > initialFocusDate)?.sailing_id ?? initialFocus;
  const [view, setView] = useState<"planning" | "manual">("planning");
  const [focus, setFocus] = useState(initialFocus);
  const [anchor, setAnchor] = useState(initialAnchor);
  const defaultDate = workspace.review_provenance?.as_of ?? workspace.evidence_readiness.find((x) => x.as_of)?.as_of ?? new Date().toISOString().slice(0, 10);
  const [productionDate, setProductionDate] = useState(defaultDate);
  const [calculated, setCalculated] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [shipmentDraft, setShipmentDraft] = useState<Drafts>({});
  const [productionDraft, setProductionDraft] = useState<Drafts>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const serverBoundary = calculated && workspace.factory_planning
    ? sailings.find((boat) => boat.sailing_id === workspace.factory_planning?.coverage_boundary_sailing_id)
    : undefined;
  const ready = workspace.evidence_readiness.filter((item) => READY.has(item.status.toLowerCase())).length;
  const exceptions = workspace.attention.filter((item) => MATERIAL.has(item.severity.toLowerCase())).length;
  const shipmentRows = (workspace.plan?.rows ?? []).map((row: PlanRow) => ({ product: row.product, initial: n(row.selected_m2 ?? row.suggested_m2), capped: row.capped_by_availability }));
  const productionOrder = workspace.production_orders?.current ?? null;
  const previewProductionRows = workspace.progression.production_need.filter((row) => n(row.net_new_production_required_m2) > 0).map((row) => ({ product: row.product, initial: n(row.net_new_production_required_m2), gross: n(row.gross_future_factory_need_m2), qualified: n(row.qualified_approved_production_m2), futureDemand: n(row.future_demand_m2), buffer: n(row.buffer_m2), warehouse: n(row.projected_warehouse_m2), incoming: n(row.qualified_incoming_m2), focusShipment: n(row.focus_shipment_m2), projectedBalance: n(row.projected_boundary_balance_m2), qualifiedRows: row.qualified_production_rows, excludedRows: row.excluded_production_rows }));
  const productionRows = productionOrder?.lines.length
    ? productionOrder.lines.map((line) => ({
      product: line.product ?? workspace.progression.production_need.find((row) => row.product_id === line.product_id)?.product ?? { id: line.product_id, sku: line.product_id, name: line.product_id, m2_per_pallet: "67.20", edit_increment_m2: "67.20" },
      initial: n(line.selected_m2),
    }))
    : previewProductionRows;
  const productionDraftVersion = productionOrder
    ? `${productionOrder.production_order_id}:${productionOrder.lines.map((line) => `${line.product_id}:${line.selected_m2}`).join("|")}`
    : "";
  useEffect(() => {
    if (!productionOrder) return;
    setProductionDraft(Object.fromEntries(
      productionOrder.lines.map((line) => [line.product_id, n(line.selected_m2)]),
    ));
  }, [productionDraftVersion]);
  const productionEdits = productionOrder ? productionRows.flatMap((row) => {
    const selected = (productionDraft[row.product.id] ?? row.initial).toFixed(2);
    return selected === row.initial.toFixed(2)
      ? []
      : [{ product_id: row.product.id, m2: selected }];
  }) : [];
  const legalActions = [
    ...(workspace.legal_actions ?? []),
    ...(workspace.plan?.legal_actions ?? []),
    ...(workspace.production_orders?.open_actions ?? []),
    ...(workspace.production_orders?.legal_actions ?? []),
    ...(workspace.production_orders?.current?.legal_actions ?? []),
  ];
  const action = (command: string) => legalActions.find((item) => item.command === command);
  const shipmentSave = action("EditSelectedM2Batch");
  const shipmentFinalize = action("FinalizeSailingPlan");
  const productionOpen = action("OpenProductionOrder");
  const productionSave = action("EditProductionOrderBatch");
  const productionFinalize = action("FinalizeProductionOrder");
  const planning = workspace.factory_planning;
  const rawShipmentHandoffId = workspace.plan?.shipment_order_id
    ?? workspace.plan?.handoff?.order_id
    ?? workspace.plan?.handoff?.handoff_id;
  const shipmentHandoffId = typeof rawShipmentHandoffId === "string" ? rawShipmentHandoffId : null;
  const submitConfirmation = async () => {
    if (!confirmation || !onOrderAction || orderBusy) return;
    let command = "";
    let params: Record<string, unknown> = {};
    if (confirmation === "shipment-save" && shipmentSave && workspace.plan) {
      command = shipmentSave.command;
      params = { ...shipmentSave.params, edits: shipmentRows.map((row) => ({ product_id: row.product.id, m2: (shipmentDraft[row.product.id] ?? row.initial).toFixed(2) })) };
    } else if (confirmation === "shipment-finalize" && shipmentFinalize) {
      command = shipmentFinalize.command; params = shipmentFinalize.params;
    } else if (confirmation === "production-open" && productionOpen) {
      command = productionOpen.command; params = productionOpen.params;
    } else if (confirmation === "production-save" && productionSave && productionOrder) {
      command = productionSave.command;
      params = { ...productionSave.params, edits: productionEdits };
    } else if (confirmation === "production-finalize" && productionFinalize) {
      command = productionFinalize.command; params = productionFinalize.params;
    } else return;
    setOrderBusy(true); setOrderError(null);
    try { await onOrderAction(command, params); setConfirmation(null); }
    catch (caught) { setOrderError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setOrderBusy(false); }
  };
  const roster = [...(workspace.product_roster ?? [])].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier.localeCompare(b.tier);
    return (a.product.name ?? a.product.sku ?? a.product.id).localeCompare(
      b.product.name ?? b.product.sku ?? b.product.id, "es", { sensitivity: "base" });
  });
  const tierCopy = {
    A: { title: "Tier A · Alta velocidad", policy: "4 semanas · mínimo 5 pallets" },
    B: { title: "Tier B · Velocidad media", policy: "3 semanas · mínimo 3, máximo 15 pallets" },
    C: { title: "Tier C · Baja velocidad", policy: "2 semanas · mínimo 1, máximo 8 pallets" },
  } as const;

  return <main>
    <header className="app-header">
      <div className="brand"><div className="brandmark">FT</div><div><strong>Floor Tile</strong><span>Planeación de pedidos</span></div></div>
      <nav aria-label="Navegación principal"><button className={view === "planning" ? "nav-active" : ""} onClick={() => setView("planning")}>Planeación</button><button className={view === "manual" ? "nav-active" : ""} onClick={() => setView("manual")}>Carga manual</button><button disabled>Historial</button></nav>
      <span className="operator">Ashley <i /> Local</span>
    </header>

    {view === "manual" ? <ManualInput workspace={workspace} sourceHub={sourceHub} onApplied={onSourcesApplied} /> : <div className="page-wrap">
      <header className="workspace-heading"><div><span className="section-kicker">CICLO DE ABASTECIMIENTO</span><h1>Planeación de pedidos</h1><p>Selecciona las anclas, calcula y revisa los dos pedidos del ciclo.</p></div><span className="draft-state">VISTA PREVIA · SIN COMPROMISO</span></header>

      <section className="status-strip"><span><i className="status-dot ready" />{ready}/{workspace.evidence_readiness.length} fuentes listas</span><span><i className={`status-dot ${exceptions ? "attention" : "ready"}`} />{exceptions} {exceptions === 1 ? "excepción genuina" : "excepciones genuinas"}</span><button type="button" onClick={() => setView("manual")}>Actualizar fuentes ›</button></section>

      <Implications cases={workspace.attention} onResolve={onResolve} />

      <section className="composer" role="region" aria-label="Compositor del ciclo">
        <div className="section-head"><div><span className="section-kicker">ANCLAS DEL CÁLCULO</span><h2>Configurar ciclo</h2></div><span>3 entradas · 1 frontera derivada</span></div>
        <div className="cycle-map" aria-label="Anclas del ciclo">
          <label><b>01</b><span>Barco foco</span><select aria-label="Barco foco" value={focus} onChange={(e) => { const nextFocus = e.target.value; const nextDate = sailings.find((boat) => boat.sailing_id === nextFocus)?.departure ?? ""; setFocus(nextFocus); setAnchor(sailings.find((boat) => boat.departure > nextDate)?.sailing_id ?? nextFocus); setCalculated(false); setCalculationError(null); onFocusChange?.(nextFocus); }}>{sailings.map((boat) => <option value={boat.sailing_id} key={boat.sailing_id}>{boat.name} · {boat.departure}</option>)}</select></label>
          <label><b>02</b><span>Barco ancla de producción</span><select aria-label="Barco ancla de producción" value={anchor} onChange={(e) => { setAnchor(e.target.value); setCalculated(false); setCalculationError(null); }}>{sailings.filter((boat) => boat.departure > (sailings.find((item) => item.sailing_id === focus)?.departure ?? "") && sailings.some((candidate) => candidate.departure > boat.departure)).map((boat) => <option value={boat.sailing_id} key={boat.sailing_id}>{boat.name} · {boat.departure}</option>)}</select></label>
          <label><b>03</b><span>Fecha de orden a fábrica</span><input aria-label="Fecha de colocación de producción" type="date" value={productionDate} onChange={(e) => { setProductionDate(e.target.value); setCalculated(false); setCalculationError(null); }} /></label>
          <div className="boundary" data-testid="derived-boundary"><b>DERIVADA POR SERVIDOR</b><span>{serverBoundary?.name ?? "Se confirma al calcular"}</span><small>{serverBoundary ? `Cubre hasta ${serverBoundary.departure}` : "La interfaz no calcula esta frontera"}</small></div>
        </div>
        {!calculated && <button className="calculate" type="button" disabled={!focus || !anchor || !productionDate || !workspace.plan || calculating} onClick={() => {
          if (!onCalculate) { setCalculated(true); return; }
          setCalculating(true); setCalculationError(null);
          void onCalculate({ focusSailingId: focus, productionAnchorSailingId: anchor, factoryOrderDate: productionDate })
            .then(() => setCalculated(true))
            .catch((caught) => setCalculationError(caught instanceof Error ? caught.message : String(caught)))
            .finally(() => setCalculating(false));
        }}>{calculating ? "Calculando en servidor…" : "Calcular recomendaciones"}</button>}
        {calculationError && <p className="empty" role="alert">{calculationError}</p>}
        {!workspace.plan && <p className="empty">El backend no trae un borrador de embarque para este foco. Selecciona un barco con plan abierto.</p>}
      </section>

      {calculated && <section className="results" aria-live="polite">
        <div className="result-heading"><div><span className="section-kicker">RECOMENDACIÓN CALCULADA</span><h2>Dos pedidos coordinados</h2><p>El embarque usa disponibilidad SIESA actual; fábrica protege el ciclo futuro hasta la frontera derivada.</p>{workspace.factory_planning && <small>Orden {workspace.factory_planning.factory_order_date} · lista para ancla hasta {workspace.factory_planning.anchor_production_readiness} · cobertura hasta {workspace.factory_planning.coverage_through}{workspace.factory_planning.order_timing_state !== "on_time" ? " · atención: fecha fuera de la ventana del ancla" : ""}</small>}</div><div><button type="button" className="secondary" onClick={() => downloadRecommendations(workspace)}>Exportar recomendaciones CSV</button><button type="button" className="text-button" onClick={() => setCalculated(false)}>Cambiar anclas</button></div></div>
        <div className="orders">
          <OrderSummary
            kind="shipment"
            title="Embarque propuesto"
            rows={shipmentRows}
            values={shipmentDraft}
            onChange={(id, value) => setShipmentDraft((old) => ({ ...old, [id]: value }))}
            onReview={shipmentSave ? () => setConfirmation("shipment-save") : undefined}
            reviewLabel="Revisar pedido de embarque"
          />
          <OrderSummary
            kind="production"
            title={productionOrder ? "Orden de producción" : "Producción propuesta"}
            rows={productionRows}
            values={productionDraft}
            onChange={(id, value) => setProductionDraft((old) => ({ ...old, [id]: value }))}
            onReview={productionOpen ? () => setConfirmation("production-open") : productionSave && productionEdits.length ? () => setConfirmation("production-save") : undefined}
            reviewLabel={productionSave ? "Guardar borrador de producción" : "Revisar pedido de producción"}
          />
        </div>
        {shipmentFinalize && <button className="secondary order-finalize" type="button" onClick={() => setConfirmation("shipment-finalize")}>Finalizar plan de embarque</button>}
        {productionFinalize && <button className="secondary order-finalize" type="button" onClick={() => setConfirmation("production-finalize")}>Finalizar orden de producción</button>}
        {(workspace.plan?.handoff || productionOrder?.handoff) && <section className="handoffs" aria-label="Resultados confirmados">
          {workspace.plan?.handoff && shipmentHandoffId && <p><strong>Embarque {shipmentHandoffId}</strong> · resultado devuelto por el servidor</p>}
          {productionOrder?.handoff && <p><strong>Producción {productionOrder.production_order_id}</strong> · resultado devuelto por el servidor</p>}
          <small>Son identidades independientes. Marea no envía órdenes ni confirma suministro, compromiso o alistamiento externo.</small>
        </section>}
        {orderError && <p className="empty" role="alert">{orderError}</p>}
        <p className="manual-gate">Finalizar sigue siendo una acción manual e independiente en cada pedido. Esta vista no crea órdenes ni escribe en SIESA.</p>
      </section>}

      {confirmation && <div className="confirmation-backdrop">
        <section className="confirmation" role="dialog" aria-modal="true" aria-label={confirmation.startsWith("shipment") ? "Confirmar pedido de embarque" : "Confirmar pedido de producción"}>
          <h2>{confirmation === "shipment-save" ? "Confirmar cambios de embarque" : confirmation === "shipment-finalize" ? "Finalizar plan de embarque" : confirmation === "production-open" ? "Abrir orden de producción" : confirmation === "production-save" ? "Guardar borrador de producción" : "Finalizar orden de producción"}</h2>
          {confirmation === "shipment-save" && <>
            <ul>{shipmentRows.map((row) => { const value = shipmentDraft[row.product.id] ?? row.initial; return <li key={row.product.id}>{row.product.name ?? row.product.id} · {value === 0 ? "Posponer" : `${value.toFixed(2)} m²`}</li>; })}</ul>
            <p>Este guardado es interno y no envía el pedido a SIESA.</p>
          </>}
          {confirmation === "production-open" && <>
            <p>{planning?.focus_sailing_id} · {planning?.production_anchor_sailing_id} · {planning?.coverage_boundary_sailing_id}</p>
            <p>Fecha de orden: {planning?.factory_order_date} · huella {String(productionOpen?.params.candidate_fingerprint ?? planning?.candidate_fingerprint ?? "")} · cabeza {planning?.calculation_head_seq ?? workspace.head_seq}</p>
            <p>La entrada manual en SIESA es responsabilidad del operador; Marea no envía esta orden.</p>
          </>}
          {confirmation === "shipment-finalize" && <p>Esta confirmación congela solo el plan de embarque y muestra el resultado del servidor.</p>}
          {confirmation === "production-save" && <p>Guarda únicamente este borrador de producción. No modifica el embarque.</p>}
          {confirmation === "production-finalize" && <p>Finaliza únicamente la orden de producción. No confirma alistamiento ni modifica el embarque.</p>}
          <div className="confirmation-actions">
            <button autoFocus type="button" onClick={() => setConfirmation(null)} disabled={orderBusy}>Cancelar</button>
            <button className="calculate" type="button" disabled={orderBusy} onClick={() => void submitConfirmation()}>{orderBusy ? "Confirmando…" : confirmation === "shipment-save" ? "Confirmar guardado de embarque" : confirmation === "shipment-finalize" ? "Confirmar finalización de embarque" : confirmation === "production-open" ? "Confirmar apertura de producción" : confirmation === "production-save" ? "Confirmar guardado de producción" : "Confirmar finalización de producción"}</button>
          </div>
        </section>
      </div>}

      <details className="ledger"><summary>Roster de productos y buffers <span>{roster.length} productos · Ver detalle ›</span></summary><div className="product-roster" role="region" aria-label="Roster completo de productos">{(["A", "B", "C"] as const).map((tier) => <section className={`ledger-tier tier-${tier.toLowerCase()}`} key={tier}><header><div><strong>{tierCopy[tier].title}</strong><span>{tierCopy[tier].policy}</span></div><b>{roster.filter((row) => row.tier === tier).length}</b></header><div className="ledger-grid">{roster.filter((row) => row.tier === tier).map((row) => <article key={row.product.id}><strong>{row.product.name ?? row.product.sku ?? row.product.id}</strong><small>{row.product.sku ?? row.product.id}</small><span>Velocidad {row.daily_velocity_m2} m²/día</span><span>Buffer {row.buffer_m2} m²</span><em>Base: {row.velocity_basis_days} días de ventas</em></article>)}</div></section>)}</div></details>
    </div>}
  </main>;
}
