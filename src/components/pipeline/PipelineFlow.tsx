import { useEffect, useRef } from 'react';

interface PipelineFlowProps {
  stageCount: number;
}

export function PipelineFlow({ stageCount }: PipelineFlowProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 40 * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Particle system
    interface Particle {
      x: number;
      speed: number;
      opacity: number;
    }

    const particles: Particle[] = [];
    const particleCount = 20;
    const canvasWidth = canvas.getBoundingClientRect().width;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvasWidth,
        speed: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    // Color stops for gradient (slate -> emerald -> indigo -> amber)
    const colorStops = [
      { pos: 0, color: [148, 163, 184] },     // slate-400
      { pos: 0.33, color: [16, 185, 129] },   // emerald-500
      { pos: 0.66, color: [99, 102, 241] },   // indigo-500
      { pos: 1, color: [245, 158, 11] },      // amber-500
    ];

    // Interpolate color based on position
    const getColor = (progress: number, opacity: number): string => {
      let startStop = colorStops[0];
      let endStop = colorStops[colorStops.length - 1];

      for (let i = 0; i < colorStops.length - 1; i++) {
        if (progress >= colorStops[i].pos && progress <= colorStops[i + 1].pos) {
          startStop = colorStops[i];
          endStop = colorStops[i + 1];
          break;
        }
      }

      const segmentProgress = (progress - startStop.pos) / (endStop.pos - startStop.pos);
      const r = Math.round(startStop.color[0] + (endStop.color[0] - startStop.color[0]) * segmentProgress);
      const g = Math.round(startStop.color[1] + (endStop.color[1] - startStop.color[1]) * segmentProgress);
      const b = Math.round(startStop.color[2] + (endStop.color[2] - startStop.color[2]) * segmentProgress);

      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    // Animation loop
    let animationId: number;
    const animate = () => {
      const width = canvas.getBoundingClientRect().width;
      const height = 40;

      ctx.clearRect(0, 0, width, height);

      // Draw base line with gradient
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(148, 163, 184, 0.3)');
      gradient.addColorStop(0.33, 'rgba(16, 185, 129, 0.3)');
      gradient.addColorStop(0.66, 'rgba(99, 102, 241, 0.3)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0.3)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(20, 20);
      ctx.lineTo(width - 20, 20);
      ctx.stroke();

      // Draw and update particles
      particles.forEach((p) => {
        const progress = p.x / width;
        const color = getColor(progress, p.opacity);

        // Draw particle with glow effect
        ctx.beginPath();
        ctx.arc(p.x, 20, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Glow effect
        ctx.beginPath();
        ctx.arc(p.x, 20, 8, 0, Math.PI * 2);
        ctx.fillStyle = getColor(progress, p.opacity * 0.3);
        ctx.fill();

        // Move particle
        p.x += p.speed;
        if (p.x > width) {
          p.x = 0;
          p.opacity = 0.3 + Math.random() * 0.5;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative h-10 my-6">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
      />

      {/* Stage markers */}
      <div className="absolute inset-0 flex justify-between px-8 items-center pointer-events-none">
        {Array.from({ length: stageCount }).map((_, i) => {
          const colors = ['bg-slate-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-amber-500'];
          return (
            <div
              key={i}
              className={`w-4 h-4 rounded-full ${colors[i]} border-2 border-slate-800 shadow-lg`}
            />
          );
        })}
      </div>
    </div>
  );
}
