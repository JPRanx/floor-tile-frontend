import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter, pointerWithin } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import type { BLAllocationReport, BLAllocation, BLProductAllocation } from '../requests/orderBuilder';
import { RiskDistribution } from './RiskDistribution';
import { BLCard, DragOverlayProductRow } from './BLCard';
import { CONTAINER_MAX_WEIGHT_KG } from '../constants/inventory';

interface BLAllocationViewProps {
  report: BLAllocationReport;
  onBack: () => void;
  onExport: () => void;
  onSaveDraft: () => Promise<void>;
  isExporting?: boolean;
  draftStatus?: string | null;
}

/**
 * Deep-clone allocations for local state manipulation.
 */
function cloneAllocations(allocations: BLAllocation[]): BLAllocation[] {
  return allocations.map((bl) => ({
    ...bl,
    primary_customers: [...bl.primary_customers],
    products: bl.products.map((p) => ({ ...p })),
  }));
}

/**
 * Recalculate BL totals after a product move.
 */
function recalcBLTotals(bl: BLAllocation): BLAllocation {
  const totalPallets = bl.products.reduce((sum, p) => sum + p.pallets, 0);
  const totalM2 = bl.products.reduce((sum, p) => sum + p.m2, 0);
  const totalWeightKg = bl.products.reduce((sum, p) => sum + p.weight_kg, 0);
  const criticalCount = bl.products.filter((p) => p.is_critical).length;

  // Recalculate containers: weight-based (27,500 kg per container)
  const totalContainers = totalWeightKg > 0
    ? Math.ceil(totalWeightKg / CONTAINER_MAX_WEIGHT_KG)
    : 0;

  // Recalculate primary customers from products
  const customerSet = new Set<string>();
  bl.products.forEach((p) => {
    if (p.primary_customer) customerSet.add(p.primary_customer);
  });

  return {
    ...bl,
    total_pallets: totalPallets,
    total_m2: totalM2,
    total_weight_kg: totalWeightKg,
    total_containers: totalContainers,
    critical_product_count: criticalCount,
    primary_customers: Array.from(customerSet),
  };
}

/**
 * Container view for BL allocation results.
 * Shows risk distribution + collapsible BL cards.
 * In edit mode, enables drag-and-drop of products between BLs.
 */
export function BLAllocationView({
  report,
  onBack,
  onExport,
  onSaveDraft,
  isExporting = false,
  draftStatus = null,
}: BLAllocationViewProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);

  // Local mutable copy of allocations for drag-and-drop edits
  const [localAllocations, setLocalAllocations] = useState<BLAllocation[]>(() =>
    cloneAllocations(report.allocations)
  );

  // Track if modifications have been made
  const hasModifications = useMemo(() => {
    // Compare local vs original by checking product_id lists per BL
    for (let i = 0; i < report.allocations.length; i++) {
      const original = report.allocations[i];
      const local = localAllocations[i];
      if (!original || !local) return true;
      if (original.products.length !== local.products.length) return true;
      const origIds = original.products.map((p) => p.product_id).sort();
      const localIds = local.products.map((p) => p.product_id).sort();
      if (origIds.some((id, idx) => id !== localIds[idx])) return true;
    }
    return false;
  }, [report.allocations, localAllocations]);

  // Currently dragged product for DragOverlay
  const [activeProduct, setActiveProduct] = useState<BLProductAllocation | null>(null);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);

  // Track which BLs are expanded (first one by default)
  const [expandedBLs, setExpandedBLs] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    report.allocations.forEach((bl, index) => {
      initial[bl.bl_number] = index === 0; // First BL expanded
    });
    return initial;
  });

  const toggleBL = (blNumber: number) => {
    setExpandedBLs((prev) => ({
      ...prev,
      [blNumber]: !prev[blNumber],
    }));
  };

  const expandAll = () => {
    const newState: Record<number, boolean> = {};
    const allocs = isEditMode ? localAllocations : report.allocations;
    allocs.forEach((bl) => {
      newState[bl.bl_number] = true;
    });
    setExpandedBLs(newState);
  };

  const collapseAll = () => {
    const newState: Record<number, boolean> = {};
    const allocs = isEditMode ? localAllocations : report.allocations;
    allocs.forEach((bl) => {
      newState[bl.bl_number] = false;
    });
    setExpandedBLs(newState);
  };

  // Toggle edit mode
  const canEdit = draftStatus === 'drafting' || draftStatus === null;
  const handleToggleEditMode = useCallback(() => {
    if (!isEditMode) {
      // Entering edit mode: expand all BLs, reset local state from report
      setLocalAllocations(cloneAllocations(report.allocations));
      const allExpanded: Record<number, boolean> = {};
      report.allocations.forEach((bl) => {
        allExpanded[bl.bl_number] = true;
      });
      setExpandedBLs(allExpanded);
    }
    setIsEditMode((prev) => !prev);
  }, [isEditMode, report.allocations]);

  // Reset to original allocation
  const handleReset = useCallback(() => {
    setLocalAllocations(cloneAllocations(report.allocations));
  }, [report.allocations]);

  // Save modified BL assignments
  const handleSaveModified = useCallback(async () => {
    // Temporarily patch the report allocations, call the parent save, then restore
    // We modify report.allocations in-place temporarily for the save
    const originalAllocations = report.allocations;
    try {
      setSaving(true);
      // Swap in our local allocations so onSaveDraft picks them up
      (report as { allocations: BLAllocation[] }).allocations = localAllocations;
      await onSaveDraft();
      setIsEditMode(false);
    } catch {
      // Restore original on error
      (report as { allocations: BLAllocation[] }).allocations = originalAllocations;
    } finally {
      setSaving(false);
    }
  }, [localAllocations, onSaveDraft, report]);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as { product: BLProductAllocation; blNumber: number } | undefined;
    if (data) {
      setActiveProduct(data.product);
      setActiveProductId(data.product.product_id);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProduct(null);
    setActiveProductId(null);

    if (!over || !active) return;

    const activeData = active.data.current as { product: BLProductAllocation; blNumber: number } | undefined;
    if (!activeData) return;

    const sourceBl = activeData.blNumber;
    const productToMove = activeData.product;

    // Determine target BL from the over id
    const overId = over.id as string;
    let targetBl: number | null = null;

    if (overId.startsWith('bl-')) {
      // Dropped on a BL droppable zone
      targetBl = parseInt(overId.replace('bl-', ''), 10);
    } else if (overId.includes('-')) {
      // Dropped on another product row — extract BL number from the draggable id
      const parts = overId.split('-');
      targetBl = parseInt(parts[0], 10);
    }

    if (targetBl === null || isNaN(targetBl) || sourceBl === targetBl) return;

    // Move product from source BL to target BL
    setLocalAllocations((prev) => {
      const next = cloneAllocations(prev);

      const sourceIdx = next.findIndex((bl) => bl.bl_number === sourceBl);
      const targetIdx = next.findIndex((bl) => bl.bl_number === targetBl);
      if (sourceIdx === -1 || targetIdx === -1) return prev;

      // Remove from source
      const productIdx = next[sourceIdx].products.findIndex(
        (p) => p.product_id === productToMove.product_id
      );
      if (productIdx === -1) return prev;

      const [removed] = next[sourceIdx].products.splice(productIdx, 1);

      // Add to target
      next[targetIdx].products.push(removed);

      // Recalculate totals
      next[sourceIdx] = recalcBLTotals(next[sourceIdx]);
      next[targetIdx] = recalcBLTotals(next[targetIdx]);

      return next;
    });
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveProduct(null);
    setActiveProductId(null);
  }, []);

  // Use localAllocations in edit mode, original report otherwise
  const displayAllocations = isEditMode ? localAllocations : report.allocations;

  // Custom collision detection: prefer droppable zones (bl-*), fall back to closest center
  const collisionDetection = useCallback(
    (args: Parameters<typeof closestCenter>[0]) => {
      // First try pointerWithin — detects when pointer is inside a droppable
      const pointerCollisions = pointerWithin(args);
      if (pointerCollisions.length > 0) {
        // Prefer BL droppable zones over product rows
        const blZone = pointerCollisions.find((c) => (c.id as string).startsWith('bl-'));
        if (blZone) return [blZone];
        return pointerCollisions;
      }
      // Fallback to closest center
      return closestCenter(args);
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">
            {t('blAllocation.title', 'Asignación de BLs')}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {report.num_bls} BLs | {report.total_containers}{' '}
            {t('blAllocation.containers', 'contenedores')} | {report.total_pallets}{' '}
            {t('blAllocation.pallets', 'paletas')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Mode Toggle */}
          {canEdit && (
            <button
              onClick={handleToggleEditMode}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all duration-200 ${
                isEditMode
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30'
                  : 'text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
              }`}
            >
              {isEditMode ? t('blAllocation.viewBLs', 'Ver BLs') : t('blAllocation.editBLs', 'Editar BLs')}
            </button>
          )}

          {/* Expand/Collapse All */}
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t('blAllocation.expandAll', 'Expandir Todo')}
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            {t('blAllocation.collapseAll', 'Contraer Todo')}
          </button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400 text-sm font-medium">
              Modo edici{'\u00F3'}n: Arrastra productos entre BLs para reorganizar
            </span>
          </div>
          {hasModifications && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700/50 rounded-lg transition-colors"
              >
                Restablecer
              </button>
              <button
                onClick={handleSaveModified}
                disabled={saving}
                className="px-3 py-1.5 text-sm font-medium bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Risk Distribution */}
      <RiskDistribution report={report} />

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-amber-300">
            {t('blAllocation.warnings', 'Advertencias')}
          </h3>
          <ul className="text-sm text-amber-200/80 space-y-1">
            {report.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>{'\u26A0\uFE0F'}</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BL Cards — wrapped in DndContext when in edit mode */}
      {isEditMode ? (
        <DndContext
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-3">
            {displayAllocations.map((bl) => (
              <BLCard
                key={bl.bl_number}
                bl={bl}
                isExpanded={expandedBLs[bl.bl_number] ?? false}
                onToggleExpand={() => toggleBL(bl.bl_number)}
                isEditMode={true}
                activeProductId={activeProductId}
              />
            ))}
          </div>

          {/* Drag Overlay — ghost preview of dragged product */}
          <DragOverlay dropAnimation={null}>
            {activeProduct ? (
              <DragOverlayProductRow product={activeProduct} />
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          {displayAllocations.map((bl) => (
            <BLCard
              key={bl.bl_number}
              bl={bl}
              isExpanded={expandedBLs[bl.bl_number] ?? false}
              onToggleExpand={() => toggleBL(bl.bl_number)}
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={onBack}
          className="px-4 py-2.5 bg-slate-800/50 text-slate-300 font-medium rounded-xl border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all duration-300"
        >
          {'\u2190'} {t('blAllocation.backToProducts', 'Volver a Productos')}
        </button>

        <button
          onClick={async () => {
            setSaving(true);
            try { await onSaveDraft(); } finally { setSaving(false); }
          }}
          disabled={saving}
          className="px-4 py-2.5 font-medium rounded-xl border transition-all duration-300 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30 hover:text-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving
            ? t('blAllocation.savingDraft', 'Guardando...')
            : t('blAllocation.saveDraft', 'Guardar borrador')}
        </button>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all duration-300 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isExporting
            ? t('blAllocation.exporting', 'Exportando...')
            : t('blAllocation.exportBLs', 'Exportar BLs')}
        </button>
      </div>

      {/* Generation Info */}
      <div className="text-xs text-slate-500 text-center pt-2">
        {t('blAllocation.generatedAt', 'Generado')}: {new Date(report.generated_at).toLocaleString()}
        {' | '}
        {t('blAllocation.boat', 'Barco')}: {report.boat_name} ({report.boat_departure})
      </div>
    </div>
  );
}
