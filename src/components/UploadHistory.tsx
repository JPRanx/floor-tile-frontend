import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { UploadHistoryItem } from '../requests/dataHub';

interface UploadHistoryProps {
  refreshKey: number;
}

const TYPE_COLORS: Record<string, string> = {
  sales: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  inventory: 'bg-green-500/15 text-green-400 border border-green-500/30',
  siesa: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  boats: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  in_transit: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  production_schedule: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
  shipment_pdf: 'bg-pink-500/15 text-pink-400 border border-pink-500/30',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UploadHistory({ refreshKey }: UploadHistoryProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<UploadHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await dataHubApi.getUploadHistory(20);
        setItems(data.items);
      } catch (err) {
        console.error('Failed to load upload history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">
          {t('dataHub.history.title', 'Historial de cargas')}
        </h3>
        <p className="text-sm text-slate-500 animate-pulse">
          {t('common.loading', 'Cargando...')}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">
          {t('dataHub.history.title', 'Historial de cargas')}
        </h3>
        <p className="text-sm text-slate-500">
          {t('dataHub.history.empty', 'No hay cargas registradas.')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-4">
        {t('dataHub.history.title', 'Historial de cargas')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-2 text-slate-500 font-medium">
                {t('dataHub.history.date', 'Fecha')}
              </th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">
                {t('dataHub.history.type', 'Tipo')}
              </th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">
                {t('dataHub.history.file', 'Archivo')}
              </th>
              <th className="text-right py-2 px-2 text-slate-500 font-medium">
                {t('dataHub.history.rows', 'Filas')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-slate-900">
                <td className="py-2 px-2 text-slate-400 whitespace-nowrap">
                  {formatDate(item.uploaded_at)}
                </td>
                <td className="py-2 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    TYPE_COLORS[item.upload_type] || 'bg-slate-700 text-slate-300'
                  }`}>
                    {item.label}
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-200 max-w-[200px] truncate" title={item.filename}>
                  {item.filename}
                </td>
                <td className="py-2 px-2 text-right text-slate-400">
                  {item.row_count > 0 ? item.row_count.toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
