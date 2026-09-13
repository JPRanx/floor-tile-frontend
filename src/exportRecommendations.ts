import type { Workspace } from "./contracts";

function cell(value: unknown): string {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function recommendationsCsv(workspace: Workspace): string {
  const planning = workspace.factory_planning;
  const header = [
    "recomendacion", "barco_foco", "barco_ancla_produccion", "barco_frontera",
    "fecha_orden_fabrica", "producto_id", "sku", "producto", "cantidad_m2",
    "pallets", "necesidad_bruta_fabrica_m2", "produccion_calificada_m2",
  ];
  const rows: unknown[][] = [];
  for (const row of workspace.plan?.rows ?? []) {
    const quantity = Number(row.selected_m2 ?? row.suggested_m2 ?? 0);
    if (quantity <= 0) continue;
    rows.push([
      "embarque", planning?.focus_sailing_id ?? "", planning?.production_anchor_sailing_id ?? "",
      planning?.coverage_boundary_sailing_id ?? "", planning?.factory_order_date ?? "",
      row.product.id, row.product.sku ?? "", row.product.name ?? "", quantity.toFixed(2),
      (quantity / Number(row.product.m2_per_pallet || 1)).toFixed(2), "", "",
    ]);
  }
  for (const row of workspace.progression.production_need) {
    const quantity = Number(row.net_new_production_required_m2 ?? 0);
    if (quantity <= 0) continue;
    rows.push([
      "produccion_futura", planning?.focus_sailing_id ?? "", planning?.production_anchor_sailing_id ?? "",
      planning?.coverage_boundary_sailing_id ?? "", planning?.factory_order_date ?? "",
      row.product.id, row.product.sku ?? "", row.product.name ?? "", quantity.toFixed(2),
      (quantity / Number(row.product.m2_per_pallet || 1)).toFixed(2),
      Number(row.gross_future_factory_need_m2).toFixed(2),
      Number(row.qualified_approved_production_m2).toFixed(2),
    ]);
  }
  return "\uFEFF" + [header, ...rows].map((row) => row.map(cell).join(";")).join("\n") + "\n";
}

export function downloadRecommendations(workspace: Workspace): void {
  const blob = new Blob([recommendationsCsv(workspace)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = workspace.factory_planning?.factory_order_date ?? new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `recomendaciones-floor-tile-${date}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
