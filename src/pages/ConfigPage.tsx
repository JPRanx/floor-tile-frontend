import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { configApi } from '../requests/config';
import type { ConfigResponse, ProductTypeConfig, ProductTypeCreate } from '../requests/config';
import { LoadingSpinner } from '../components/LoadingSpinner';

const CATEGORY_ORDER = ['shipping', 'warehouse', 'inventory', 'liquidation', 'production', 'container'];

const EMPTY_NEW_TYPE: ProductTypeCreate = {
  category_group: '',
  display_name: '',
  m2_per_pallet: 0,
  weight_per_m2_kg: 0,
  is_m2_based: true,
  unit_label: 'm²',
};

export function ConfigPage() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Setting inline edit
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Product type edit
  const [editingType, setEditingType] = useState<string | null>(null);
  const [typeForm, setTypeForm] = useState<Partial<ProductTypeCreate>>({});

  // New product type modal
  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [newType, setNewType] = useState<ProductTypeCreate>({ ...EMPTY_NEW_TYPE });

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await configApi.getConfig();
      setConfig(data);
    } catch {
      setError(t('config.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // --- Global Settings ---

  const handleSaveSetting = async (key: string) => {
    setSaving(true);
    setError(null);
    try {
      await configApi.updateSetting(key, editValue);
      const fresh = await configApi.getConfig();
      setConfig(fresh);
      setEditingKey(null);
      showSuccess(t('config.updated', { key }));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('config.saveSettingError'));
    } finally {
      setSaving(false);
    }
  };

  // --- Product Types ---

  const handleSaveType = async (categoryGroup: string) => {
    setSaving(true);
    setError(null);
    try {
      await configApi.updateProductType(categoryGroup, typeForm);
      const fresh = await configApi.getConfig();
      setConfig(fresh);
      setEditingType(null);
      setTypeForm({});
      showSuccess(t('config.updated', { key: categoryGroup }));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('config.saveTypeError'));
    } finally {
      setSaving(false);
    }
  };

  const startEditType = (pt: ProductTypeConfig) => {
    setEditingType(pt.category_group);
    setTypeForm({
      display_name: pt.display_name,
      m2_per_pallet: parseFloat(pt.m2_per_pallet),
      weight_per_m2_kg: parseFloat(pt.weight_per_m2_kg),
      is_m2_based: pt.is_m2_based,
      unit_label: pt.unit_label,
    });
  };

  const handleCreateType = async () => {
    setSaving(true);
    setError(null);
    try {
      await configApi.createProductType(newType);
      const fresh = await configApi.getConfig();
      setConfig(fresh);
      setShowNewTypeModal(false);
      setNewType({ ...EMPTY_NEW_TYPE });
      showSuccess(t('config.created', { key: newType.category_group }));
    } catch (err: any) {
      setError(err.response?.data?.detail || t('config.createTypeError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // --- Group settings by category ---

  const groupedSettings = (): Record<string, Array<[string, string]>> => {
    if (!config) return {};
    // We need categories from the DB. Since GET /config only returns key:value,
    // group by known prefixes. Settings with known categories:
    const groups: Record<string, Array<[string, string]>> = {};
    const keyCategories: Record<string, string> = {
      container_max_weight_kg: 'shipping', container_max_pallets: 'shipping', container_max_m2: 'shipping',
      m2_per_pallet: 'shipping', boat_max_containers: 'shipping', boat_min_containers: 'shipping',
      lead_time_days: 'shipping', cycle_days: 'shipping', fob_price_cartagena_usd: 'shipping',
      destination_port_wait_days: 'shipping', origin_port_wait_days: 'shipping',
      order_deadline_days: 'shipping', hard_deadline_days: 'shipping', booking_buffer_days: 'shipping',
      port_buffer_days: 'shipping', trucking_days: 'shipping', ordering_cycle_days: 'shipping',
      weight_per_m2_kg: 'shipping',
      warehouse_max_pallets: 'warehouse', warehouse_max_m2: 'warehouse',
      warehouse_capacity_pallets: 'warehouse', warehouse_floor_m2: 'warehouse',
      safety_stock_z_score: 'inventory', safety_stock_service_level: 'inventory',
      stockout_critical_days: 'inventory', stockout_warning_days: 'inventory',
      default_free_days: 'inventory', free_days_critical: 'inventory', free_days_warning: 'inventory',
      liquidation_declining_trend_pct: 'liquidation', liquidation_declining_days_min: 'liquidation',
      liquidation_no_sales_days: 'liquidation', liquidation_extreme_days_min: 'liquidation',
      production_buffer_days: 'production', monthly_production_limit_m2: 'production',
      container_unload_hours: 'container',
    };

    for (const [key, value] of Object.entries(config.global)) {
      const cat = keyCategories[key] || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push([key, value]);
    }

    // Sort keys within each category
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a[0].localeCompare(b[0]));
    }
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400">{error || t('config.loadError')}</p>
      </div>
    );
  }

  const groups = groupedSettings();
  const productTypes = Object.values(config.product_types);

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{t('config.title')}</h1>
          <p className="text-slate-400 mt-1">{t('config.subtitle')}</p>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-3">×</button>
          </div>
        )}

        {/* ========================= */}
        {/* GLOBAL SETTINGS            */}
        {/* ========================= */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">{t('config.globalSettings')}</h2>

          <div className="space-y-3">
            {CATEGORY_ORDER.map(cat => {
              const settings = groups[cat];
              if (!settings || settings.length === 0) return null;
              const isCollapsed = collapsedCategories.has(cat);

              return (
                <div key={cat} className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-750 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      {t(`config.categories.${cat}`, cat)}
                      <span className="text-slate-500 font-normal ml-2">({settings.length})</span>
                    </h3>
                    <span className={`text-slate-500 text-xs transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}>
                      ▼
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="border-t border-slate-700">
                      {settings.map(([key, value]) => (
                        <div key={key} className="px-5 py-3 flex items-center justify-between border-b border-slate-700/50 last:border-b-0">
                          <div className="flex-1 min-w-0 mr-4">
                            <span className="text-sm text-slate-300 font-mono">{key}</span>
                          </div>
                          <div className="flex-shrink-0">
                            {editingKey === key ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSetting(key); if (e.key === 'Escape') setEditingKey(null); }}
                                  className="px-3 py-1.5 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none w-32 text-sm font-mono"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveSetting(key)}
                                  disabled={saving}
                                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                  {t('config.save')}
                                </button>
                                <button
                                  onClick={() => setEditingKey(null)}
                                  className="px-3 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                                >
                                  {t('config.cancel')}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-mono">{value}</span>
                                <button
                                  onClick={() => { setEditingKey(key); setEditValue(value); }}
                                  className="px-2 py-0.5 text-xs text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                                >
                                  {t('config.edit')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Uncategorized */}
            {groups['other'] && groups['other'].length > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                <div className="px-5 py-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{t('config.other')}</h3>
                </div>
                <div className="border-t border-slate-700">
                  {groups['other'].map(([key, value]) => (
                    <div key={key} className="px-5 py-3 flex items-center justify-between border-b border-slate-700/50 last:border-b-0">
                      <span className="text-sm text-slate-300 font-mono">{key}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-mono">{value}</span>
                        <button
                          onClick={() => { setEditingKey(key); setEditValue(value); }}
                          className="px-2 py-0.5 text-xs text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600"
                        >
                          {t('config.edit')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================= */}
        {/* PRODUCT TYPES              */}
        {/* ========================= */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">{t('config.productTypes')}</h2>

          <div className="space-y-4">
            {productTypes.map(pt => (
              <div key={pt.category_group} className="bg-slate-800 rounded-lg border border-slate-700 p-5">
                {editingType === pt.category_group ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white">{pt.category_group}</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveType(pt.category_group)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {t('config.save')}
                        </button>
                        <button
                          onClick={() => { setEditingType(null); setTypeForm({}); }}
                          className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                        >
                          {t('config.cancel')}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">{t('config.displayName')}</label>
                        <input
                          type="text"
                          value={typeForm.display_name || ''}
                          onChange={(e) => setTypeForm({ ...typeForm, display_name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">{t('config.unitLabel')}</label>
                        <input
                          type="text"
                          value={typeForm.unit_label || ''}
                          onChange={(e) => setTypeForm({ ...typeForm, unit_label: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          {pt.is_m2_based ? t('config.m2PerPallet') : t('config.unitsPerPallet')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={typeForm.m2_per_pallet ?? ''}
                          onChange={(e) => setTypeForm({ ...typeForm, m2_per_pallet: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          {pt.is_m2_based ? t('config.weightPerM2Kg') : t('config.weightPerUnitKg')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={typeForm.weight_per_m2_kg ?? ''}
                          onChange={(e) => setTypeForm({ ...typeForm, weight_per_m2_kg: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{pt.category_group}</h3>
                        <p className="text-sm text-slate-400">{pt.display_name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          pt.is_m2_based
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {pt.is_m2_based ? t('config.areaBased') : t('config.unitBased')}
                        </span>
                        <button
                          onClick={() => startEditType(pt)}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                        >
                          {t('config.edit')}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400 block">{pt.is_m2_based ? t('config.m2PerPallet') : t('config.unitsPerPallet')}</span>
                        <p className="text-white font-mono">{pt.m2_per_pallet}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{pt.is_m2_based ? t('config.weightPerM2') : t('config.weightPerUnit')}</span>
                        <p className="text-white font-mono">{pt.weight_per_m2_kg} kg</p>
                      </div>
                      <div>
                        <span className="text-slate-400 block">{t('config.unit')}</span>
                        <p className="text-white font-mono">{pt.unit_label}</p>
                      </div>
                    </div>
                    {pt.notes && (
                      <p className="text-xs text-slate-500 mt-2">{pt.notes}</p>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Add New Product Type button */}
            <button
              onClick={() => setShowNewTypeModal(true)}
              className="w-full py-4 border-2 border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors text-sm font-medium"
            >
              {t('config.addNewProductType')}
            </button>
          </div>
        </div>
      </div>

      {/* ========================= */}
      {/* NEW PRODUCT TYPE MODAL     */}
      {/* ========================= */}
      {showNewTypeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">{t('config.newProductType')}</h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 block mb-1">{t('config.categoryGroup')}</label>
                <input
                  type="text"
                  placeholder="MUEBLES"
                  value={newType.category_group}
                  onChange={(e) => setNewType({ ...newType, category_group: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">{t('config.displayName')}</label>
                <input
                  type="text"
                  placeholder="Bathroom Furniture"
                  value={newType.display_name}
                  onChange={(e) => setNewType({ ...newType, display_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">{t('config.measurementType')}</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewType({ ...newType, is_m2_based: true, unit_label: 'm²' })}
                    className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                      newType.is_m2_based ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {t('config.areaBasedM2')}
                  </button>
                  <button
                    onClick={() => setNewType({ ...newType, is_m2_based: false, unit_label: 'units' })}
                    className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                      !newType.is_m2_based ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {t('config.unitBased')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">
                    {newType.is_m2_based ? t('config.m2PerPallet') : t('config.unitsPerPallet')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newType.m2_per_pallet || ''}
                    onChange={(e) => setNewType({ ...newType, m2_per_pallet: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">
                    {newType.is_m2_based ? t('config.weightPerM2Kg') : t('config.weightPerUnitKg')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newType.weight_per_m2_kg || ''}
                    onChange={(e) => setNewType({ ...newType, weight_per_m2_kg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => { setShowNewTypeModal(false); setNewType({ ...EMPTY_NEW_TYPE }); }}
                className="px-4 py-2 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
              >
                {t('config.cancel')}
              </button>
              <button
                onClick={handleCreateType}
                disabled={!newType.category_group || !newType.display_name || saving}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {t('config.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
