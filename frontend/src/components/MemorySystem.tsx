import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  GitFork, 
  Cpu, 
  Activity, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Calendar,
  Layers,
  Sparkles,
  Workflow,
  Search,
  BookOpen
} from "lucide-react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  size: number;
  category: "fact" | "skill" | "agent" | "session";
  details: string;
  timestamp: string;
}

export default function MemorySystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const mouseRef = useRef({ x: 0, y: 0 });

  const initialNodes: Node[] = [
    { id: "1", label: "Smart Contract Vulnerability Matrix", x: 180, y: 150, size: 8, category: "fact", details: "Identified standard ERC-20 staking overflow vulnerabilities on Solidity compilers prior to 0.8.20. Created automatic mitigation structures.", timestamp: "12 mins ago" },
    { id: "2", label: "Low Latency C++ Ring Buffer", x: 380, y: 120, size: 9, category: "skill", details: "Generated atomic ring buffer bound to core CPU cache L3. Optimized read/write pointer latency to < 1.8ns.", timestamp: "2 hours ago" },
    { id: "3", label: "Solana Token Economics", x: 250, y: 320, size: 7, category: "fact", details: "Synthesized deflationary vesting curves matching modern liquid staking wrappers. Simulated run rate validation against market depth of $5M.", timestamp: "1 day ago" },
    { id: "4", label: "Agent Coordination Consensus Protocol", x: 550, y: 220, size: 10, category: "agent", details: "Established secure multi-agent communication protocol based on isolated TLS Handshakes and cryptographically signed command strings.", timestamp: "3 days ago" },
    { id: "5", label: "Project Aurora Telemetry Sandbox", x: 620, y: 340, size: 8, category: "session", details: "Constructed isolated Docker containers running compiled WebAssembly tasks. Enabled strict memory sandboxing.", timestamp: "Yesterday" },
    { id: "6", label: "WASM Multi-threading bindings", x: 110, y: 280, size: 6, category: "skill", details: "Distilled multi-threaded WebAssembly parallel structures with shared array buffers.", timestamp: "4 days ago" }
  ];

  const [nodes, setNodes] = useState<Node[]>(initialNodes);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = canvas.parentElement?.clientWidth || 750;
    let height = 450;
    canvas.width = width;
    canvas.height = height;

    let time = 0;

    const render = () => {
      const isLight = document.querySelector(".light") !== null;
      ctx.clearRect(0, 0, width, height);
      time += 0.005;

      // Draw subtle tech backdrop grids
      ctx.strokeStyle = isLight ? "rgba(15, 23, 42, 0.04)" : "rgba(255, 255, 255, 0.015)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw glowing background network arcs
      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.08)" : "rgba(93, 247, 255, 0.035)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 160 + Math.sin(time) * 10, 0, Math.PI * 2);
      ctx.stroke();

      // Draw connections between nodes
      ctx.strokeStyle = isLight ? "rgba(2, 132, 199, 0.2)" : "rgba(93, 247, 255, 0.09)";
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          // Connect nodes that are closer or have conceptual links
          const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
          if (dist < 260) {
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();

            // Draw glowing travel dot along connection representing data flow
            const progress = (time * 1.5 + (i * 0.2)) % 1;
            const travelX = n1.x + (n2.x - n1.x) * progress;
            const travelY = n1.y + (n2.y - n1.y) * progress;
            
            ctx.fillStyle = isLight ? "rgba(2, 132, 199, 0.9)" : "rgba(93, 247, 255, 0.8)";
            ctx.beginPath();
            ctx.arc(travelX, travelY, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Nodes
      nodes.forEach((node) => {
        const selected = selectedNode?.id === node.id;
        const hoverDist = Math.sqrt(Math.pow(node.x - mouseRef.current.x, 2) + Math.pow(node.y - mouseRef.current.y, 2));
        const isHovered = hoverDist < node.size + 8;

        // Pulsing outer orbit glow
        const glow = Math.sin(time * 5 + parseInt(node.id)) * 3 + 8;
        ctx.fillStyle = 
          node.category === "fact" ? (isLight ? "rgba(2, 132, 199, 0.12)" : "rgba(93, 247, 255, 0.1)") :
          node.category === "skill" ? "rgba(168, 85, 247, 0.12)" :
          node.category === "agent" ? "rgba(236, 72, 153, 0.12)" :
          (isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(185, 188, 194, 0.1)");

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + (isHovered || selected ? glow + 4 : glow), 0, Math.PI * 2);
        ctx.fill();

        // Node fill color
        ctx.fillStyle = 
          node.category === "fact" ? (isLight ? "#0284c7" : "#5DF7FF") :
          node.category === "skill" ? "#A855F7" :
          node.category === "agent" ? "#EC4899" :
          (isLight ? "#475569" : "#B9BCC2");

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size + (isHovered ? 2 : 0), 0, Math.PI * 2);
        ctx.fill();

        // High brightness core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Label text
        ctx.fillStyle = isHovered || selected 
          ? (isLight ? "#0f172a" : "#FFFFFF") 
          : (isLight ? "rgba(15, 23, 42, 0.65)" : "rgba(255, 255, 255, 0.55)");
        ctx.font = "10px var(--font-mono)";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y - node.size - 10);
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    // Mouse handlers on canvas
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      let clickedNode: Node | null = null;
      nodes.forEach((node) => {
        const dist = Math.sqrt(Math.pow(node.x - clickX, 2) + Math.pow(node.y - clickY, 2));
        if (dist < node.size + 15) {
          clickedNode = node;
        }
      });

      setSelectedNode(clickedNode);
    };

    const handleCanvasMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
    };
  }, [nodes, selectedNode]);

  const learnedInsights = [
    { title: "Continuous Synaptic Indexing", desc: "Successfully aligned 1,420 unprompted memory points across user code sessions to map structural software frameworks natively.", timestamp: "Just now" },
    { title: "Defensive Code Verification Patterns", desc: "Learned that the user prefers paranoid boundary checks. Saved rule: 'Always write explicit integer overflow protections in smart contracts'." , timestamp: "4 hours ago" },
    { title: "Solana Rent Exemption Formulas", desc: "Acquired full mathematical model for rent calculation. Applied during recent vesting wrapper construction." , timestamp: "Yesterday" }
  ];

  const filteredNodes = nodes.filter(node => 
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    node.details.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Database className="text-neural-cyan animate-pulse" size={20} />
            Autonomous Memory System
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            DYNAMIC SYNAPSE ENGINE • FACT ACQUISITION FEED • COGNITIVE TIMELINE
          </p>
        </div>

        {/* Filter input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Query memory graph index..."
            className="w-full bg-[#111111]/80 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-neural-cyan/40"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-titanium/40" size={13} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Interactive Neural memory graph */}
        <div className="lg:col-span-8 flex flex-col justify-between liquid-glass rounded-2xl border border-white/5 overflow-hidden min-h-[480px]">
          <div className="p-4 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs font-mono text-titanium/60">
              <GitFork size={14} className="text-neural-cyan" />
              <span>INTERACTIVE MEMORY PLOTTER (NEURO-GRAPH)</span>
            </div>
            <div className="flex gap-4 text-[9px] font-mono">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-neural-cyan" /> Fact Node</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#A855F7]" /> Acquired Skill</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]" /> Agent Sync</span>
            </div>
          </div>

          <div className="flex-1 relative bg-black/10">
            <canvas ref={canvasRef} className="block w-full" id="memory-canvas-node-network" />
            
            <div className="absolute bottom-4 left-4 p-3 bg-black/60 border border-white/5 rounded-xl backdrop-blur-md max-w-sm pointer-events-none">
              <div className="text-[10px] font-mono text-titanium/40">INTERACTION TIP</div>
              <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">
                Click on any pulsing neural core to parse and extract specific cognitive facts, parameters, and saved context attributes.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Node Details Card or Insights Panel */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-6">
          
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-5 liquid-glass rounded-2xl border border-neural-cyan/15 bg-gradient-to-b from-neural-cyan/5 to-transparent flex-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: 
                          selectedNode.category === "fact" ? "rgba(93, 247, 255, 0.1)" :
                          selectedNode.category === "skill" ? "rgba(168, 85, 247, 0.1)" :
                          "rgba(236, 72, 153, 0.1)",
                        color:
                          selectedNode.category === "fact" ? "#5DF7FF" :
                          selectedNode.category === "skill" ? "#A855F7" :
                          "#EC4899"
                      }}
                    >
                      {selectedNode.category} Memory
                    </span>
                    <span className="text-[10px] font-mono text-titanium/40">{selectedNode.timestamp}</span>
                  </div>

                  <h3 className="text-base font-display font-semibold text-white mt-3 leading-snug">
                    {selectedNode.label}
                  </h3>

                  <div className="text-xs text-titanium/70 font-mono mt-4 leading-relaxed bg-[#050505]/60 p-4 border border-white/5 rounded-xl">
                    {selectedNode.details}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-titanium/40">INDEXED_ADDR: MD5_0x{selectedNode.id}9F...</span>
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="text-xs text-neural-cyan hover:text-white transition-colors"
                  >
                    Clear Focus
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="p-5 liquid-glass rounded-2xl border border-white/5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} />
                    Unprompted Acquired Insights
                  </h3>
                  <p className="text-[11px] text-titanium/50 font-sans mt-0.5">
                    Self-retained knowledge synthesized silently during ambient runtimes.
                  </p>

                  <div className="space-y-3 mt-4">
                    {learnedInsights.map((insight, idx) => (
                      <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.04] transition-colors">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-white/95 line-clamp-1">{insight.title}</span>
                          <span className="text-[9px] font-mono text-titanium/30 truncate ml-2">{insight.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-titanium/50 mt-1 leading-relaxed">
                          {insight.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] font-mono text-titanium/30 text-center pt-4 border-t border-white/5">
                  MIMO RE-INDEXES NEURO-LINKS AUTOMATICALLY EACH TERM
                </div>
              </div>
            )}
          </AnimatePresence>
          
        </div>

      </div>
    </div>
  );
}
