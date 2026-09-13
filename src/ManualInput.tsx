import { useMemo, useRef, useState } from "react";
import { applyPreview, previewFile, previewRows } from "./api";
import type { InputPreview, SourceHub, SourceRow, Workspace } from "./contracts";

type SourceKey = "sailings" | "warehouse" | "sales" | "siesa" | "transit" | "production";
type DraftRow = SourceRow & { _draftId: string; _new?: boolean; confirmed?: boolean };

const sources: Array<{ key: SourceKey; feed: string; title: string; description: string; file: string }> = [
  { key: "sailings", feed: "sailing_calendar", title: "Programa de barcos", description: "salidas disponibles y nuevas ventanas", file: "Tabla de Booking / calendario de zarpes" },
  { key: "warehouse", feed: "warehouse", title: "Inventario de bodega", description: "existencia utilizable por producto", file: "Inventario_Detallado_REAL.xlsx" },
  { key: "sales", feed: "sales", title: "Ventas / rotación", description: "historial que deriva la necesidad", file: "REPORTE VENTAS PERPETUO.xlsx" },
  { key: "siesa", feed: "siesa_availability", title: "Disponibilidad SIESA", description: "material disponible para embarcar", file: "inventario 2026.xlsx" },
  { key: "transit", feed: "in_transit", title: "En tránsito", description: "material, barco y llegada esperada", file: "PROGRAMACIÓN DE DESPACHO DE TARRAGONA.xlsx" },
  { key: "production", feed: "production_planning", title: "Producción en fábrica", description: "órdenes activas y fecha estimada de alistamiento", file: "PLAN_DE_PRODUCCION.pdf" },
];

const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function shortDate(value?: string | null) {
  if (!value) return "Sin fecha";
  const [year, month, day] = value.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${months[month - 1]} ${year}`;
}

function quantity(row: SourceRow, key: SourceKey) {
  if (key === "sales") return row.daily_velocity ? `${row.daily_velocity} m²/día` : "—";
  return `${row.available_m2 ?? row.m2 ?? "0.00"} m²`;
}

function draftsFrom(rows: SourceRow[]): DraftRow[] {
  return rows.map((row, index) => ({ ...row, _draftId: `${row.product_id ?? "row"}-${row.reference ?? ""}-${index}` }));
}

function productLabel(row: SourceRow) {
  return row.product_name || row.product_sku || row.product_id || "Producto sin identificar";
}

export function ManualInput({ workspace, sourceHub, onApplied }: { workspace: Workspace; sourceHub: SourceHub; onApplied?: () => void }) {
  const [active, setActive] = useState<SourceKey>("sailings");
  const activeSource = useRef<SourceKey>("sailings");
  const stageGeneration = useRef(0);
  const [addingBoat, setAddingBoat] = useState(false);
  const [boat, setBoat] = useState({ carrier: "", name: "", departure: "", voyage_days: "15" });
  const [preview, setPreview] = useState<InputPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftRow[]>([]);
  const [addingTransitBoat, setAddingTransitBoat] = useState(false);
  const [transitBoat, setTransitBoat] = useState({ sailing_id: "", reference: "", eta: "", confirmed: false });
  const [transitQuantities, setTransitQuantities] = useState<Record<string, string>>({});
  const config = sources.find((item) => item.key === active)!;
  const state = sourceHub.sources.find((item) => item.feed === config.feed);
  const currentRows = state?.current_rows ?? [];
  const sailings = useMemo(() => [...workspace.sailing_rail].sort((a, b) => a.departure.localeCompare(b.departure)), [workspace.sailing_rail]);
  const productOptions = useMemo(() => {
    const found = new Map<string, { id: string; productId: string; name: string }>();
    for (const row of workspace.product_roster ?? []) {
      const sku = row.product.sku || row.product.name || row.product.id;
      found.set(sku, { id: sku, productId: row.product.id, name: row.product.name || sku });
    }
    sourceHub.sources.flatMap((item) => item.current_rows).forEach((row) => {
      const id = row.product_sku || row.product_id;
      if (id && !found.has(id)) found.set(id, { id, productId: row.product_id || id, name: productLabel(row) });
    });
    return [...found.values()];
  }, [sourceHub, workspace.product_roster]);
  const transitGroups = useMemo(() => {
    const grouped = new Map<string, { sailingId?: string; boatName: string; reference: string; eta?: string | null; rows: SourceRow[] }>();
    for (const row of currentRows) {
      const sailing = sailings.find((item) => item.sailing_id === row.sailing_id || item.name === row.reference);
      const key = row.sailing_id || sailing?.sailing_id || row.reference || "unassigned";
      const group = grouped.get(key) ?? { sailingId: row.sailing_id || sailing?.sailing_id, boatName: sailing?.name || row.reference || "Barco por confirmar", reference: row.reference || "", eta: row.eta, rows: [] };
      group.rows.push(row); grouped.set(key, group);
    }
    return [...grouped.values()];
  }, [active, currentRows, sailings]);

  function chooseSource(key: SourceKey) {
    activeSource.current = key;
    stageGeneration.current += 1;
    setActive(key); setPreview(null); setError(null); setBusy(false); setEditing(false); setDraftRows([]); setAddingTransitBoat(false);
  }

  function beginStageRequest(source: SourceKey) {
    const generation = ++stageGeneration.current;
    return () => stageGeneration.current === generation && activeSource.current === source;
  }

  function beginEditing() {
    setDraftRows(draftsFrom(currentRows)); setPreview(null); setError(null); setEditing(true); setAddingTransitBoat(false);
  }

  function updateDraft(id: string, field: keyof SourceRow | "confirmed", value: string | boolean) {
    setDraftRows((rows) => rows.map((row) => row._draftId === id ? { ...row, [field]: value } : row));
  }

  function addDraftRow() {
    if (active === "production") {
      setDraftRows((rows) => [...rows, {
        _draftId: `new-production-${Date.now()}-${rows.length}`,
        _new: true,
        product_id: productOptions[0]?.id ?? "",
        product_sku: productOptions[0]?.id ?? "",
        product_name: productOptions[0]?.name ?? "",
        m2: "0",
        status: "scheduled",
        production_ref: "",
        estimated_ready_date: "",
        evidence_as_of: new Date().toISOString().slice(0, 10),
        completion_confirmed: false,
        can_add_more: false,
      }]);
      return;
    }
    setDraftRows((rows) => [...rows, {
      _draftId: `new-${Date.now()}-${rows.length}`,
      _new: true,
      product_id: productOptions[0]?.id ?? "",
      product_sku: productOptions[0]?.id ?? "",
      product_name: productOptions[0]?.name ?? "",
      m2: "0",
      available_m2: "0",
      daily_velocity: "0",
      reference: "",
      eta: "",
      confirmed: active !== "transit",
    }]);
  }

  function openTransitBoat() {
    setTransitBoat({ sailing_id: sailings[0]?.sailing_id ?? "", reference: "", eta: "", confirmed: false });
    setTransitQuantities({}); setAddingTransitBoat(true); setError(null);
  }

  function suggestTransitProducts() {
    const suggested: Record<string, string> = {};
    for (const row of workspace.plan?.rows ?? []) {
      const value = Number(row.selected_m2 ?? row.suggested_m2 ?? 0);
      const ref = row.product.sku || row.product.name || row.product.id;
      if (value > 0) suggested[ref] = value.toFixed(2);
    }
    setTransitQuantities(suggested);
  }

  function addTransitProducts() {
    const sailing = sailings.find((item) => item.sailing_id === transitBoat.sailing_id);
    const selected = Object.entries(transitQuantities).filter(([, value]) => Number(value) > 0);
    if (!sailing || !transitBoat.reference || !transitBoat.eta || !transitBoat.confirmed || !selected.length) {
      setError("Selecciona el barco, registra BL o booking, confirma la salida, indica la llegada y agrega al menos un producto.");
      return;
    }
    setDraftRows((rows) => [...rows, ...selected.map(([productId, value], index) => {
      const product = productOptions.find((item) => item.id === productId);
      return {
        _draftId: `new-transit-${Date.now()}-${index}`,
        _new: true, confirmed: true, sailing_id: sailing.sailing_id,
        product_id: product?.productId ?? productId, product_sku: productId, product_name: product?.name ?? productId,
        m2: value, reference: transitBoat.reference, eta: transitBoat.eta,
      } satisfies DraftRow;
    })]);
    setAddingTransitBoat(false); setTransitQuantities({}); setError(null);
  }

  async function stageFile(file?: File) {
    if (!file) return;
    const source = active;
    const isCurrent = beginStageRequest(source);
    setBusy(true); setError(null); setPreview(null);
    try {
      const nextPreview = await previewFile(config.feed, file, new Date().toISOString().slice(0, 10));
      if (isCurrent()) setPreview(nextPreview);
    } catch (caught) {
      if (isCurrent()) setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  async function stageBoat() {
    const source = active;
    const isCurrent = beginStageRequest(source);
    setBusy(true); setError(null);
    try {
      const nextPreview = await previewRows("sailing_calendar", [{ ...boat, voyage_days: Number(boat.voyage_days) }], new Date().toISOString().slice(0, 10));
      if (isCurrent()) setPreview(nextPreview);
    } catch (caught) {
      if (isCurrent()) setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  async function stageManualRows() {
    const invalidNewTransit = draftRows.some((row) => row._new && (!row.confirmed || !row.reference || !row.eta));
    if (invalidNewTransit && active === "transit") {
      setError("Cada carga nueva necesita barco o referencia, llegada esperada y confirmación de salida/BL antes de contar como tránsito.");
      return;
    }
    const rows = draftRows.map((row) => {
      const product_ref = row.product_sku || row.product_id || "";
      if (active === "warehouse") return { product_ref, m2: Number(row.m2 || 0) };
      if (active === "sales") return { product_ref, daily_velocity: Number(row.daily_velocity || 0), ...(row.peak_weekly_m2 ? { peak_weekly_m2: Number(row.peak_weekly_m2) } : {}) };
      if (active === "siesa") return { product_ref, available_m2: Number(row.available_m2 || 0), ...(row.committed_m2 ? { committed_m2: Number(row.committed_m2) } : {}) };
      if (active === "production") return {
        product_ref, m2: Number(row.m2 || 0), status: row.status,
        production_ref: row.production_ref,
        estimated_ready_date: row.estimated_ready_date,
        evidence_as_of: row.evidence_as_of,
        completion_confirmed: row.completion_confirmed,
        can_add_more: row.can_add_more,
      };
      return { product_ref, m2: Number(row.m2 || 0), reference: row.reference || "", eta: row.eta || "", ...(row.sailing_id ? { sailing_id: row.sailing_id } : {}) };
    });
    if (rows.some((row) => !row.product_ref)) { setError("Cada fila necesita un producto antes de revisarla."); return; }
    const source = active;
    const isCurrent = beginStageRequest(source);
    setBusy(true); setError(null); setPreview(null);
    try {
      const nextPreview = await previewRows(config.feed, rows, new Date().toISOString().slice(0, 10));
      if (isCurrent()) setPreview(nextPreview);
    } catch (caught) {
      if (isCurrent()) setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  async function apply() {
    if (!preview?.apply_token) return;
    setBusy(true); setError(null);
    try { await applyPreview(preview.apply_token); setPreview(null); setAddingBoat(false); setEditing(false); onApplied?.(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : String(caught)); }
    finally { setBusy(false); }
  }

  const productSelect = (row: DraftRow, aria: string) => <select aria-label={aria} value={row.product_sku || row.product_id || ""} onChange={(event) => {
    const option = productOptions.find((item) => item.id === event.target.value);
    setDraftRows((rows) => rows.map((item) => item._draftId === row._draftId ? { ...item, product_id: event.target.value, product_sku: event.target.value, product_name: option?.name ?? event.target.value } : item));
  }}>{productOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>;

  return <section className="manual-workspace" aria-label="Carga manual de fuentes">
    <header className="workspace-heading">
      <div><span className="section-kicker">ENTRADA OPERATIVA</span><h1>Carga manual</h1><p>Ashley puede reemplazar un archivo o corregir filas directamente. Ambos caminos se revisan antes de aplicar.</p></div>
      <span className="draft-state">PREVISUALIZAR → APLICAR</span>
    </header>

    <div className="intake-layout">
      <nav className="source-list" aria-label="Fuentes manuales">
        <span className="section-kicker">FUENTES REALES</span>
        {sources.map((source) => { const sourceState = sourceHub.sources.find((item) => item.feed === source.feed); return <button type="button" aria-label={source.title} className={active === source.key ? "source-active" : ""} key={source.key} onClick={() => chooseSource(source.key)}>
          <span><strong>{source.title}</strong><small>{source.description}</small></span>
          <i className={sourceState?.status === "ready" ? "status-ready" : "status-review"}>{sourceState?.status === "ready" ? "Lista" : "Revisar"}</i>
        </button>; })}
      </nav>

      <section className="entry-panel">
        <div className="entry-panel-head"><div><span className="section-kicker">{config.file}</span><h2>{config.title}</h2></div><span>{state?.as_of ? `Corte ${shortDate(state.as_of)}` : "Sin corte confirmado"}</span></div>

        {active === "sailings" && <>
          <div className="source-toolbar"><p>Ashley puede agregar cada barco sin reconstruir el archivo. La corrección de una salida existente conserva el control de identidad en revisión.</p><button type="button" className="secondary" onClick={() => setAddingBoat((value) => !value)}>Agregar barco</button></div>
          {addingBoat && <div className="new-boat-form">
            <label>Naviera<input aria-label="Naviera del nuevo barco" value={boat.carrier} onChange={(event) => setBoat({ ...boat, carrier: event.target.value })} /></label>
            <label>Barco<input aria-label="Nombre del nuevo barco" value={boat.name} onChange={(event) => setBoat({ ...boat, name: event.target.value })} /></label>
            <label>Salida<input aria-label="Salida del nuevo barco" type="date" value={boat.departure} onChange={(event) => setBoat({ ...boat, departure: event.target.value })} /></label>
            <label>Días de viaje<input aria-label="Días de viaje del nuevo barco" type="number" min="1" value={boat.voyage_days} onChange={(event) => setBoat({ ...boat, voyage_days: event.target.value })} /></label>
            <button type="button" className="calculate" disabled={busy || !boat.carrier || !boat.name || !boat.departure} onClick={() => void stageBoat()}>Revisar nuevo barco</button>
          </div>}
          <div className="intake-table sailing-inputs"><div className="intake-row intake-head"><span>Barco</span><span>Salida</span><span>Estado</span></div>{sailings.map((item) => <div className="intake-row" key={item.sailing_id}><span><strong>{item.name}</strong><small>{item.sailing_id}</small></span><span>{shortDate(item.departure)}</span><span className="unit">{item.timing_state}</span></div>)}</div>
        </>}

        {active === "transit" && <>
          <div className="truth-note"><strong>Regla de verdad</strong><span>La programación de despacho no confirma que el barco haya salido. Solo material con salida/BL confirmada se cuenta como en tránsito.</span></div>
          {!editing && <><div className="source-toolbar"><p>Puede ajustar una carga confirmada o registrar una nueva sin subir todo el archivo.</p><button type="button" className="secondary" onClick={beginEditing}>Editar tránsito manualmente</button></div>
          <div className="transit-list">{transitGroups.length ? transitGroups.map((group) => { const sailing = sailings.find((item) => item.sailing_id === group.sailingId || item.name === group.boatName); return <article className="transit-card" key={group.sailingId || group.reference}>
            <header><strong>{group.boatName}</strong><span>EN TRÁNSITO CONFIRMADO</span></header>
            {group.reference && group.reference !== group.boatName && <small>BL / booking · {group.reference}</small>}
            {group.rows.map((row, index) => <div key={`${row.product_id}-${index}`}><span>{productLabel(row)}</span><b>{quantity(row, active)}</b></div>)}
            <footer><span>Salida {shortDate(sailing?.departure)}</span><span>Llegada {shortDate(group.eta)}</span></footer>
          </article>; }) : <p className="empty">No hay material confirmado en tránsito en el corte actual.</p>}</div></>}
          {editing && <div className="manual-editor">
            <div className="manual-editor-head"><strong>Tránsito confirmado por barco</strong><button type="button" className="secondary" onClick={openTransitBoat}>Agregar barco en tránsito</button></div>
            {addingTransitBoat && <section className="new-boat-form" aria-label="Nueva carga por barco">
              <label>Barco<select aria-label="Barco de nueva carga" value={transitBoat.sailing_id} onChange={(event) => setTransitBoat({ ...transitBoat, sailing_id: event.target.value })}>{sailings.map((item) => <option value={item.sailing_id} key={item.sailing_id}>{item.name} · {item.departure}</option>)}</select></label>
              <label>BL / booking<input aria-label="Referencia BL o booking de nueva carga" value={transitBoat.reference} onChange={(event) => setTransitBoat({ ...transitBoat, reference: event.target.value })} /></label>
              <label>Llegada esperada<input type="date" aria-label="Llegada esperada del barco" value={transitBoat.eta} onChange={(event) => setTransitBoat({ ...transitBoat, eta: event.target.value })} /></label>
              <label className="confirm-authority"><input type="checkbox" aria-label="Confirmar salida o BL del barco" checked={transitBoat.confirmed} onChange={(event) => setTransitBoat({ ...transitBoat, confirmed: event.target.checked })} /> Salida o BL confirmada</label>
              <div className="manual-editor-head"><strong>Productos en este barco</strong><button type="button" className="secondary" onClick={suggestTransitProducts}>Sugerir productos del pedido</button></div>
              <div className="transit-product-picker">{productOptions.map((product) => { const value = transitQuantities[product.id] ?? ""; return <label key={product.id} className="confirm-authority"><input type="checkbox" aria-label={`Incluir ${product.name}`} checked={Number(value) > 0} onChange={(event) => setTransitQuantities((current) => ({ ...current, [product.id]: event.target.checked ? (current[product.id] || "67.20") : "" }))} />{product.name}<input type="number" min="0" step="67.20" aria-label={`${product.name} m² sugeridos`} value={value} onChange={(event) => setTransitQuantities((current) => ({ ...current, [product.id]: event.target.value }))} /></label>; })}</div>
              <div className="manual-editor-actions"><button type="button" className="secondary" onClick={() => setAddingTransitBoat(false)}>Cancelar carga</button><button type="button" className="calculate" onClick={addTransitProducts}>Agregar productos seleccionados</button></div>
            </section>}
            {draftRows.map((row) => <div className="manual-row transit-manual-row" key={row._draftId}>
              <span><strong>{productLabel(row)}</strong><small>{row.product_sku || row.product_id}</small></span>
              <label>m²<input type="number" min="0" aria-label={`${productLabel(row)} m² en tránsito`} value={row.m2 ?? ""} onChange={(event) => updateDraft(row._draftId, "m2", event.target.value)} /></label>
              <label>Barco<select aria-label={`${productLabel(row)} barco en tránsito`} value={row.sailing_id || sailings.find((item) => item.name === row.reference)?.sailing_id || ""} onChange={(event) => updateDraft(row._draftId, "sailing_id", event.target.value)}><option value="">Sin vínculo</option>{sailings.map((item) => <option value={item.sailing_id} key={item.sailing_id}>{item.name}</option>)}</select></label>
              <label>BL / booking<input aria-label={`${productLabel(row)} BL o booking`} value={row.reference ?? ""} onChange={(event) => updateDraft(row._draftId, "reference", event.target.value)} /></label>
              <label>Llegada esperada<input type="date" aria-label={`${productLabel(row)} llegada esperada`} value={row.eta ?? ""} onChange={(event) => updateDraft(row._draftId, "eta", event.target.value)} /></label>
              <button type="button" className="remove-row" onClick={() => setDraftRows((rows) => rows.filter((item) => item._draftId !== row._draftId))}>Quitar</button>
            </div>)}
            <p className="manual-warning">La revisión reconcilia el conjunto completo: altas, cambios y omisiones por barco, BL y producto. Nada cambia hasta aplicar.</p>
            <div className="manual-editor-actions"><button type="button" className="secondary" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="calculate" disabled={busy || addingTransitBoat} onClick={() => void stageManualRows()}>Revisar cambios manuales</button></div>
          </div>}
        </>}

        {active === "production" && <>
          <div className="truth-note"><strong>Contexto de fábrica</strong><span>Estas filas reducen únicamente la nueva producción sugerida cuando están activas y completas. Nunca aumentan la disponibilidad SIESA del embarque.</span></div>
          {!editing ? <><div className="source-toolbar"><p>Revisa referencia, estado, m² y fecha estimada antes de aplicar cambios.</p><button type="button" className="secondary" onClick={beginEditing}>Editar producción manualmente</button></div>
          <div className="transit-list">{currentRows.length ? currentRows.map((row, index) => <article className="transit-card" key={`${row.product_id}-${row.production_ref}-${index}`}>
            <header><strong>{row.production_ref || "Referencia pendiente"}</strong><span>{row.status === "in_progress" ? "En producción" : row.status === "scheduled" ? "Programada" : row.status === "completed" ? "Terminada" : row.status}</span></header>
            <div><span>{productLabel(row)}</span><b>{quantity(row, active)}</b></div>
            <footer><span>Corte {shortDate(row.evidence_as_of || state?.as_of)}</span><span>Lista estimada {shortDate(row.estimated_ready_date)}</span></footer>
          </article>) : <p className="empty">No hay producción de fábrica registrada en el corte actual.</p>}</div></> : <div className="manual-editor">
            <div className="manual-editor-head"><strong>Ajuste directo de producción en fábrica</strong><button type="button" className="secondary" onClick={addDraftRow}>Agregar producción</button></div>
            {draftRows.map((row) => <div className="manual-row" key={row._draftId}>
              {row._new ? productSelect(row, "Producto de nueva producción") : <span><strong>{productLabel(row)}</strong><small>{row.product_sku || row.product_id}</small></span>}
              <label>m²<input type="number" min="0" aria-label={`${productLabel(row)} m² en producción`} value={row.m2 ?? ""} onChange={(event) => updateDraft(row._draftId, "m2", event.target.value)} /></label>
              <label>Referencia<input aria-label={row._new ? "Referencia de nueva producción" : `${productLabel(row)} referencia de producción`} value={row.production_ref ?? ""} onChange={(event) => updateDraft(row._draftId, "production_ref", event.target.value)} /></label>
              <label>Estado<select aria-label={row._new ? "Estado de nueva producción" : `${productLabel(row)} estado de producción`} value={row.status ?? "scheduled"} onChange={(event) => setDraftRows((rows) => rows.map((item) => item._draftId === row._draftId ? { ...item, status: event.target.value, completion_confirmed: event.target.value === "completed" } : item))}><option value="scheduled">Programada</option><option value="in_progress">En producción</option><option value="completed">Terminada</option></select></label>
              <label>Alistamiento estimado<input type="date" aria-label={row._new ? "Alistamiento estimado de nueva producción" : `${productLabel(row)} fecha estimada de alistamiento`} value={row.estimated_ready_date ?? ""} onChange={(event) => updateDraft(row._draftId, "estimated_ready_date", event.target.value)} /></label>
              <label className="confirm-authority"><input type="checkbox" aria-label={`${productLabel(row)} admite ampliación`} checked={!!row.can_add_more} onChange={(event) => updateDraft(row._draftId, "can_add_more", event.target.checked)} /> Admite ampliar antes de iniciar</label>
              <button type="button" className="remove-row" onClick={() => setDraftRows((rows) => rows.filter((item) => item._draftId !== row._draftId))}>Quitar</button>
            </div>)}
            <p className="manual-warning">Quitar una fila o cambiar su estado aparecerá en la previsualización. Nada cambia hasta aplicar.</p>
            <div className="manual-editor-actions"><button type="button" className="secondary" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="calculate" disabled={busy} onClick={() => void stageManualRows()}>Revisar cambios manuales</button></div>
          </div>}
        </>}

        {(active === "warehouse" || active === "sales" || active === "siesa") && <>
          {!editing ? <><div className="source-toolbar"><p>Puede corregir cantidades o agregar productos sin preparar un archivo nuevo.</p><button type="button" className="secondary" onClick={beginEditing}>Editar manualmente</button></div>
          <div className="intake-table"><div className="intake-row intake-head"><span>Producto</span><span>Valor vigente</span><span>Corte</span></div>
            {currentRows.length ? currentRows.map((row, index) => <div className="intake-row" key={`${row.product_id}-${index}`}><span><strong>{productLabel(row)}</strong><small>{row.product_sku}</small></span><b>{quantity(row, active)}</b><span className="unit">{shortDate(state?.as_of)}</span></div>) : <p className="empty">La fuente no expone filas vigentes todavía.</p>}
            {active === "sales" && <p className="source-explanation">La demanda del ciclo no se digita. El sistema la calcula desde esta velocidad de venta y las fechas de los barcos.</p>}
          </div></> : <div className="manual-editor">
            <div className="manual-editor-head"><strong>Edición directa · reemplazo completo revisado</strong><button type="button" className="secondary" onClick={addDraftRow}>Agregar producto</button></div>
            {draftRows.map((row) => <div className="manual-row" key={row._draftId}>
              {row._new ? productSelect(row, "Producto nuevo") : <span><strong>{productLabel(row)}</strong><small>{row.product_sku || row.product_id}</small></span>}
              {active === "warehouse" && <label>Inventario m²<input type="number" min="0" aria-label={`${productLabel(row)} inventario de bodega`} value={row.m2 ?? ""} onChange={(event) => updateDraft(row._draftId, "m2", event.target.value)} /></label>}
              {active === "sales" && <label>Velocidad m²/día<input type="number" min="0" step="0.01" aria-label={`${productLabel(row)} velocidad de venta`} value={row.daily_velocity ?? ""} onChange={(event) => updateDraft(row._draftId, "daily_velocity", event.target.value)} /></label>}
              {active === "siesa" && <label>Disponible m²<input type="number" min="0" aria-label={`${productLabel(row)} disponibilidad SIESA`} value={row.available_m2 ?? ""} onChange={(event) => updateDraft(row._draftId, "available_m2", event.target.value)} /></label>}
              <button type="button" className="remove-row" onClick={() => setDraftRows((rows) => rows.filter((item) => item._draftId !== row._draftId))}>Quitar</button>
            </div>)}
            <p className="manual-warning">Quitar una fila la mostrará como omisión en la previsualización. Nada cambia hasta aplicar.</p>
            <div className="manual-editor-actions"><button type="button" className="secondary" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="calculate" disabled={busy} onClick={() => void stageManualRows()}>Revisar cambios manuales</button></div>
          </div>}
        </>}

        {active !== "sailings" && !editing && <section className="file-update">
          <div><strong>Actualizar desde archivo</strong><span>{active === "transit" ? "Sube PROGRAMACIÓN DE DESPACHO DE TARRAGONA.xlsx o una tabla CSV/TXT. El Excel se carga como programación tentativa; no se convierte silenciosamente en tránsito." : active === "production" ? "Sube PLAN_DE_PRODUCCION.pdf. Primero verás la previsualización normalizada; nada cambia hasta aplicar." : "Sube el Excel XLSX operativo o una tabla CSV/TXT. Primero verás altas, cambios, omisiones y filas por corregir."}</span></div>
          <label className="file-button">{busy ? "Leyendo archivo…" : "Seleccionar archivo"}<input aria-label={`Actualizar archivo de ${config.title}`} type="file" accept={active === "transit" ? ".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" : active === "production" ? ".pdf,application/pdf" : ".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"} onChange={(event) => void stageFile(event.target.files?.[0])} /></label>
        </section>}

        {preview && <section className={`preview-box ${preview.can_apply ? "preview-ready" : "preview-blocked"}`} aria-live="polite">
          <div><strong>Previsualización</strong><span>{preview.summary.valid} válidas · {preview.summary.held} por conciliar · {preview.summary.invalid} inválidas</span></div>
          {preview.replacement_effect.counts && <p>{preview.replacement_effect.counts.added} altas · {preview.replacement_effect.counts.changed} cambios · {preview.replacement_effect.counts.omitted} omisiones</p>}
          {!!preview.adapter_diagnostics?.length && <div className="adapter-diagnostics" aria-label="Diagnóstico del archivo">
            {preview.adapter_diagnostics.map((diagnostic, index) => <p key={`${diagnostic.source_row_ref}-${index}`}><strong>{diagnostic.severity === "error" ? "Error" : "Advertencia"}:</strong> {diagnostic.message}</p>)}
          </div>}
          {!!preview.unmatched_products?.length && <p>{preview.unmatched_products.length} {preview.unmatched_products.length === 1 ? "producto sin conciliar" : "productos sin conciliar"}</p>}
          <button type="button" disabled={!preview.can_apply || busy} onClick={() => void apply()}>Aplicar y actualizar planeación</button>
        </section>}
        {preview?.scheduled_orders && <section className="scheduled-preview">
          <strong>Despachos detectados · todavía no cuentan como tránsito</strong>
          {preview.scheduled_orders.map((order) => <article key={order.purchase_order}>
            <div><b>{order.booking || order.purchase_order}</b><span>{order.lines.length} productos</span></div>
            <p>Salida tentativa {shortDate(order.etd_tentative)} · llegada tentativa {shortDate(order.eta_tentative)}</p>
            {!!order.quality_flags.length && <em>Fecha inconsistente: requiere corrección antes de confirmar.</em>}
          </article>)}
        </section>}
        {error && <div className="save-confirmation" role="alert">{error}</div>}
        <footer className="entry-actions"><p>Aplicar recalcula borradores abiertos, conserva cantidades ya revisadas y nunca escribe en SIESA ni crea órdenes. En este prototipo local, los cambios no son persistencia de producción.</p></footer>
      </section>
    </div>
  </section>;
}
