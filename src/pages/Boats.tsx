import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { boatsApi } from '../requests/boats';
import type { BoatSchedule, BoatStatus } from '../requests/boats';
import { BoatTable } from '../components/BoatTable';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Boats() {
  const { t } = useTranslation();
  const [boats, setBoats] = useState<BoatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBoats();
  }, []);

  const loadBoats = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await boatsApi.getAll();
      setBoats(result.data);
    } catch (err) {
      setError(t('boats.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: BoatStatus) => {
    try {
      await boatsApi.updateStatus(id, status);
      // Update local state
      setBoats((prev) =>
        prev.map((boat) =>
          boat.id === id ? { ...boat, status } : boat
        )
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      // Reload to get correct state
      loadBoats();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadBoats}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          {t('common.tryAgain')}
        </button>
      </div>
    );
  }

  // Count boats by status
  const availableCount = boats.filter((b) => b.status === 'available').length;
  const bookedCount = boats.filter((b) => b.status === 'booked').length;
  const urgentCount = boats.filter(
    (b) => b.status === 'available' && b.days_until_departure !== null && b.days_until_departure <= 7
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('boats.title')}</h1>
          <p className="text-gray-600">
            {t('boats.subtitle')}
          </p>
        </div>
        <Link
          to="/data-hub"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('boats.uploadTiba')} →
        </Link>
      </div>

      {/* Summary Cards */}
      {boats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{boats.length}</div>
            <div className="text-sm text-gray-600">{t('boats.totalBoats')}</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="text-3xl font-bold text-green-800">{availableCount}</div>
            <div className="text-sm text-green-700">{t('boats.available')}</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-3xl font-bold text-blue-800">{bookedCount}</div>
            <div className="text-sm text-blue-700">{t('boats.booked')}</div>
          </div>
          {urgentCount > 0 && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <div className="text-3xl font-bold text-orange-800">{urgentCount}</div>
              <div className="text-sm text-orange-700">{t('boats.leavesSoon')}</div>
            </div>
          )}
        </div>
      )}

      {/* Boat Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <BoatTable boats={boats} onStatusChange={handleStatusChange} />
      </div>

    </div>
  );
}
