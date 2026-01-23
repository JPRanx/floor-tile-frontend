import type { Brief } from '../../utils/briefGenerator';

interface InsightBriefProps {
  brief: Brief;
}

const recommendationColors: Record<string, string> = {
  urgent: 'bg-red-500/20 border-red-500/50 text-red-300',
  action: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  monitor: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  maintain: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
};

const partColors: Record<string, string> = {
  normal: 'text-slate-300',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  positive: 'text-emerald-400',
};

/**
 * Renders markdown-style bold text within a string.
 * Converts **text** to <strong>text</strong>
 */
function renderWithBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function InsightBrief({ brief }: InsightBriefProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      {/* Brief text */}
      <p className="text-sm leading-relaxed mb-3">
        {brief.parts.map((part, i) => (
          <span key={i} className={partColors[part.type]}>
            {renderWithBold(part.text)}{' '}
          </span>
        ))}
      </p>

      {/* Recommendation badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${recommendationColors[brief.recommendationType]}`}
      >
        <span className="font-semibold">Acción:</span>
        {brief.recommendation}
      </div>
    </div>
  );
}
