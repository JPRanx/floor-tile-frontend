import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SparklinePoint } from '../../requests/intelligence';

interface SparklineProps {
  data: SparklinePoint[];
  color?: 'emerald' | 'amber' | 'rose' | 'slate';
  height?: number;
  animated?: boolean;
}

const colorMap = {
  emerald: { stroke: '#10B981', fill: 'rgba(16, 185, 129, 0.1)' },
  amber: { stroke: '#F59E0B', fill: 'rgba(245, 158, 11, 0.1)' },
  rose: { stroke: '#F43F5E', fill: 'rgba(244, 63, 94, 0.1)' },
  slate: { stroke: '#64748B', fill: 'rgba(100, 116, 139, 0.1)' },
};

export function Sparkline({ data, color = 'emerald', height = 40, animated = true }: SparklineProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!svgRef.current || !pathRef.current || data.length === 0) return;

    const svg = svgRef.current;
    const path = pathRef.current;
    const width = svg.clientWidth || 120;

    // Calculate points
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d.value - minValue) / range) * (height - 8) - 4;
      return { x, y };
    });

    // Create smooth curve path
    const pathD = points.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + point.x) / 2;
      return `${acc} Q ${cpx} ${prev.y} ${point.x} ${point.y}`;
    }, '');

    path.setAttribute('d', pathD);

    // Animate drawing
    if (animated) {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.transition = 'stroke-dashoffset 1s ease-out';

      requestAnimationFrame(() => {
        path.style.strokeDashoffset = '0';
      });
    }
  }, [data, height, animated]);

  if (data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-slate-600 text-xs" style={{ height }}>
        {t('intelligence.sparkline.noData', 'Sin datos')}
      </div>
    );
  }

  const { stroke, fill } = colorMap[color];

  return (
    <svg ref={svgRef} width="100%" height={height} className="overflow-visible">
      {/* Gradient fill area */}
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>

      {/* Line path */}
      <path
        ref={pathRef}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
