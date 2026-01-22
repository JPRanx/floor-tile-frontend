import { useEffect, useRef } from 'react';

interface MiniSparklineProps {
  data: number[];
  trend: 'up' | 'down' | 'stable';
  width?: number;
  height?: number;
}

const trendColors = {
  up: '#10B981',    // Emerald
  down: '#F43F5E',  // Rose
  stable: '#F59E0B', // Amber
};

export function MiniSparkline({
  data,
  trend,
  width = 60,
  height = 20
}: MiniSparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!svgRef.current || !pathRef.current || data.length === 0) return;

    const path = pathRef.current;

    // Calculate points
    const maxValue = Math.max(...data, 1);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 4) - 2;
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
  }, [data, width, height]);

  if (data.length === 0) {
    return <div className="w-full h-full" style={{ width, height }} />;
  }

  const strokeColor = trendColors[trend];

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="overflow-visible flex-shrink-0"
    >
      <path
        ref={pathRef}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}
