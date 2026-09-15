export interface Product {
  id: string;
  sku: string | null;
  name: string | null;
  m2_per_pallet: string;
  edit_increment_m2: string;
  tier?: "A" | "B" | "C" | null;
}

export interface ProductRosterRow {
  product: Product;
  tier: "A" | "B" | "C";
  daily_velocity_m2: string;
  velocity_basis_days: number;
  buffer_m2: string;
}

export interface Sailing {
  sailing_id: string;
  carrier?: string;
  name: string;
  departure: string | null;
  voyage?: string | null;
  loading_terminal_eta?: string | null;
  eta?: string | null;
  bl_vgm_close?: string | null;
  saes_reception?: string | null;
  terminal?: string | null;
  planning_basis?: string;
  planning_anchor?: string;
  timing_state: string;
  decision: string;
}

export interface PlanRow {
  product: Product;
  need_m2: string | null;
  suggested_m2: string | null;
  selected_m2: string | null;
  uncovered_m2: string | null;
  siesa_available_effective_m2: string;
  capped_by_availability: boolean;
  derived_pallets: string | null;
}

export interface LegalAction {
  command: string;
  params: Record<string, unknown>;
  label: string;
  explanation?: string;
  input_schema?: Record<string, unknown>;
}

export interface AttentionCase {
  implication_id: string;
  family?: string;
  severity: string;
  consequence: string;
  why_stopped?: string;
  recommendation?: string;
  evidence?: Array<Record<string, unknown>>;
  shipment_effect?: Record<string, unknown>;
   typed_actions?: string[];
  legal_actions?: LegalAction[];
  owner?: string;
  opened_at?: string;
}

export interface ProductionPlanningRow {
  production_ref?: string | null;
  m2: string;
  status?: string | null;
  estimated_ready_date?: string | null;
  evidence_as_of?: string | null;
}

export interface PlanningContext {
  plan_id: string;
  production_anchor_sailing_id: string;
  factory_order_date: string;
}

export interface CommandReceipt {
  ok: true;
  result: Record<string, unknown>;
  workspace_schema_version: 2;
  head_seq: number;
  workspace: Record<string, unknown>;
}

export interface OrderLine {
  product_id: string;
  product?: Product;
  selected_m2: string;
  recommendation_m2?: string;
}

export interface OrderHandoff {
  order_id?: string;
  total_m2?: string;
  production_ref?: string | null;
  [key: string]: unknown;
}

export interface ProductionOrder {
  production_order_id: string;
  lifecycle: "draft" | "finalized" | "reference_recorded" | string;
  lines: OrderLine[];
  handoff?: OrderHandoff | null;
  production_ref?: string | null;
  legal_actions?: LegalAction[];
}

export interface Workspace {
  workspace_schema_version: 2;
  head_seq?: number;
  demo_banner: string;
  review_provenance?: { as_of: string; current_truth: boolean; mode: string };
  sailing_rail: Sailing[];
  evidence_readiness: Array<{ source: string; status: string; as_of: string | null }>;
  attention: AttentionCase[];
  product_roster?: ProductRosterRow[];
  factory_planning?: null | {
    plan_id?: string;
    focus_sailing_id: string;
    production_anchor_sailing_id: string;
    coverage_boundary_sailing_id: string;
    factory_order_date: string;
    anchor_production_readiness: string;
    coverage_through: string;
    cycle_as_of?: string;
    calculation_head_seq?: number;
    candidate_fingerprint?: string;
    horizon_days: number;
    order_timing_state: "on_time" | "past_due" | "late_for_anchor";
  };
  legal_actions?: LegalAction[];
  production_orders?: {
    current: ProductionOrder | null;
    history?: ProductionOrder[];
    orders?: ProductionOrder[];
    open_actions?: LegalAction[];
    legal_actions?: LegalAction[];
  };
  plan: null | {
    plan_id: string;
    lifecycle?: string;
    shipment_order_id?: string;
    handoff?: OrderHandoff | null;
    legal_actions?: LegalAction[];
    totals: { total_m2: string; total_pallets: string; containers: number };
    rows: PlanRow[];
  };
  progression: {
    production_need: Array<{
      product_id: string;
      product: Product;
      total_need_m2: string;
      shipment_covered_m2: string;
      uncovered_m2: string;
      future_demand_m2?: string;
      buffer_m2?: string;
      projected_warehouse_m2?: string;
      qualified_incoming_m2?: string;
      focus_shipment_m2?: string;
      projected_boundary_balance_m2?: string;
      gross_future_factory_need_m2: string;
      gross_need_formula?: string;
      qualified_approved_production_m2: string;
      net_new_production_required_m2: string;
      qualified_production_rows: ProductionPlanningRow[];
      excluded_production_rows: Array<ProductionPlanningRow & { excluded_reason: string }>;
      netting_formula: string;
      authority_notice: string;
    }>;
  };
}

export interface SourceRow {
  product_id?: string;
  product_name?: string | null;
  product_sku?: string | null;
  m2?: string;
  available_m2?: string;
  committed_m2?: string | null;
  daily_velocity?: string;
  peak_weekly_m2?: string | null;
  reference?: string | null;
  eta?: string | null;
  sailing_id?: string;
  carrier?: string;
  name?: string;
  departure?: string;
  voyage_days?: number | null;
  status?: string | null;
  production_ref?: string | null;
  scheduled_start?: string | null;
  estimated_ready_date?: string | null;
  actual_ready_date?: string | null;
  evidence_as_of?: string | null;
  completion_confirmed?: boolean | null;
  can_add_more?: boolean | null;
}

export interface SourceState {
  feed: string;
  operator_label: string;
  status: string;
  as_of: string | null;
  current_rows: SourceRow[];
  last_applied?: { raw_source_ref?: string | null } | null;
}

export interface SourceHub { sources: SourceState[] }

export interface AdapterDiagnostic {
  source_row_ref: string;
  severity: "error" | "warning" | string;
  message: string;
}

export interface InputPreview {
  preview_id: string | null;
  summary: { received: number; valid: number; held: number; invalid: number };
  replacement_effect: { counts?: { added: number; changed: number; omitted: number } };
  rows: Array<{ source_row_ref: string; status: string; message: string }>;
  adapter_diagnostics?: AdapterDiagnostic[];
  unmatched_products?: string[];
  can_apply: boolean;
  apply_token: string | null;
  authority_state?: string;
  scheduled_orders?: Array<{
    purchase_order: string;
    pedido: string;
    booking: string;
    etd_tentative: string | null;
    eta_tentative: string | null;
    quality_flags: string[];
    lines: Array<{ product_ref: string; m2: string | number }>;
  }>;
}
