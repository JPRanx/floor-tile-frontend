import { useEffect, useState } from 'react';
import { boatsApi } from '../requests/boats';
import type { BoatSchedule, BoatStatus } from '../requests/boats';
import { BoatTable } from '../components/BoatTable';
import { BoatUploadModal } from '../components/BoatUploadModal';
import { LoadingSpinner } from '../components/LoadingSpinner';

export function Boats() {
  const [boats, setBoats] = useState<BoatSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
      setError('Failed to load boat schedules. Is the backend running?');
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

  const handleUploadSuccess = () => {
    loadBoats();
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
          Try again
        </button>
      </div>
    );
  }

  // Count boats by status
  const availableCount = boats.filter((b) => b.status === 'available').length;
  const bookedCount = boats.filter((b) => b.status === 'booked').length;
  const urgentCount = boats.filter(
    (b) => b.status === 'available' && b.days_until_deadline !== null && b.days_until_deadline <= 3
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Boat Schedules</h1>
          <p className="text-gray-600">
            Manage shipping schedules from Spain to Puerto Quetzal
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload TIBA Excel
        </button>
      </div>

      {/* Summary Cards */}
      {boats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{boats.length}</div>
            <div className="text-sm text-gray-600">Total Boats</div>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="text-3xl font-bold text-green-800">{availableCount}</div>
            <div className="text-sm text-green-700">Available</div>
          </div>
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="text-3xl font-bold text-blue-800">{bookedCount}</div>
            <div className="text-sm text-blue-700">Booked</div>
          </div>
          {urgentCount > 0 && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
              <div className="text-3xl font-bold text-orange-800">{urgentCount}</div>
              <div className="text-sm text-orange-700">Book Soon (≤3 days)</div>
            </div>
          )}
        </div>
      )}

      {/* Boat Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <BoatTable boats={boats} onStatusChange={handleStatusChange} />
      </div>

      {/* Upload Modal */}
      <BoatUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
