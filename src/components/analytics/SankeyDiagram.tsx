import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import * as d3Sankey from 'd3-sankey';
import { analyticsApi } from '../../requests/analytics';
import type { MoneyFlowResponse } from '../../requests/analytics';

interface SankeyNodeData {
  id: string;
  displayName: string;
  type: 'customer' | 'revenue' | 'cost' | 'margin' | 'loss';
}

interface SankeyLinkData {
  source: string;
  target: string;
  value: number;
}

// Type for Sankey node with position data
interface SankeyNodeWithPos extends SankeyNodeData {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

// Design tokens
const colors: Record<string, string> = {
  customer: '#10B981',  // Emerald
  revenue: '#10B981',   // Emerald (center)
  cost: '#6366F1',      // Indigo
  margin: '#F59E0B',    // Gold
  loss: '#EF4444',      // Red for negative margin
};

// Truncate long names with ellipsis
function truncateName(name: string, maxLength: number = 25): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
}

interface SankeyDiagramProps {
  groupBy: 'customer' | 'product';
  onGroupByChange: (value: 'customer' | 'product') => void;
}

export function SankeyDiagram({ groupBy, onGroupByChange }: SankeyDiagramProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<MoneyFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await analyticsApi.getMoneyFlow(groupBy);
        setData(response);
      } catch (err) {
        setError(t('analytics.loadError'));
        console.error('Failed to load money flow:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [t, groupBy]);

  // Render Sankey
  useEffect(() => {
    // Cleanup previous animation
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = 400;
    // Increased left margin for customer names
    const margin = { top: 20, right: 140, bottom: 20, left: 160 };

    // Transform API data to Sankey format
    const nodes: SankeyNodeData[] = [];
    const links: SankeyLinkData[] = [];
    const revenueLabel = t('analytics.revenue');
    const marginLabel = t('analytics.margin');
    const lossLabel = t('analytics.loss') || 'Loss';

    // Filter out $0 inflows and add customer nodes (left)
    const validInflows = data.inflows.filter(inflow => parseFloat(inflow.amount) > 0);
    validInflows.forEach(inflow => {
      const truncatedName = truncateName(inflow.source);
      nodes.push({
        id: inflow.source,
        displayName: truncatedName,
        type: 'customer'
      });
      links.push({
        source: inflow.source,
        target: revenueLabel,
        value: parseFloat(inflow.amount)
      });
    });

    // Add revenue node (center)
    nodes.push({ id: revenueLabel, displayName: revenueLabel, type: 'revenue' });

    // Filter out $0 outflows and add cost nodes (right)
    const validOutflows = data.outflows.filter(outflow => parseFloat(outflow.amount) > 0);
    validOutflows.forEach(outflow => {
      nodes.push({
        id: outflow.category,
        displayName: outflow.category,
        type: 'cost'
      });
      links.push({
        source: revenueLabel,
        target: outflow.category,
        value: parseFloat(outflow.amount)
      });
    });

    // Handle margin (positive or negative)
    const marginValue = parseFloat(data.margin);
    if (marginValue > 0) {
      nodes.push({ id: marginLabel, displayName: marginLabel, type: 'margin' });
      links.push({
        source: revenueLabel,
        target: marginLabel,
        value: marginValue
      });
    } else if (marginValue < 0) {
      // Show negative margin as loss node
      const absMargin = Math.abs(marginValue);
      nodes.push({ id: lossLabel, displayName: `${lossLabel} (-$${absMargin.toLocaleString()})`, type: 'loss' });
      links.push({
        source: revenueLabel,
        target: lossLabel,
        value: absMargin
      });
    }

    // Handle empty data - need at least revenue node and one link
    if (links.length === 0) {
      return;
    }

    // Create Sankey generator
    const sankeyGenerator = d3Sankey.sankey<SankeyNodeData, SankeyLinkData>()
      .nodeId(d => d.id)
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator({
      nodes: nodes.map(d => ({ ...d })),
      links: links.map(d => ({ ...d }))
    });

    // Draw links with animation
    const linkGroup = svg.append('g').attr('class', 'links');

    linkGroup.selectAll('path')
      .data(sankeyLinks)
      .join('path')
      .attr('d', d3Sankey.sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => {
        const target = d.target as SankeyNodeWithPos;
        if (target.type === 'margin') return 'rgba(245, 158, 11, 0.4)';
        if (target.type === 'loss') return 'rgba(239, 68, 68, 0.4)';
        if (target.type === 'cost') return 'rgba(99, 102, 241, 0.4)';
        return 'rgba(16, 185, 129, 0.4)';
      })
      // Minimum width of 2px for visibility
      .attr('stroke-width', d => Math.max(2, d.width || 0))
      .attr('opacity', 0)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        const value = d.value?.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          const x = event.clientX - svgRect.left;
          const y = event.clientY - svgRect.top;
          setTooltip({ x, y: y - 10, text: value || '' });
        }
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mousemove', function(event) {
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (svgRect) {
          const x = event.clientX - svgRect.left;
          const y = event.clientY - svgRect.top;
          setTooltip(prev => prev ? { ...prev, x, y: y - 10 } : null);
        }
      })
      .on('mouseout', function() {
        setTooltip(null);
        d3.select(this).attr('opacity', 0.6);
      })
      .transition()
      .duration(800)
      .delay((_, i) => i * 50)
      .attr('opacity', 0.6);

    // Draw nodes
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    nodeGroup.selectAll('rect')
      .data(sankeyNodes)
      .join('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('height', d => Math.max(4, (d.y1 || 0) - (d.y0 || 0))) // Min height for visibility
      .attr('fill', d => colors[d.type] || colors.cost)
      .attr('rx', 4);

    // Draw labels with truncated names
    nodeGroup.selectAll('text')
      .data(sankeyNodes)
      .join('text')
      .attr('x', d => d.type === 'customer' ? (d.x0 || 0) - 6 : (d.x1 || 0) + 6)
      .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.type === 'customer' ? 'end' : 'start')
      .attr('fill', d => d.type === 'loss' ? '#EF4444' : '#94A3B8')
      .attr('font-size', '12px')
      .text(d => d.displayName);

    // ========================================
    // PARTICLE FLOW ANIMATION
    // ========================================
    function animateParticles() {
      // Get all link paths
      const paths = linkGroup.selectAll<SVGPathElement, typeof sankeyLinks[0]>('path').nodes();

      if (paths.length === 0) return () => {};

      // Create particle group
      const particleGroup = svg.append('g').attr('class', 'particles');

      // Particle state interface
      interface Particle {
        pathIndex: number;
        progress: number;
        speed: number;
        opacity: number;
      }

      const particles: Particle[] = [];

      // Calculate max value for scaling
      const maxValue = Math.max(...sankeyLinks.map(l => l.value || 0));

      // Initialize particles for each link
      paths.forEach((_, pathIndex) => {
        const linkData = sankeyLinks[pathIndex];
        const value = linkData.value || 0;

        // Scale particle count: 2-8 based on value proportion
        const particleCount = Math.max(2, Math.min(8, Math.round((value / maxValue) * 8)));

        // Create evenly spaced particles with staggered positions
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            pathIndex,
            progress: i / particleCount,
            speed: 0.002 + Math.random() * 0.001, // ~3-5 second travel time
            opacity: 0
          });
        }
      });

      // Create SVG circles for particles
      const particleElements = particleGroup.selectAll('circle')
        .data(particles)
        .join('circle')
        .attr('r', 3)
        .attr('fill', (d) => {
          const target = sankeyLinks[d.pathIndex].target as SankeyNodeWithPos;
          if (target.type === 'margin') return '#F59E0B';  // Gold
          if (target.type === 'loss') return '#EF4444';    // Red
          if (target.type === 'cost') return '#6366F1';    // Indigo
          return '#10B981';  // Emerald for inflows
        })
        .attr('opacity', 0);

      // Animation loop
      let animationId: number;
      let isRunning = true;

      function tick() {
        if (!isRunning) return;

        particles.forEach((p, i) => {
          // Update progress
          p.progress += p.speed;

          // Loop back when reaching end
          if (p.progress > 1) {
            p.progress = 0;
            p.opacity = 0;
          }

          // Fade in at start (0-10%), fade out at end (90-100%)
          if (p.progress < 0.1) {
            p.opacity = p.progress / 0.1;
          } else if (p.progress > 0.9) {
            p.opacity = (1 - p.progress) / 0.1;
          } else {
            p.opacity = 1;
          }

          // Get position along path
          const path = paths[p.pathIndex];
          if (path) {
            const totalLength = path.getTotalLength();
            const point = path.getPointAtLength(p.progress * totalLength);

            d3.select(particleElements.nodes()[i])
              .attr('cx', point.x)
              .attr('cy', point.y)
              .attr('opacity', p.opacity * 0.8);
          }
        });

        animationId = requestAnimationFrame(tick);
      }

      // Start animation after initial link animation completes
      const startTimeout = setTimeout(() => {
        tick();
      }, 1000);

      // Return cleanup function
      return () => {
        isRunning = false;
        clearTimeout(startTimeout);
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        particleGroup.remove();
      };
    }

    // Start particle animation and store cleanup
    cleanupRef.current = animateParticles();

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [data, t]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-slate-400">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
        <div className="text-center text-slate-400 py-12">
          <p>{error || t('analytics.loadError')}</p>
        </div>
      </div>
    );
  }

  // Check for data conditions
  const hasInflows = data.inflows.some(i => parseFloat(i.amount) > 0);
  const hasOutflows = data.outflows.some(o => parseFloat(o.amount) > 0);
  const hasData = hasInflows || hasOutflows;
  const showNoRevenueWarning = !hasInflows && hasOutflows;

  if (!hasData) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
        <h3 className="text-white font-semibold mb-4">{t('analytics.moneyFlow')}</h3>
        <div className="text-center text-slate-400 py-12">
          <p>{t('analytics.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 relative">
      {/* Header with title and toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">{t('analytics.moneyFlow')}</h3>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">{t('analytics.viewBy')}:</span>
          <div className="flex bg-slate-700/50 rounded-lg p-1">
            <button
              onClick={() => onGroupByChange('customer')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                groupBy === 'customer'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('analytics.customers')}
            </button>
            <button
              onClick={() => onGroupByChange('product')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                groupBy === 'product'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('analytics.products')}
            </button>
          </div>
        </div>
      </div>

      {/* Info banner when no revenue data */}
      {showNoRevenueWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-amber-400 text-sm flex items-center gap-2">
          <span>ℹ️</span>
          <span>{t('analytics.noRevenueData')}</span>
        </div>
      )}

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} width="100%" height="400" />
        {tooltip && (
          <div
            className="absolute bg-slate-700 text-white px-3 py-1 rounded text-sm pointer-events-none z-10 transform -translate-x-1/2"
            style={{ left: tooltip.x, top: tooltip.y - 30 }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Show margin value below if negative */}
      {parseFloat(data.margin) < 0 && (
        <div className="text-center mt-4">
          <span className="text-red-400 font-medium">
            {t('analytics.margin')}: -${Math.abs(parseFloat(data.margin)).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
