import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Composer } from "./Composer";
import type { Workspace } from "./contracts";

const workspace: Workspace = {
  workspace_schema_version: 2,
  head_seq: 17,
  demo_banner: "REVISIÓN LOCAL · NO ES VERDAD ACTUAL",
  sailing_rail: [
    { sailing_id: "S0", name: "SEABOARD ANTERIOR", departure: "2026-08-16", timing_state: "late", decision: "available" },
    { sailing_id: "S1", name: "SEABOARD GALAXI", departure: "2026-08-30", timing_state: "normal", decision: "use" },
    { sailing_id: "S2", name: "SEABOARD PIONEER 2", departure: "2026-09-13", timing_state: "normal", decision: "available" },
    { sailing_id: "S3", name: "SEABOARD FUTURO", departure: "2026-09-27", timing_state: "normal", decision: "available" },
  ],
  evidence_readiness: [
    { source: "warehouse", status: "ready", as_of: "2026-08-03" },
    { source: "siesa_availability", status: "ready", as_of: "2026-08-03" },
    { source: "sales", status: "stale", as_of: "2026-07-28" },
  ],
  factory_planning: {
    plan_id: "P1",
    focus_sailing_id: "S1",
    production_anchor_sailing_id: "S2",
    coverage_boundary_sailing_id: "S3",
    factory_order_date: "2026-08-03",
    anchor_production_readiness: "2026-09-06",
    coverage_through: "2026-10-10",
    cycle_as_of: "2026-08-03",
    calculation_head_seq: 17,
    candidate_fingerprint: "a".repeat(64),
    horizon_days: 68,
    order_timing_state: "on_time",
  },
  legal_actions: [
    { command: "EditSelectedM2Batch", params: { plan_id: "P1" }, label: "Guardar pedido de embarque" },
    { command: "OpenProductionOrder", params: { plan_id: "P1", production_anchor_sailing_id: "S2", factory_order_date: "2026-08-03", candidate_fingerprint: "a".repeat(64) }, label: "Abrir pedido de producción" },
  ],
  attention: [{
    implication_id: "I1",
    family: "decision_required",
    severity: "consequential",
    consequence: "MALAMBO GRIS puede quedar sin inventario.",
    why_stopped: "La automatización se detuvo por riesgo material.",
    recommendation: "Anotarlo para el ciclo mensual o aceptar el riesgo.",
    evidence: [{ warehouse_m2: "0", daily_velocity: "70.19" }],
    shipment_effect: { note: "No hay cantidad disponible para este zarpe." },
    owner: "ashley",
    typed_actions: ["note_for_monthly", "accept_risk"],
    legal_actions: [
      { command: "ResolveImplication", params: { implication_id: "I1", action: "note_for_monthly", params: {} }, label: "Anotar para el ciclo mensual" },
      { command: "AcceptImplicationRisk", params: { implication_id: "I1" }, label: "Aceptar riesgo" },
    ],
  }],
  plan: {
    plan_id: "P1",
    totals: { total_m2: "201.60", total_pallets: "1.50", containers: 1 },
    rows: [
      { product: { id: "TILE-A", sku: "TILE-A", name: "Natura Arena", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, need_m2: "403.20", suggested_m2: "201.60", selected_m2: "201.60", uncovered_m2: "201.60", siesa_available_effective_m2: "201.60", capped_by_availability: true, derived_pallets: "1.50" },
      { product: { id: "TILE-Z", sku: "TILE-Z", name: "Natura Nieve", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, need_m2: "67.20", suggested_m2: "67.20", selected_m2: "0.00", uncovered_m2: "67.20", siesa_available_effective_m2: "67.20", capped_by_availability: false, derived_pallets: "0.00" },
    ],
  },
  progression: { production_need: [{
    product_id: "TILE-A", product: { id: "TILE-A", sku: "TILE-A", name: "Natura Arena", m2_per_pallet: "134.40", edit_increment_m2: "67.20" },
    total_need_m2: "403.20", shipment_covered_m2: "201.60", uncovered_m2: "201.60",
    gross_future_factory_need_m2: "201.60", qualified_approved_production_m2: "67.20",
    net_new_production_required_m2: "134.40",
    qualified_production_rows: [{ production_ref: "P1-00096", m2: "67.20", status: "in_progress", estimated_ready_date: "2026-08-25" }],
    excluded_production_rows: [{ production_ref: "P1-00094", m2: "134.40", status: "completed", estimated_ready_date: "2026-08-20", excluded_reason: "completed_waiting_for_siesa_visibility" }],
    netting_formula: "max(0, gross_future_factory_need_m2 - qualified_approved_production_m2)",
    authority_notice: "Necesidad orientativa; no es una orden.",
  }] },
  product_roster: [
    { product: { id: "P-Z", sku: "P-Z", name: "Zulu", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, tier: "C", daily_velocity_m2: "1.00", buffer_m2: "134.40", velocity_basis_days: 90 },
    { product: { id: "P-A", sku: "P-A", name: "Alfa", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, tier: "A", daily_velocity_m2: "20.00", buffer_m2: "672.00", velocity_basis_days: 90 },
    { product: { id: "P-B", sku: "P-B", name: "Beta", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, tier: "B", daily_velocity_m2: "8.00", buffer_m2: "403.20", velocity_basis_days: 90 },
    { product: { id: "P-AA", sku: "P-AA", name: "Álamo", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, tier: "A", daily_velocity_m2: "18.00", buffer_m2: "672.00", velocity_basis_days: 90 },
  ],
};

const setup = () => render(<Composer workspace={workspace} />);

describe("three-anchor composer", () => {
  it("starts with source readiness, genuine exception count, and three labelled anchors", () => {
    setup();
    const primary = screen.getByRole("region", { name: "Compositor del ciclo" });
    expect(screen.getByText("2/3 fuentes listas")).toBeTruthy();
    expect(screen.getByText("1 excepción genuina")).toBeTruthy();
    expect((within(primary).getByLabelText("Barco foco") as HTMLSelectElement).value).toBe("S1");
    expect((within(primary).getByLabelText("Barco ancla de producción") as HTMLSelectElement).value).toBe("S2");
    expect((within(primary).getByLabelText("Fecha de colocación de producción") as HTMLInputElement).value).toBe("2026-08-03");
  });

  it("relays the boundary returned by the server instead of calculating it in the browser", () => {
    setup();
    expect(screen.getByTestId("derived-boundary").textContent).toContain("La interfaz no calcula esta frontera");
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    expect(screen.getByTestId("derived-boundary").textContent).toContain("SEABOARD FUTURO");
  });

  it("calculates coordinated previews without creating a commitment", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    expect(screen.getByRole("heading", { name: "Embarque propuesto" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Producción propuesta" })).toBeTruthy();
    expect(screen.getAllByText("201.60 m²").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1.50 pallets")).toBeTruthy();
    expect(screen.getByText(/SIESA limita el embarque/)).toBeTruthy();
    expect(screen.getByText(/Vista previa · sin compromiso/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Exportar recomendaciones CSV" })).toBeTruthy();
  });

  it("sends all three selected anchors to backend calculation authority", () => {
    const onCalculate = vi.fn().mockResolvedValue(undefined);
    render(<Composer workspace={workspace} onCalculate={onCalculate} />);
    fireEvent.change(screen.getByLabelText("Fecha de colocación de producción"), { target: { value: "2026-08-10" } });
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    expect(onCalculate).toHaveBeenCalledWith({
      focusSailingId: "S1",
      productionAnchorSailingId: "S2",
      factoryOrderDate: "2026-08-10",
    });
  });

  it("shows gross factory need, qualified active production, and net-new recommendation without netting completed rows", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    const production = screen.getByRole("region", { name: "Resumen de producción" });
    expect(within(production).getByText(/Necesidad bruta.*201.60 m²/)).toBeTruthy();
    expect(within(production).getByText(/Producción aprobada calificada.*67.20 m²/)).toBeTruthy();
    expect(within(production).getByText(/Producción nueva requerida.*134.40 m²/)).toBeTruthy();
    expect(within(production).getByText(/P1-00096.*En producción.*67.20 m²/)).toBeTruthy();
    expect(within(production).getByText(/P1-00094.*Terminada, esperando visibilidad SIESA.*no se descuenta/)).toBeTruthy();
    expect((within(production).getByLabelText("Natura Arena m²") as HTMLInputElement).valueAsNumber).toBe(134.4);
  });

  it("keeps both previews independently editable and preserves manual finalization gates", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    const shipment = screen.getByRole("region", { name: "Resumen de embarque" });
    const production = screen.getByRole("region", { name: "Resumen de producción" });
    fireEvent.change(within(shipment).getByLabelText("Natura Arena m²"), { target: { value: "134.40" } });
    expect((within(shipment).getByLabelText("Natura Arena m²") as HTMLInputElement).valueAsNumber).toBe(134.4);
    expect((within(production).getByLabelText("Natura Arena m²") as HTMLInputElement).valueAsNumber).toBe(134.4);
    expect((within(shipment).getByRole("button", { name: "Revisar pedido de embarque" }) as HTMLButtonElement).disabled).toBe(false);
    expect((within(production).getByRole("button", { name: "Revisar pedido de producción" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/Finalizar sigue siendo una acción manual/)).toBeTruthy();
    expect(screen.queryByText(/enviar a SIESA/i)).toBeNull();
  });

  it("renders order review gates and fingerprint from the authoritative nested runtime carriers", () => {
    const { legal_actions: _legacyActions, ...runtimeShape } = workspace;
    const { candidate_fingerprint: _legacyFingerprint, ...runtimePlanning } = workspace.factory_planning!;
    const runtimeWorkspace = {
      ...runtimeShape,
      factory_planning: runtimePlanning,
      plan: {
        ...workspace.plan!,
        legal_actions: [
          { command: "EditSelectedM2Batch", params: { plan_id: "P1" }, label: "Guardar pedido de embarque" },
        ],
      },
      production_orders: {
        current: null,
        history: [],
        open_actions: [
          { command: "OpenProductionOrder", params: { plan_id: "P1", production_anchor_sailing_id: "S2", factory_order_date: "2026-08-03", candidate_fingerprint: "a".repeat(64) }, label: "Abrir pedido de producción" },
        ],
      },
    } as Workspace;

    render(<Composer workspace={runtimeWorkspace} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));

    expect(screen.getByRole("button", { name: "Revisar pedido de embarque" })).toBeTruthy();
    const productionReview = screen.getByRole("button", { name: "Revisar pedido de producción" });
    expect(productionReview).toBeTruthy();
    fireEvent.click(productionReview);
    expect(within(screen.getByRole("dialog", { name: "Confirmar pedido de producción" }))
      .getByText(new RegExp("a{64}"))).toBeTruthy();
  });

  it("keeps shipment saving and shipment finalization as separate controls when both are legal", () => {
    const bothShipmentActions = {
      ...workspace,
      legal_actions: [],
      plan: {
        ...workspace.plan!,
        legal_actions: [
          { command: "EditSelectedM2Batch", params: { plan_id: "P1" }, label: "Guardar pedido de embarque" },
          { command: "FinalizeSailingPlan", params: { plan_id: "P1" }, label: "Finalizar plan" },
        ],
      },
    } as Workspace;

    render(<Composer workspace={bothShipmentActions} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));

    expect(screen.getByRole("button", { name: "Revisar pedido de embarque" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Finalizar plan de embarque" })).toBeTruthy();
  });

  it("renders the complete product roster in A-C tiers and alphabetical order inside each tier", () => {
    setup();
    fireEvent.click(screen.getByText("Roster de productos y buffers"));
    const roster = screen.getByRole("region", { name: "Roster completo de productos" });
    expect(within(roster).getByText("Tier A · Alta velocidad")).toBeTruthy();
    expect(within(roster).getByText("Tier B · Velocidad media")).toBeTruthy();
    expect(within(roster).getByText("Tier C · Baja velocidad")).toBeTruthy();
    expect(within(roster).getAllByRole("article")).toHaveLength(4);
    const names = within(roster).getAllByRole("article").map((row) => row.querySelector("strong")?.textContent);
    expect(names).toEqual(["Álamo", "Alfa", "Beta", "Zulu"]);
    expect(within(roster).getByText("Velocidad 20.00 m²/día")).toBeTruthy();
    expect(within(roster).getAllByText("Buffer 672.00 m²")).toHaveLength(2);
  });

  it("opens shipment review without dispatch, shows zero as postpone, then sends one exact mixed batch", async () => {
    const onOrderAction = vi.fn().mockResolvedValue(undefined);
    render(<Composer workspace={workspace} onOrderAction={onOrderAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar pedido de embarque" }));

    expect(onOrderAction).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Confirmar pedido de embarque" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(within(dialog).getByText(/Natura Nieve.*Posponer/)).toBeTruthy();
    expect(within(dialog).getByText(/no envía.*SIESA/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar guardado de embarque" }));

    await waitFor(() => expect(onOrderAction).toHaveBeenCalledWith("EditSelectedM2Batch", {
      plan_id: "P1",
      edits: [
        { product_id: "TILE-A", m2: "201.60" },
        { product_id: "TILE-Z", m2: "0.00" },
      ],
    }));
    expect(onOrderAction).toHaveBeenCalledTimes(1);
  });

  it("opens production review without dispatch and relays only the server-carried four parameters", async () => {
    const onOrderAction = vi.fn().mockResolvedValue(undefined);
    render(<Composer workspace={workspace} onOrderAction={onOrderAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar pedido de producción" }));

    expect(onOrderAction).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Confirmar pedido de producción" });
    expect(within(dialog).getByText(/S1.*S2.*S3/)).toBeTruthy();
    expect(within(dialog).getByText(/entrada manual.*SIESA.*no envía/i)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar apertura de producción" }));

    await waitFor(() => expect(onOrderAction).toHaveBeenCalledWith("OpenProductionOrder", {
      plan_id: "P1",
      production_anchor_sailing_id: "S2",
      factory_order_date: "2026-08-03",
      candidate_fingerprint: "a".repeat(64),
    }));
    expect(onOrderAction.mock.calls[0][1]).not.toHaveProperty("focus_sailing_id");
    expect(onOrderAction.mock.calls[0][1]).not.toHaveProperty("recommendation_rows");
    expect(onOrderAction.mock.calls[0][1]).not.toHaveProperty("coverage_boundary_sailing_id");
  });

  it("replaces a locally edited production preview with the authoritative opened draft", () => {
    const { rerender } = render(<Composer workspace={workspace} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    const production = screen.getByRole("region", { name: "Resumen de producción" });
    const previewInput = within(production).getAllByRole("spinbutton")[0] as HTMLInputElement;
    fireEvent.change(previewInput, { target: { value: "604.80" } });
    expect(previewInput.valueAsNumber).toBe(604.8);

    const openedWorkspace = {
      ...workspace,
      legal_actions: [],
      production_orders: {
        current: {
          production_order_id: "PROD-1",
          lifecycle: "draft",
          lines: [{
            product: workspace.progression.production_need[0].product,
            product_id: workspace.progression.production_need[0].product.id,
            selected_m2: "739.20",
            recommendation_m2: "739.20",
          }],
          legal_actions: [],
        },
        history: [],
        open_actions: [],
      },
    } as Workspace;
    rerender(<Composer workspace={openedWorkspace} />);

    expect((within(screen.getByRole("region", { name: "Resumen de producción" }))
      .getAllByRole("spinbutton")[0] as HTMLInputElement).valueAsNumber).toBe(739.2);
  });

  it("keeps shipment and production actions separate and renders server handoffs without external-effect claims", () => {
    const finalized = {
      ...workspace,
      plan: { ...workspace.plan!, lifecycle: "finalized", shipment_order_id: undefined, handoff: { handoff_id: "HOF-1", orders: [] } },
      production_orders: { current: { production_order_id: "PROD-1", lifecycle: "finalized", lines: [], handoff: { order_id: "PROD-1", total_m2: "134.40", production_ref: null } } },
      legal_actions: [],
    } as Workspace;
    render(<Composer workspace={finalized} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));
    expect(screen.getByText(/HOF-1/)).toBeTruthy();
    expect(screen.getByText(/PROD-1/)).toBeTruthy();
    expect(screen.getByText(/identidades independientes/i)).toBeTruthy();
    expect(screen.queryByText(/enviado a SIESA|producción aceptada|material listo/i)).toBeNull();
  });

  it("shows production draft save and finalize as separate confirmed actions", async () => {
    const draftWorkspace = {
      ...workspace,
      production_orders: { current: { production_order_id: "PROD-1", lifecycle: "draft", lines: [
        { product: workspace.progression.production_need[0].product, product_id: "TILE-A", selected_m2: "134.40", recommendation_m2: "134.40" },
        { product: { ...workspace.progression.production_need[0].product, id: "TILE-Z", sku: "TILE-Z", name: "TILE-Z" }, product_id: "TILE-Z", selected_m2: "4343.20", recommendation_m2: "4343.20" },
      ] } },
      legal_actions: [
        { command: "EditProductionOrderBatch", params: { production_order_id: "PROD-1" }, label: "Guardar producción" },
        { command: "FinalizeProductionOrder", params: { production_order_id: "PROD-1" }, label: "Finalizar producción" },
      ],
    } as Workspace;
    const onOrderAction = vi.fn().mockResolvedValue(undefined);
    render(<Composer workspace={draftWorkspace} onOrderAction={onOrderAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Calcular recomendaciones" }));

    fireEvent.change(within(screen.getByRole("region", { name: "Resumen de producción" }))
      .getAllByRole("spinbutton")[0], { target: { value: "67.20" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador de producción" }));
    expect(onOrderAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar guardado de producción" }));
    await waitFor(() => expect(onOrderAction).toHaveBeenCalledWith("EditProductionOrderBatch", { production_order_id: "PROD-1", edits: [{ product_id: "TILE-A", m2: "67.20" }] }));

    fireEvent.click(screen.getByRole("button", { name: "Finalizar orden de producción" }));
    expect(onOrderAction).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirmar finalización de producción" }));
    await waitFor(() => expect(onOrderAction).toHaveBeenLastCalledWith("FinalizeProductionOrder", { production_order_id: "PROD-1" }));
  });

  it("shows the five real vessel-voyage entries with ETA, B/L-VGM and SAES without calling ETA departure", () => {
    const rosterWorkspace = {
      ...workspace,
      sailing_rail: [
        { sailing_id: "R1", carrier: "SEABOARD MARINE", name: "SEABOARD PIONEER", voyage: "195", departure: null, loading_terminal_eta: "2026-09-13", bl_vgm_close: "2026-09-10T09:00:00", saes_reception: "2026-09-11T09:00:00", terminal: "COMPAS/CCTO", planning_basis: "bl_vgm_close", planning_anchor: "2026-09-10", timing_state: "arrived", decision: "watch" },
        { sailing_id: "R2", carrier: "SEABOARD MARINE", name: "SEABOARD PRIDE", voyage: "194", departure: null, loading_terminal_eta: "2026-09-20", bl_vgm_close: "2026-09-17T09:00:00", saes_reception: "2026-09-18T09:00:00", terminal: "COMPAS/CCTO", planning_basis: "bl_vgm_close", planning_anchor: "2026-09-17", timing_state: "normal", decision: "use" },
        { sailing_id: "R3", carrier: "SEABOARD MARINE", name: "SEABOARD GALAXY", voyage: "52", departure: null, loading_terminal_eta: "2026-09-27", bl_vgm_close: "2026-09-24T09:00:00", saes_reception: "2026-09-25T09:00:00", terminal: "COMPAS/CCTO", planning_basis: "bl_vgm_close", planning_anchor: "2026-09-24", timing_state: "normal", decision: "watch" },
        { sailing_id: "R4", carrier: "SEABOARD MARINE", name: "SEABOARD PIONEER", voyage: "196", departure: null, loading_terminal_eta: "2026-10-04", bl_vgm_close: "2026-10-01T09:00:00", saes_reception: "2026-10-02T09:00:00", terminal: "COMPAS/CCTO", planning_basis: "bl_vgm_close", planning_anchor: "2026-10-01", timing_state: "normal", decision: "watch" },
        { sailing_id: "R5", carrier: "SEABOARD MARINE", name: "SEABOARD PRIDE", voyage: "195", departure: null, loading_terminal_eta: "2026-10-11", bl_vgm_close: "2026-10-08T09:00:00", saes_reception: "2026-10-09T09:00:00", terminal: "COMPAS/CCTO", planning_basis: "bl_vgm_close", planning_anchor: "2026-10-08", timing_state: "normal", decision: "watch" },
      ],
      factory_planning: undefined,
    } as Workspace;

    render(<Composer workspace={rosterWorkspace} />);
    const focus = screen.getByLabelText("Barco foco");
    const options = within(focus).getAllByRole("option");
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.textContent)).toContain(
      "SEABOARD PRIDE · V.194 · ETA COMPAS/CCTO 2026-09-20 · B/L-VGM 2026-09-17 09:00 · SAES 2026-09-18 09:00",
    );
    expect(options.map((option) => option.textContent).join(" ").toLowerCase()).not.toContain("departure");
    expect(screen.getByText(/La fecha B\/L-VGM es el ancla de planificación/)).toBeTruthy();
  });

  it("shows the settled implication contract and requires confirmation before resolution", () => {
    const onResolve = vi.fn().mockResolvedValue(undefined);
    render(<Composer workspace={workspace} onResolve={onResolve} />);
    expect(screen.getByRole("heading", { name: "Implicaciones por resolver" })).toBeTruthy();
    expect(screen.getByText("MALAMBO GRIS puede quedar sin inventario.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Anotar para el ciclo mensual" }));
    expect(onResolve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar resolución" }));
    expect(onResolve).toHaveBeenCalledWith("ResolveImplication", expect.objectContaining({ implication_id: "I1", action: "note_for_monthly" }));
  });

  it("keeps risk decisions visible and collapses repeated product identity cases", () => {
    const productCase = (id: string, rawRef: string) => ({
      implication_id: id,
      family: "product_match",
      severity: "consequential",
      consequence: `${rawRef} tiene demanda pero no está en el roster actual.`,
      recommendation: "Asignarla al producto correcto o descartar la referencia.",
      evidence: [{ raw_reference: rawRef, daily_velocity: "3.23", peak_weekly_m2: "145.44" }],
      shipment_effect: { peak_weekly_m2: "145.44" },
      owner: "ashley",
      typed_actions: ["map", "discard"],
      legal_actions: [{ command: "ResolveImplication", params: { implication_id: id, action: "discard", params: {} }, label: "Descartar fila" }],
    });
    const grouped: Workspace = {
      ...workspace,
      attention: [workspace.attention[0], productCase("I2", "HD 4001"), productCase("I3", "HD 4050")],
    };

    const { container } = render(<Composer workspace={grouped} />);
    expect(screen.getByText("MALAMBO GRIS puede quedar sin inventario.")).toBeTruthy();
    const summary = screen.getByText("2 identidades de producto por revisar");
    const details = summary.closest("details");
    expect(details?.open).toBe(false);
    expect(details?.querySelectorAll("article")).toHaveLength(2);
  });
});
