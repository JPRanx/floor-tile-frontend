import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManualInput } from "./ManualInput";
import type { Workspace } from "./contracts";

const previewRowsMock = vi.fn();
const previewFileMock = vi.fn();
const applyPreviewMock = vi.fn();
vi.mock("./api", () => ({
  previewRows: (...args: unknown[]) => previewRowsMock(...args),
  previewFile: (...args: unknown[]) => previewFileMock(...args),
  applyPreview: (...args: unknown[]) => applyPreviewMock(...args),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function upload(label: string, name: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { files: [new File([name], name)] },
  });
}

const workspace = {
  workspace_schema_version: 2,
  demo_banner: "REVISIÓN LOCAL",
  sailing_rail: [
    { sailing_id: "S1", name: "SEABOARD GALAXI", departure: "2026-08-30", timing_state: "normal", decision: "use" },
    { sailing_id: "S2", name: "SEABOARD PIONEER", departure: "2026-09-13", timing_state: "normal", decision: "watch" },
  ],
  evidence_readiness: [
    { source: "warehouse", status: "ready", as_of: "2026-08-03" },
    { source: "siesa_availability", status: "stale", as_of: "2026-08-01" },
  ],
  attention: [],
  plan: {
    plan_id: "P1",
    totals: { total_m2: "201.60", total_pallets: "1.50", containers: 1 },
    rows: [
      { product: { id: "TILE-A", sku: "TILE-A", name: "Natura Arena", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, need_m2: "403.20", suggested_m2: "201.60", selected_m2: "201.60", uncovered_m2: "201.60", siesa_available_effective_m2: "201.60", capped_by_availability: true, derived_pallets: "1.50" },
      { product: { id: "TILE-B", sku: "TILE-B", name: "Natura Gris", m2_per_pallet: "134.40", edit_increment_m2: "67.20" }, need_m2: "134.40", suggested_m2: "134.40", selected_m2: "134.40", uncovered_m2: "0.00", siesa_available_effective_m2: "134.40", capped_by_availability: false, derived_pallets: "1.00" },
    ],
  },
  progression: { production_need: [] },
} as Workspace;

const sources = {
  sources: [
    { feed: "warehouse", operator_label: "Inventario en bodega", status: "ready", as_of: "2026-08-03", current_rows: [{ product_id: "TILE-A", product_name: "Natura Arena", product_sku: "TILE-A", m2: "100.00" }, { product_id: "TILE-B", product_name: "Natura Gris", product_sku: "TILE-B", m2: "50.00" }] },
    { feed: "sales", operator_label: "Ventas / rotación", status: "ready", as_of: "2026-08-03", current_rows: [{ product_id: "TILE-A", product_name: "Natura Arena", product_sku: "TILE-A", daily_velocity: "12.50" }] },
    { feed: "siesa_availability", operator_label: "Disponibilidad SIESA", status: "stale", as_of: "2026-08-01", current_rows: [{ product_id: "TILE-A", product_name: "Natura Arena", product_sku: "TILE-A", available_m2: "80.00" }] },
    { feed: "sailing_calendar", operator_label: "Calendario de zarpes", status: "ready", as_of: "2026-08-03", current_rows: [] },
    { feed: "in_transit", operator_label: "Tránsito observado", status: "ready", as_of: "2026-08-03", current_rows: [{ product_id: "TILE-A", product_name: "Natura Arena", m2: "201.60", reference: "SEABOARD GALAXI", eta: "2026-09-14" }] },
    { feed: "production_planning", operator_label: "Planificación de producción", status: "ready", as_of: "2026-08-03", current_rows: [{ product_id: "TILE-A", product_name: "Natura Arena", product_sku: "TILE-A", m2: "67.20", status: "in_progress", production_ref: "P1-00096", estimated_ready_date: "2026-08-25", evidence_as_of: "2026-08-03", completion_confirmed: false, can_add_more: false }] },
  ],
} as any;

describe("Ashley manual intake workspace", () => {
  beforeEach(() => {
    previewRowsMock.mockReset();
    previewFileMock.mockReset();
    applyPreviewMock.mockReset();
  });

  it("models the real source files and derives demand from sales instead of asking for demand by boat", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    expect(screen.getByRole("heading", { name: "Carga manual" })).toBeTruthy();
    expect(screen.getAllByText("Inventario de bodega").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Disponibilidad SIESA")).toBeTruthy();
    expect(screen.getByText("Ventas / rotación")).toBeTruthy();
    expect(screen.queryByText("Demanda por barco")).toBeNull();
    expect(screen.getAllByText("Programa de barcos").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("En tránsito")).toBeTruthy();
  });

  it("lets Ashley add another boat to the sailing program", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "Programa de barcos" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar barco" }));
    expect(screen.getByLabelText("Nombre del nuevo barco")).toBeTruthy();
    expect(screen.getByLabelText("Naviera del nuevo barco")).toBeTruthy();
    expect(screen.getByLabelText("Salida del nuevo barco")).toBeTruthy();
  });

  it("shows confirmed transit by boat and dates while keeping scheduled dispatch non-authoritative", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "En tránsito" }));
    expect(screen.getByText("SEABOARD GALAXI")).toBeTruthy();
    expect(screen.getByText("201.60 m²")).toBeTruthy();
    expect(screen.getByText(/Llegada 14 sep 2026/)).toBeTruthy();
    expect(screen.getByText(/programación de despacho no confirma que el barco haya salido/i)).toBeTruthy();
    const upload = screen.getByLabelText("Actualizar archivo de En tránsito") as HTMLInputElement;
    expect(upload.accept).toContain(".xlsx");
  });

  it("lets Ashley manually adjust warehouse, sales and SIESA values", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "Inventario de bodega" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar manualmente" }));
    const warehouse = screen.getByLabelText("Natura Arena inventario de bodega") as HTMLInputElement;
    fireEvent.change(warehouse, { target: { value: "125" } });
    expect(warehouse.valueAsNumber).toBe(125);
    expect(screen.getByRole("button", { name: "Revisar cambios manuales" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ventas / rotación" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar manualmente" }));
    expect(screen.getByLabelText("Natura Arena velocidad de venta")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Disponibilidad SIESA" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar manualmente" }));
    expect(screen.getByLabelText("Natura Arena disponibilidad SIESA")).toBeTruthy();
  });

  it("accepts and explains native XLSX for warehouse, sales and SIESA while preserving other formats", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    for (const [source, label] of [
      ["Inventario de bodega", "Actualizar archivo de Inventario de bodega"],
      ["Ventas / rotación", "Actualizar archivo de Ventas / rotación"],
      ["Disponibilidad SIESA", "Actualizar archivo de Disponibilidad SIESA"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: source }));
      const upload = screen.getByLabelText(label) as HTMLInputElement;
      expect(upload.accept).toContain(".xlsx");
      expect(upload.accept).toContain(".csv");
      expect(upload.accept).toContain(".txt");
      expect(screen.getByText(/Excel XLSX operativo o una tabla CSV\/TXT/)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "Producción en fábrica" }));
    expect((screen.getByLabelText("Actualizar archivo de Producción en fábrica") as HTMLInputElement).accept).toContain(".pdf");
    fireEvent.click(screen.getByRole("button", { name: "En tránsito" }));
    expect((screen.getByLabelText("Actualizar archivo de En tránsito") as HTMLInputElement).accept).toContain(".xlsx");
  });

  it("shows server parser diagnostics and only a private unmatched count in upload preview", async () => {
    previewFileMock.mockResolvedValue({
      preview_id: "upload-preview",
      summary: { received: 2, valid: 1, held: 0, invalid: 1 },
      replacement_effect: { counts: { added: 1, changed: 0, omitted: 0 } },
      rows: [], can_apply: false, apply_token: null,
      adapter_diagnostics: [
        { source_row_ref: "row-4", severity: "warning", message: "Disponibilidad no cuadra" },
        { source_row_ref: "row-5", severity: "error", message: "MT2 inválido" },
      ],
      unmatched_products: ["PRIVATE RAW PRODUCT", "ANOTHER PRIVATE PRODUCT"],
    });
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "Ventas / rotación" }));
    fireEvent.change(screen.getByLabelText("Actualizar archivo de Ventas / rotación"), {
      target: { files: [new File(["xlsx"], "sales.xlsx")] },
    });

    expect(await screen.findByText("Disponibilidad no cuadra")).toBeTruthy();
    expect(screen.getByText("MT2 inválido")).toBeTruthy();
    expect(screen.getByText("2 productos sin conciliar")).toBeTruthy();
    expect(screen.queryByText("PRIVATE RAW PRODUCT")).toBeNull();
    expect((screen.getByRole("button", { name: "Aplicar y actualizar planeación" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not expose a warehouse preview or apply token after navigating to sales", async () => {
    const warehouseRequest = deferred<any>();
    previewFileMock.mockReturnValueOnce(warehouseRequest.promise);
    render(<ManualInput workspace={workspace} sourceHub={sources} />);

    fireEvent.click(screen.getByRole("button", { name: "Inventario de bodega" }));
    upload("Actualizar archivo de Inventario de bodega", "warehouse.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "Ventas / rotación" }));
    expect(screen.getByRole("heading", { name: "Ventas / rotación" })).toBeTruthy();

    warehouseRequest.resolve({
      preview_id: "stale-warehouse", summary: { received: 1, valid: 1, held: 0, invalid: 0 },
      replacement_effect: { counts: { added: 1, changed: 0, omitted: 0 } }, rows: [],
      can_apply: true, apply_token: "stale-warehouse-token",
    });

    await waitFor(() => expect(previewFileMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Previsualización")).toBeNull();
    expect(screen.queryByRole("button", { name: "Aplicar y actualizar planeación" })).toBeNull();
    expect(applyPreviewMock).not.toHaveBeenCalled();
  });

  it("only renders and applies the newest upload for the same source", async () => {
    const requestA = deferred<any>();
    const requestB = deferred<any>();
    previewFileMock.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise);
    applyPreviewMock.mockResolvedValue(undefined);
    render(<ManualInput workspace={workspace} sourceHub={sources} />);

    fireEvent.click(screen.getByRole("button", { name: "Inventario de bodega" }));
    upload("Actualizar archivo de Inventario de bodega", "warehouse-a.xlsx");
    upload("Actualizar archivo de Inventario de bodega", "warehouse-b.xlsx");
    requestB.resolve({
      preview_id: "warehouse-b", summary: { received: 2, valid: 2, held: 0, invalid: 0 },
      replacement_effect: { counts: { added: 2, changed: 0, omitted: 0 } }, rows: [],
      can_apply: true, apply_token: "warehouse-b-token",
    });
    expect(await screen.findByText("2 válidas · 0 por conciliar · 0 inválidas")).toBeTruthy();

    requestA.resolve({
      preview_id: "warehouse-a", summary: { received: 1, valid: 1, held: 0, invalid: 0 },
      replacement_effect: { counts: { added: 1, changed: 0, omitted: 0 } }, rows: [],
      can_apply: true, apply_token: "warehouse-a-token",
    });
    await waitFor(() => expect(screen.queryByText("1 válidas · 0 por conciliar · 0 inválidas")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Aplicar y actualizar planeación" }));
    await waitFor(() => expect(applyPreviewMock).toHaveBeenCalledWith("warehouse-b-token"));
    expect(applyPreviewMock).toHaveBeenCalledTimes(1);
  });

  it("does not let a stale rejection clear the current upload busy state or replace its error", async () => {
    const warehouseRequest = deferred<any>();
    const salesRequest = deferred<any>();
    previewFileMock.mockReturnValueOnce(warehouseRequest.promise).mockReturnValueOnce(salesRequest.promise);
    render(<ManualInput workspace={workspace} sourceHub={sources} />);

    fireEvent.click(screen.getByRole("button", { name: "Inventario de bodega" }));
    upload("Actualizar archivo de Inventario de bodega", "warehouse.xlsx");
    fireEvent.click(screen.getByRole("button", { name: "Ventas / rotación" }));
    upload("Actualizar archivo de Ventas / rotación", "sales.xlsx");

    warehouseRequest.reject(new Error("stale warehouse failure"));
    await waitFor(() => expect(screen.getByText("Leyendo archivo…")).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();

    salesRequest.reject(new Error("current sales failure"));
    expect((await screen.findByRole("alert")).textContent).toContain("current sales failure");
    expect(screen.queryByText("stale warehouse failure")).toBeNull();
    expect(screen.getByText("Seleccionar archivo")).toBeTruthy();
  });

  it("lets Ashley reconcile the boat, BL, arrival and quantity of confirmed transit", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "En tránsito" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar tránsito manualmente" }));
    expect(screen.getByLabelText("Natura Arena m² en tránsito")).toBeTruthy();
    expect(screen.getByLabelText("Natura Arena barco en tránsito")).toBeTruthy();
    expect(screen.getByLabelText("Natura Arena BL o booking")).toBeTruthy();
    expect(screen.getByLabelText("Natura Arena llegada esperada")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Agregar barco en tránsito" })).toBeTruthy();
  });

  it("creates one confirmed boat load with multiple products suggested from the order", async () => {
    previewRowsMock.mockResolvedValue({ preview_id: "transit-group", summary: { received: 3, valid: 3, held: 0, invalid: 0 }, replacement_effect: { counts: { added: 2, changed: 0, omitted: 0 } }, rows: [], can_apply: true, apply_token: "apply-transit" });
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "En tránsito" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar tránsito manualmente" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar barco en tránsito" }));
    fireEvent.change(screen.getByLabelText("Barco de nueva carga"), { target: { value: "S2" } });
    fireEvent.change(screen.getByLabelText("Referencia BL o booking de nueva carga"), { target: { value: "BL-900" } });
    fireEvent.change(screen.getByLabelText("Llegada esperada del barco"), { target: { value: "2026-09-28" } });
    fireEvent.click(screen.getByLabelText("Confirmar salida o BL del barco"));
    fireEvent.click(screen.getByRole("button", { name: "Sugerir productos del pedido" }));
    expect((screen.getByLabelText("Natura Arena m² sugeridos") as HTMLInputElement).valueAsNumber).toBe(201.6);
    expect((screen.getByLabelText("Natura Gris m² sugeridos") as HTMLInputElement).valueAsNumber).toBe(134.4);
    fireEvent.click(screen.getByRole("button", { name: "Agregar productos seleccionados" }));
    fireEvent.click(screen.getByRole("button", { name: "Revisar cambios manuales" }));
    await waitFor(() => expect(previewRowsMock).toHaveBeenCalledWith("in_transit", expect.arrayContaining([
      expect.objectContaining({ product_ref: "TILE-A", m2: 201.6, reference: "BL-900", eta: "2026-09-28", sailing_id: "S2" }),
      expect.objectContaining({ product_ref: "TILE-B", m2: 134.4, reference: "BL-900", eta: "2026-09-28", sailing_id: "S2" }),
    ]), expect.any(String)));
  });

  it("admits legacy XLS only for SIESA and explains that exception", () => {
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "Disponibilidad SIESA" }));
    const siesa = screen.getByLabelText("Actualizar archivo de Disponibilidad SIESA") as HTMLInputElement;
    expect(siesa.accept.split(",")).toContain(".xls");
    expect(screen.getByText(/SIESA.*XLS/i)).toBeTruthy();

    for (const [source, label] of [
      ["Inventario de bodega", "Actualizar archivo de Inventario de bodega"],
      ["Ventas / rotación", "Actualizar archivo de Ventas / rotación"],
      ["En tránsito", "Actualizar archivo de En tránsito"],
      ["Producción en fábrica", "Actualizar archivo de Producción en fábrica"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: source }));
      expect((screen.getByLabelText(label) as HTMLInputElement).accept.split(",")).not.toContain(".xls");
    }
  });

  it("shows PLAN_DE_PRODUCCION rows and stages direct production changes through preview", async () => {
    previewRowsMock.mockResolvedValue({
      preview_id: "preview-production", summary: { received: 1, valid: 1, held: 0, invalid: 0 },
      replacement_effect: { counts: { added: 1, changed: 0, omitted: 0 } }, rows: [],
      can_apply: true, apply_token: "apply-production",
    });
    render(<ManualInput workspace={workspace} sourceHub={sources} />);
    fireEvent.click(screen.getByRole("button", { name: "Producción en fábrica" }));
    expect(screen.getByText("P1-00096")).toBeTruthy();
    expect(screen.getByText("En producción")).toBeTruthy();
    expect(screen.getByText("67.20 m²")).toBeTruthy();
    expect(screen.getByText(/Lista estimada 25 ago 2026/)).toBeTruthy();
    const upload = screen.getByLabelText("Actualizar archivo de Producción en fábrica") as HTMLInputElement;
    expect(upload.accept).toContain(".pdf");

    fireEvent.click(screen.getByRole("button", { name: "Editar producción manualmente" }));
    expect(screen.getByLabelText("Natura Arena referencia de producción")).toBeTruthy();
    expect(screen.getByLabelText("Natura Arena estado de producción")).toBeTruthy();
    expect(screen.getByLabelText("Natura Arena fecha estimada de alistamiento")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Natura Arena m² en producción"), { target: { value: "134.40" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar cambios manuales" }));
    await waitFor(() => expect(previewRowsMock).toHaveBeenCalledWith("production_planning", [{
      product_ref: "TILE-A", m2: 134.4, status: "in_progress", production_ref: "P1-00096",
      estimated_ready_date: "2026-08-25", evidence_as_of: "2026-08-03",
      completion_confirmed: false, can_add_more: false,
    }], expect.any(String)));
    expect(screen.getByText("Previsualización")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Producción en fábrica" }));
    fireEvent.click(screen.getByRole("button", { name: "Editar producción manualmente" }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar producción" }));
    expect(screen.getByLabelText("Producto de nueva producción")).toBeTruthy();
    expect(screen.getByLabelText("Referencia de nueva producción")).toBeTruthy();
    expect(screen.getByLabelText("Estado de nueva producción")).toBeTruthy();
    expect(screen.getByLabelText("Alistamiento estimado de nueva producción")).toBeTruthy();
  });
});
