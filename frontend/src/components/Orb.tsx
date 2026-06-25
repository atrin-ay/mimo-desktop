import { useEffect, useRef, useState } from "react";
import { OrbState } from "../types";

interface OrbProps {
  state: OrbState;
  size?: number;
  onClick?: () => void;
}

export default function Orb({ state, size = 320, onClick }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = size * 2;
    let height = size * 2;
    canvas.width = width;
    canvas.height = height;

    // Particles system for advanced organic rendering
    interface Particle {
      x: number;
      y: number;
      z: number;
      ox: number;
      oy: number;
      oz: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      color: string;
      alpha: number;
      speed: number;
      angle: number;
    }

    const particles: Particle[] = [];
    const particleCount = 280;

    // Initialize particles in a 3D spherical shell
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const radius = size * 0.35 + Math.random() * 15;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      particles.push({
        x,
        y,
        z,
        ox: x,
        oy: y,
        oz: z,
        vx: 0,
        vy: 0,
        vz: 0,
        size: Math.random() * 2.2 + 0.8,
        color: "",
        alpha: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.02 + 0.01,
        angle: Math.random() * Math.PI * 2,
      });
    }

    // Configure parameters for each OrbState
    const getStateParams = (currentState: OrbState) => {
      switch (currentState) {
        case OrbState.Listening:
          return {
            color1: "rgba(93, 247, 255, 0.9)", // Neural Cyan
            color2: "rgba(74, 141, 255, 0.4)", // Electric Blue
            speed: 1.8,
            jitter: 8,
            gravity: 0,
            orbitRadius: size * 0.36,
            drawWeb: true,
            pulseFreq: 0.1,
          };
        case OrbState.Thinking:
          return {
            color1: "rgba(74, 141, 255, 0.95)",
            color2: "rgba(185, 188, 194, 0.3)",
            speed: 3.2,
            jitter: 3,
            gravity: 0.05,
            orbitRadius: size * 0.32,
            drawWeb: false,
            pulseFreq: 0.25,
          };
        case OrbState.Researching:
          return {
            color1: "rgba(93, 247, 255, 0.9)",
            color2: "rgba(5, 5, 5, 0)",
            speed: 1.4,
            jitter: 1,
            gravity: -0.04,
            orbitRadius: size * 0.35,
            drawWeb: true,
            pulseFreq: 0.05,
          };
        case OrbState.Executing:
          return {
            color1: "rgba(255, 93, 93, 0.95)", // Urgent vibrant red/coral for execution power
            color2: "rgba(93, 247, 255, 0.4)",
            speed: 4.5,
            jitter: 12,
            gravity: 0.1,
            orbitRadius: size * 0.3,
            drawWeb: false,
            pulseFreq: 0.4,
          };
        case OrbState.Collaborating:
          return {
            color1: "rgba(185, 188, 194, 0.95)", // Platinum Metal
            color2: "rgba(74, 141, 255, 0.5)",
            speed: 2.2,
            jitter: 5,
            gravity: 0,
            orbitRadius: size * 0.38,
            drawWeb: true,
            pulseFreq: 0.15,
          };
        case OrbState.Learning:
          return {
            color1: "rgba(168, 85, 247, 0.9)", // Rich Intelligence Violet
            color2: "rgba(93, 247, 255, 0.4)",
            speed: 2.5,
            jitter: 4,
            gravity: -0.15, // particles pull in
            orbitRadius: size * 0.34,
            drawWeb: true,
            pulseFreq: 0.2,
          };
        case OrbState.Completed:
          return {
            color1: "rgba(34, 197, 94, 0.95)", // Emerald green success flare
            color2: "rgba(185, 188, 194, 0.3)",
            speed: 1.2,
            jitter: 2,
            gravity: 0.02,
            orbitRadius: size * 0.35,
            drawWeb: false,
            pulseFreq: 0.04,
          };
        case OrbState.Idle:
        default:
          return {
            color1: "rgba(93, 247, 255, 0.75)", // Neural Cyan
            color2: "rgba(74, 141, 255, 0.25)", // Electric Blue
            speed: 0.8,
            jitter: 1.5,
            gravity: 0,
            orbitRadius: size * 0.35,
            drawWeb: false,
            pulseFreq: 0.02,
          };
      }
    };

    let rotationX = 0;
    let rotationY = 0;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      time += 0.01;
      const fadeColor = "rgba(5, 5, 5, 0)";
      const params = getStateParams(state);

      // Center coords
      const cx = width / 2;
      const cy = height / 2;

      // Mouse smoothing
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      // Rotational speeds
      rotationX += 0.003 * params.speed;
      rotationY += 0.005 * params.speed;

      // Draw premium multi-layered core ambient glows
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, params.orbitRadius * 2);
      glowGrad.addColorStop(0, params.color1.replace("0.95", "0.22").replace("0.9", "0.22").replace("0.75", "0.22"));
      glowGrad.addColorStop(0.35, params.color2.replace("0.4", "0.08").replace("0.25", "0.08").replace("0.3", "0.08"));
      glowGrad.addColorStop(1, fadeColor);

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, params.orbitRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Additional dynamic core light
      const pulseSize = (Math.sin(time * params.pulseFreq * Math.PI * 2) * 15 + params.orbitRadius * 0.45);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
      coreGrad.addColorStop(0, params.color1.replace("0.95", "0.7").replace("0.9", "0.7").replace("0.75", "0.7"));
      coreGrad.addColorStop(0.5, "rgba(74, 141, 255, 0.15)");
      coreGrad.addColorStop(1, fadeColor);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Project and draw particles
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);

      const projected: { px: number; py: number; pz: number; p: Particle }[] = [];

      particles.forEach((p) => {
        // Rotations
        let x1 = p.ox * cosY - p.oz * sinY;
        let z1 = p.ox * sinY + p.oz * cosY;
        let y2 = p.oy * cosX - z1 * sinX;
        let z2 = p.oy * sinX + z1 * cosX;

        // Apply dynamic oscillations/jitters based on state
        const wave = Math.sin(time * params.speed + p.angle) * params.jitter;
        const dist = Math.sqrt(x1 * x1 + y2 * y2 + z2 * z2);
        const scaleFactor = (params.orbitRadius + wave) / dist;

        let rx = x1 * scaleFactor;
        let ry = y2 * scaleFactor;
        let rz = z2 * scaleFactor;

        // Gravity or pull effect towards center (or pushing out)
        if (params.gravity !== 0) {
          const factor = 1 + params.gravity * 0.15 * Math.sin(time * 2 + p.angle);
          rx *= factor;
          ry *= factor;
          rz *= factor;
        }

        // Mouse magnetic distortion
        if (mouseRef.current.active) {
          const dx = rx - (mouseRef.current.x - cx);
          const dy = ry - (mouseRef.current.y - cy);
          const dSq = dx * dx + dy * dy;
          if (dSq < 16000) {
            const pull = (1 - Math.sqrt(dSq) / 130) * 22;
            rx += (dx / Math.sqrt(dSq)) * pull;
            ry += (dy / Math.sqrt(dSq)) * pull;
          }
        }

        // Camera perspective projection
        const cameraDistance = size * 1.8;
        const perspective = cameraDistance / (cameraDistance + rz);
        const px = cx + rx * perspective;
        const py = cy + ry * perspective;

        projected.push({ px, py, pz: rz, p });
      });

      // Sort by Z index for visual rendering depth
      projected.sort((a, b) => b.pz - a.pz);

      // Web connections (constellations) for scientific, high-fidelity complexity
      if (params.drawWeb) {
        ctx.strokeStyle = params.color1.replace("0.95", "0.08").replace("0.9", "0.08").replace("0.75", "0.08");
        ctx.lineWidth = 0.6;
        for (let i = 0; i < projected.length; i += 6) {
          for (let j = i + 1; j < Math.min(i + 4, projected.length); j++) {
            const pt1 = projected[i];
            const pt2 = projected[j];
            const distSq = Math.pow(pt1.px - pt2.px, 2) + Math.pow(pt1.py - pt2.py, 2);
            if (distSq < 2200) {
              ctx.beginPath();
              ctx.moveTo(pt1.px, pt1.py);
              ctx.lineTo(pt2.px, pt2.py);
              ctx.stroke();
            }
          }
        }
      }

      // Draw particle nodes
      projected.forEach(({ px, py, pz, p }) => {
        const pSize = p.size * (size * 1.5 / (size * 1.5 + pz));
        const alpha = Math.max(0.15, p.alpha * (size * 1.2 / (size * 1.2 + pz)));

        // Core colors blending beautifully
        const depthGrad = ctx.createRadialGradient(px, py, 0, px, py, pSize * 2.5);
        depthGrad.addColorStop(0, params.color1.replace(/[\d.]+\)$/, `${alpha})`));
        depthGrad.addColorStop(1, fadeColor);

        ctx.fillStyle = depthGrad;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // High brightness center core of the node
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw beautiful orbital concentric HUD rings (highly detailed, high-end dashboard feel)
      if (state === OrbState.Researching || state === OrbState.Thinking) {
        ctx.strokeStyle = "rgba(93, 247, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 12]);
        ctx.beginPath();
        ctx.arc(cx, cy, params.orbitRadius * 1.45, time * 0.5, time * 0.5 + Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(74, 141, 255, 0.09)";
        ctx.setLineDash([45, 180]);
        ctx.beginPath();
        ctx.arc(cx, cy, params.orbitRadius * 1.6, -time * 0.3, -time * 0.3 + Math.PI * 2);
        ctx.stroke();

        ctx.setLineDash([]); // reset
      }

      // Special Listening waveforms (soundwave reflections)
      if (state === OrbState.Listening) {
        // 3 layers of ultra-smooth, flowing morphing circles with distinct colors and phase offsets
        const layers = [
          { color: "rgba(93, 247, 255, 0.45)", speed: 5, freq: 3, amp: 4, scale: 1.25 },
          { color: "rgba(74, 141, 255, 0.35)", speed: -3.8, freq: 4, amp: 3, scale: 1.15 },
          { color: "rgba(165, 243, 252, 0.25)", speed: 2.2, freq: 2, amp: 5, scale: 1.3 }
        ];

        layers.forEach((layer) => {
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let angle = 0; angle <= Math.PI * 2 + 0.1; angle += 0.05) {
            // Smooth morphing factor
            const morph = Math.sin(angle * layer.freq + time * layer.speed) * layer.amp;
            const r = params.orbitRadius * layer.scale + morph;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (angle === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.stroke();
        });
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    // Mouse handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (width / rect.width);
      const y = (e.clientY - rect.top) * (height / rect.height);
      mouseRef.current.targetX = x;
      mouseRef.current.targetY = y;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = width / 2;
      mouseRef.current.targetY = height / 2;
      mouseRef.current.active = false;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [state, size]);

  return (
    <div 
      className="relative flex items-center justify-center cursor-pointer select-none"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: size, height: size }}
    >
      {/* Pristine high-contrast backing sphere to make the neon orb pop gloriously in both dark & light modes */}
      <div 
        className="mimo-orb-backing-sphere absolute rounded-full transition-all duration-700 pointer-events-none"
        style={{ 
          width: size * 0.85, 
          height: size * 0.85,
        }}
      />

      {/* Background visual depth blur */}
      <div 
        className="absolute w-5/6 h-5/6 rounded-full opacity-35 filter blur-3xl transition-colors duration-1000"
        style={{
          background: 
            state === OrbState.Idle ? "radial-gradient(circle, rgba(93,247,255,0.2) 0%, rgba(74,141,255,0) 70%)" :
            state === OrbState.Listening ? "radial-gradient(circle, rgba(93,247,255,0.3) 0%, rgba(74,141,255,0.05) 70%)" :
            state === OrbState.Thinking ? "radial-gradient(circle, rgba(74,141,255,0.3) 0%, rgba(185,188,194,0.05) 70%)" :
            state === OrbState.Executing ? "radial-gradient(circle, rgba(255,93,93,0.3) 0%, rgba(93,247,255,0.05) 70%)" :
            state === OrbState.Collaborating ? "radial-gradient(circle, rgba(185,188,194,0.25) 0%, rgba(74,141,255,0.05) 70%)" :
            state === OrbState.Learning ? "radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(93,247,255,0.05) 70%)" :
            state === OrbState.Completed ? "radial-gradient(circle, rgba(34,197,94,0.3) 0%, rgba(185,188,194,0.05) 70%)" :
            "radial-gradient(circle, rgba(93,247,255,0.2) 0%, rgba(74,141,255,0) 70%)"
        }}
      />

      {/* Floating orbital HUD element */}
      <div 
        className={`absolute rounded-full border border-white/5 transition-all duration-700 pointer-events-none ${
          hovered ? "scale-110 opacity-70 border-neural-cyan/25" : "scale-100 opacity-30"
        }`}
        style={{ width: size * 0.95, height: size * 0.95 }}
      />
      <div 
        className={`absolute rounded-full border border-white/3 transition-all duration-1000 pointer-events-none ${
          hovered ? "scale-95 opacity-50 rotate-90 border-electric-blue/15" : "scale-100 opacity-20"
        }`}
        style={{ width: size * 1.12, height: size * 1.12 }}
      />

      {/* Actual HTML5 canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10 block transition-transform duration-500 hover:scale-[1.03]"
        id="mimo-canvas-orb"
      />

      {/* Small floating HUD status label */}
      {size >= 150 && (
        <div 
          id="mimo-orb-chip"
          className="floating-status-chip absolute -bottom-8 z-20 px-3 py-1 bg-black/85 border border-white/10 rounded-full text-[10px] font-mono tracking-widest text-white uppercase backdrop-blur-md pointer-events-none whitespace-nowrap left-1/2 -translate-x-1/2 shadow-lg"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" 
            style={{
              backgroundColor: 
                state === OrbState.Idle ? "#5DF7FF" :
                state === OrbState.Listening ? "#5DF7FF" :
                state === OrbState.Thinking ? "#4A8DFF" :
                state === OrbState.Executing ? "#FF5D5D" :
                state === OrbState.Collaborating ? "#B9BCC2" :
                state === OrbState.Learning ? "#A855F7" :
                state === OrbState.Completed ? "#22C55E" : "#5DF7FF"
            }}
          />
          {state}
        </div>
      )}
    </div>
  );
}
