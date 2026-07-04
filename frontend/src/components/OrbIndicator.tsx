import { useRef, useEffect } from "react";
import { OrbState } from "../types";

interface OrbIndicatorProps {
  state: OrbState;
  size?: number;
}

const STATE_COLORS: Record<OrbState, string> = {
  [OrbState.Idle]: "#5DF7FF",
  [OrbState.Listening]: "#5DF7FF",
  [OrbState.Thinking]: "#4A8DFF",
  [OrbState.Researching]: "#5DF7FF",
  [OrbState.Executing]: "#5DF7FF",
  [OrbState.Collaborating]: "#B9BCC2",
  [OrbState.Learning]: "#A855F7",
  [OrbState.Completed]: "#22C55E",
  [OrbState.Error]: "#EF4444",
  [OrbState.Streaming]: "#5DF7FF",
};

export default function OrbIndicator({ state, size = 32 }: OrbIndicatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let animId: number;
    let time = 0;
    const color = STATE_COLORS[state] || "#5DF7FF";

    // Parse hex to RGB
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const rgb = hexToRgb(color);

    const isActive = state === OrbState.Executing || state === OrbState.Streaming || state === OrbState.Thinking;

    const render = () => {
      ctx.clearRect(0, 0, size, size);
      time += 0.03;

      const cx = size / 2;
      const cy = size / 2;
      const baseRadius = size * 0.38;

      // Outer glow
      const glowRadius = baseRadius * 1.6;
      const glow = ctx.createRadialGradient(cx, cy, baseRadius * 0.5, cx, cy, glowRadius);
      glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isActive ? 0.15 : 0.08})`);
      glow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      const ringRadius = baseRadius * 1.05;
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${isActive ? 0.35 : 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating arc (active state)
      if (isActive) {
        const arcStart = time * 2;
        const arcEnd = arcStart + Math.PI * 1.2;
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, arcStart, arcEnd);
        ctx.stroke();
      }

      // Core orb
      const pulse = isActive ? Math.sin(time * 3) * 1.5 + baseRadius * 0.7 : baseRadius * 0.65;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse);
      core.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`);
      core.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
      core.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
      ctx.fill();

      // Bright center dot
      ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.06, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [state, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="shrink-0"
    />
  );
}
