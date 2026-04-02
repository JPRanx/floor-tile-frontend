import { useEffect } from 'react';
interface UploadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function UploadPreviewModal({ isOpen, onClose, title, children, wide }: UploadPreviewModalProps) {

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative bg-slate-800 rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
          {/* Sticky Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-400 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
