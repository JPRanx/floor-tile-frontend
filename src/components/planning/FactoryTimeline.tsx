interface TimelineMilestone {
  key: string;
  label: string;
  date: string;
  passed: boolean;
  is_current: boolean;
}

interface FactoryTimelineData {
  milestones: TimelineMilestone[];
  current_milestone: string;
}

interface FactoryTimelineProps {
  timeline: FactoryTimelineData | null;
}

const MILESTONE_ICONS: Record<string, string> = {
  factory_request_cutoff: '\u{1F3ED}',
  piggyback_cutoff: '\u2795',
  order_deadline: '\u{1F4CB}',
  departure: '\u{1F6A2}',
  arrival: '\u2693',
  in_warehouse: '\u{1F4E6}',
};

const SPANISH_MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function formatDateDDMMM(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00');
  const day = d.getDate();
  const month = SPANISH_MONTHS[d.getMonth()];
  return `${day} ${month}`;
}

export function FactoryTimeline({ timeline }: FactoryTimelineProps) {
  if (!timeline) return null;

  const { milestones } = timeline;
  if (milestones.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-xl">
      {/* Horizontal scroll on small screens */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Icons + Labels Row */}
          <div className="flex justify-between mb-2">
            {milestones.map((m) => (
              <div key={m.key} className="flex flex-col items-center w-0 flex-1">
                <span className="text-lg mb-1">
                  {MILESTONE_ICONS[m.key] || '\u{1F4CC}'}
                </span>
                <span
                  className={`text-[11px] leading-tight text-center font-medium ${
                    m.passed || m.is_current ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {m.label}
                </span>
              </div>
            ))}
          </div>

          {/* Dates Row */}
          <div className="flex justify-between mb-3">
            {milestones.map((m) => (
              <div key={m.key} className="flex flex-col items-center w-0 flex-1">
                <span
                  className={`text-xs ${
                    m.passed || m.is_current ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {formatDateDDMMM(m.date)}
                </span>
              </div>
            ))}
          </div>

          {/* Timeline Track */}
          <div className="relative flex items-center h-8">
            {/* Background line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-700 rounded-full" />

            {/* Green progress line — from first to last passed/current milestone */}
            {(() => {
              const lastPassedIdx = milestones.reduce(
                (acc, m, i) => (m.passed || m.is_current ? i : acc),
                0
              );
              const progressPercent =
                milestones.length > 1
                  ? (lastPassedIdx / (milestones.length - 1)) * 100
                  : 0;
              return (
                <div
                  className="absolute top-1/2 -translate-y-1/2 left-0 h-0.5 bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              );
            })()}

            {/* Milestone dots */}
            <div className="relative flex justify-between w-full">
              {milestones.map((m) => (
                <div key={m.key} className="flex flex-col items-center w-0 flex-1">
                  {m.is_current ? (
                    /* Current: pulsing indigo dot */
                    <div className="relative">
                      <div className="absolute -inset-2 bg-indigo-500/20 rounded-full animate-ping" />
                      <div className="relative w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-indigo-300 shadow-lg shadow-indigo-500/50" />
                    </div>
                  ) : m.passed ? (
                    /* Passed: green filled with check */
                    <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-emerald-400 flex items-center justify-center">
                      <svg
                        className="w-2 h-2 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={4}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    /* Future: gray hollow */
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-600 bg-slate-800" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* "AQUI" indicator below current */}
          <div className="flex justify-between mt-1">
            {milestones.map((m) => (
              <div key={m.key} className="flex flex-col items-center w-0 flex-1">
                {m.is_current ? (
                  <span className="text-[10px] font-bold text-indigo-400 tracking-wider">
                    {'\u25B2'} AQU{'\u00CD'}
                  </span>
                ) : m.passed ? (
                  <span className="text-[10px] text-emerald-500/70">{'\u2713'}</span>
                ) : (
                  <span className="text-[10px] text-transparent">{'\u00B7'}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
