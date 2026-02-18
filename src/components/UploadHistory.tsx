import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dataHubApi } from '../requests/dataHub';
import type { UploadHistoryItem } from '../requests/dataHub';

interface UploadHistoryProps {
  refreshKey: number;
}

const TYPE_COLORS: Record<string, string> = {
  sales: 'bg-blue-100 text-blue-700',
  inventory: 'bg-green-100 text-green-700',
  siesa: 'bg-emerald-100 text-emerald-700',
  boats: 'bg-purple-100 text-purple-700',
  in_transit: 'bg-amber-100 text-amber-700',
  production_schedule: 'bg-indigo-100 text-indigo-700',
  shipment_pdf: 'bg-pink-100 text-pink-700',
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dataHub.history.title', 'Historial de cargas')}
        </h3>
        <p className="text-sm text-gray-500 animate-pulse">
          {t('common.loading', 'Cargando...')}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('dataHub.history.title', 'Historial de cargas')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('dataHub.history.empty', 'No hay cargas registradas.')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('dataHub.history.title', 'Historial de cargas')}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 text-gray-500 font-medium">
                {t('dataHub.history.date', 'Fecha')}
              </th>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">
                {t('dataHub.history.type', 'Tipo')}
              </th>
              <th className="text-left py-2 px-2 text-gray-500 font-medium">
                {t('dataHub.history.file', 'Archivo')}
              </th>
              <th className="text-right py-2 px-2 text-gray-500 font-medium">
                {t('dataHub.history.rows', 'Filas')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-2 px-2 text-gray-600 whitespace-nowrap">
                  {formatDate(item.uploaded_at)}
                </td>
                <td className="py-2 px-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    TYPE_COLORS[item.upload_type] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.label}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-900 max-w-[200px] truncate" title={item.filename}>
                  {item.filename}
                </td>
                <td className="py-2 px-2 text-right text-gray-600">
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
