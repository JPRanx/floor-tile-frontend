import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { shipmentsApi } from '../../requests/shipments';
import type { Shipment } from '../../requests/shipments';

export function ShipmentCostsPanel() {
  const { t } = useTranslation();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const shipments = await shipmentsApi.list();
        // Find most recent shipment with costs
        const withCosts = shipments.find(s => s.total_cost_usd && s.total_cost_usd > 0);
        setShipment(withCosts || null);
      } catch (err) {
        setError(t('analytics.loadError'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [t]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{t('analytics.shipmentCosts')}</h3>
        <div className="flex items-center justify-center h-[200px]">
          <div className="text-slate-400">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-white font-semibold mb-4">{t('analytics.shipmentCosts')}</h3>
        <p className="text-slate-400 mb-4">{error || t('analytics.noShipmentCosts')}</p>
        <Link
          to="/shipments"
          className="text-indigo-400 hover:text-indigo-300 text-sm"
        >
          {t('analytics.viewAllShipments')} →
        </Link>
      </div>
    );
  }

  const costs = [
    { key: 'freight', label: t('costs.freight'), value: shipment.freight_cost_usd || 0 },
    { key: 'customs', label: t('costs.customs'), value: shipment.customs_cost_usd || 0 },
    { key: 'duties', label: t('costs.duties'), value: shipment.duties_cost_usd || 0 },
    { key: 'insurance', label: t('costs.insurance'), value: shipment.insurance_cost_usd || 0 },
    { key: 'demurrage', label: t('costs.demurrage'), value: shipment.demurrage_cost_usd || 0 },
    { key: 'other', label: t('costs.other'), value: shipment.other_costs_usd || 0 },
  ];

  const maxCost = Math.max(...costs.map(c => c.value), 1);
  const totalCost = shipment.total_cost_usd || 0;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
      <h3 className="text-white font-semibold mb-4">{t('analytics.shipmentCosts')}</h3>

      {/* Shipment Header */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline">
          <span className="text-slate-200 font-medium">{shipment.shp_number || 'N/A'}</span>
          <span className="text-indigo-400 font-semibold">
            ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-slate-500 text-sm">
          {shipment.vessel_name || 'Unknown vessel'} · {t(`status.${shipment.status}`)}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2 mb-4">
        {costs.filter(c => c.value > 0).map(cost => {
          const barWidth = (cost.value / maxCost) * 100;
          return (
            <div key={cost.key} className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 w-20 truncate">{cost.label}</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500/60 rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-slate-300 w-16 text-right">
                ${cost.value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Link to Shipments */}
      <Link
        to="/shipments"
        className="text-indigo-400 hover:text-indigo-300 text-sm"
      >
        {t('analytics.viewAllShipments')} →
      </Link>
    </div>
  );
}
