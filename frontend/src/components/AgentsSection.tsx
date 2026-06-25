import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Cpu, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Flame, 
  MessageSquareCode, 
  Send,
  Zap,
  RefreshCw,
  Lock,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Agent } from "../types";

export default function AgentsSection() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Cipher-9",
      role: "Cryptographic & Security Lead",
      avatar: "🔒",
      status: "executing",
      activity: "Analyzing vesting contracts on solidity-0.8.25 layers",
      progress: 74,
      confidence: 99.1,
      skills: ["Cryptanalysis", "Vulnerability Discovery", "EVM Auditing", "Enclave Isolation"]
    },
    {
      id: "2",
      name: "Apex-System",
      role: "WASM & Low-Latency Compiler",
      avatar: "⚡",
      status: "thinking",
      activity: "Compiling cache-aligned ring buffer models in WASM-threads",
      progress: 32,
      confidence: 98.6,
      skills: ["Memory Orchestration", "Rust/WASM Core", "Cache Alignment", "Kernel Bindings"]
    },
    {
      id: "3",
      name: "Chronos-Logic",
      role: "Goal Execution & Sequence Orchestrator",
      avatar: "🌀",
      status: "idle",
      activity: "Awaiting task execution pipeline sequences",
      progress: 100,
      confidence: 94.2,
      skills: ["Multi-Agent Synchronization", "Linear Programming", "Temporal Synthesis"]
    },
    {
      id: "4",
      name: "Scribe-Context",
      role: "Knowledge Distillation Engine",
      avatar: "📚",
      status: "learning",
      activity: "Synthesizing cross-session memory nodes & insights",
      progress: 48,
      confidence: 97.4,
      skills: ["Semantic Chunking", "Topic Extraction", "Knowledge Graph Plotting"]
    }
  ]);

  const [activeFeeds, setActiveFeeds] = useState<{ agent: string; text: string; time: string }[]>([
    { agent: "Cipher-9", text: "Located overflow hazard in reentrancy logic. Synthesizing re-entrant guards on compile pipeline.", time: "1 min ago" },
    { agent: "Apex-System", text: "Completed structural analysis of memory layout. Optimized boundary registers.", time: "3 mins ago" },
    { agent: "Scribe-Context", text: "Successfully distilled user session. Added Solana vesting facts to neuro-memory.", time: "10 mins ago" }
  ]);

  const triggerAgentAction = (agentId: string) => {
    setAgents(prev => prev.map(a => {
      if (a.id === agentId) {
        return {
          ...a,
          status: "thinking",
          progress: 12,
          activity: "Initiating live parallel cognitive review..."
        };
      }
      return a;
    }));

    setTimeout(() => {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            status: "executing",
            progress: 58,
            activity: "Securing virtual memory allocation boundaries..."
          };
        }
        return a;
      }));
    }, 1500);

    setTimeout(() => {
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return {
            ...a,
            status: "idle",
            progress: 100,
            activity: "Completed task safely in isolated sandbox memory."
          };
        }
        return a;
      }));
    }, 3200);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Upper Navigation Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Users className="text-neural-cyan" size={20} />
            Autonomous Elite Team
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            16 ADVANCED AGENT CORES • ASYNC THREAD COLLABORATION • SANDBOX SECURED
          </p>
        </div>

        <button 
          onClick={() => {
            // Trigger a quick refresh animation
          }}
          className="px-4 py-2 bg-white/3 hover:bg-white/5 border border-white/5 text-xs text-titanium/80 rounded-xl flex items-center gap-2 transition-colors"
        >
          <RefreshCw size={12} className="animate-spin" style={{ animationDuration: "12s" }} />
          Re-align Agent Synapses
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Column: Grid of Agent Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                selectedAgent?.id === agent.id 
                  ? "bg-gradient-to-br from-neural-cyan/10 to-transparent border-neural-cyan/35 shadow-[0_0_25px_rgba(93,247,255,0.05)]" 
                  : "liquid-glass border-white/5 hover:border-white/12"
              }`}
            >
              <div>
                {/* Upper line */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-xl shadow-inner">
                      {agent.avatar}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white/95">{agent.name}</h3>
                      <p className="text-[10px] text-titanium/45 font-mono truncate max-w-[160px]">{agent.role}</p>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded flex items-center gap-1.5"
                    style={{
                      backgroundColor: 
                        agent.status === "executing" ? "rgba(255, 93, 93, 0.1)" :
                        agent.status === "thinking" ? "rgba(74, 141, 255, 0.1)" :
                        agent.status === "learning" ? "rgba(168, 85, 247, 0.1)" :
                        "rgba(185, 188, 194, 0.1)",
                      color:
                        agent.status === "executing" ? "#FF5D5D" :
                        agent.status === "thinking" ? "#4A8DFF" :
                        agent.status === "learning" ? "#A855F7" :
                        "#B9BCC2"
                    }}
                  >
                    <span className="w-1 h-1 rounded-full animate-ping" 
                      style={{
                        backgroundColor: 
                          agent.status === "executing" ? "#FF5D5D" :
                          agent.status === "thinking" ? "#4A8DFF" :
                          agent.status === "learning" ? "#A855F7" :
                          "#B9BCC2"
                      }}
                    />
                    {agent.status}
                  </span>
                </div>

                {/* Agent dynamic activity text */}
                <div className="mt-4 p-3 bg-[#050505]/40 border border-white/3 rounded-xl min-h-[46px] flex items-center">
                  <p className="text-xs text-titanium/70 leading-relaxed font-sans line-clamp-2">
                    {agent.activity}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-titanium/45">THREAD PROGRESSION</span>
                    <span className="text-white font-medium">{agent.progress}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-neural-cyan h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${agent.progress}%`,
                        backgroundColor: 
                          agent.status === "executing" ? "#FF5D5D" :
                          agent.status === "thinking" ? "#4A8DFF" :
                          agent.status === "learning" ? "#A855F7" :
                          "#5DF7FF"
                      }} 
                    />
                  </div>
                </div>
              </div>

              {/* Skill chips & inspect button */}
              <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex gap-1.5 overflow-hidden max-w-[160px]">
                  {agent.skills.slice(0, 2).map((sk, idx) => (
                    <span key={idx} className="text-[8px] font-mono bg-white/3 text-titanium/55 px-1.5 py-0.5 rounded truncate">
                      {sk}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => triggerAgentAction(agent.id)}
                    className="px-2.5 py-1 bg-white/5 hover:bg-neural-cyan hover:text-black transition-all rounded-lg text-[10px] font-semibold text-white cursor-pointer"
                  >
                    Simulate Core
                  </button>
                  <button
                    onClick={() => setSelectedAgent(agent)}
                    className="px-2 py-1 bg-white/3 hover:bg-white/10 text-titanium/70 hover:text-white transition-all rounded-lg text-[10px] font-mono"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Detailed Inspector / Live Stream Feed */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-6">
          
          {/* Inspector Panel */}
          <div className="p-5 liquid-glass rounded-2xl border border-white/5 flex-1 flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {selectedAgent ? (
                <motion.div
                  key={selectedAgent.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <span className="text-xs font-semibold text-white">AGENT INTEL REPORT</span>
                    <button 
                      onClick={() => setSelectedAgent(null)}
                      className="text-[10px] text-neural-cyan hover:underline"
                    >
                      Close Report
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-3xl bg-white/5 w-12 h-12 rounded-xl flex items-center justify-center border border-white/5">
                      {selectedAgent.avatar}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedAgent.name}</h4>
                      <p className="text-[11px] text-titanium/45 font-mono">{selectedAgent.role}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#050505]/60 border border-white/5 rounded-xl space-y-2 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-titanium/40">JUDGE EVALUATION:</span>
                      <span className="text-emerald-400 font-semibold">VALIDATED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-titanium/40">COGNITIVE INDEX:</span>
                      <span className="text-white">{selectedAgent.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-titanium/40">MEMORY ADDRESS:</span>
                      <span className="text-white">CORE_CORE_0{selectedAgent.id}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-[10px] font-mono tracking-widest text-neural-cyan uppercase mb-1.5">FULL CAPABILITIES MATRIX:</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAgent.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="text-[10px] font-mono bg-white/5 text-titanium/70 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="pb-3 border-b border-white/5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-neural-cyan" />
                    <span className="text-xs font-semibold text-white">LIVE AGENT TELEMETRY FEED</span>
                  </div>

                  <div className="space-y-3">
                    {activeFeeds.map((feed, fIdx) => (
                      <div key={fIdx} className="p-3 bg-white/[0.015] border border-white/3 rounded-xl">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-neural-cyan font-bold">{feed.agent}</span>
                          <span className="text-titanium/30">{feed.time}</span>
                        </div>
                        <p className="text-xs text-titanium/55 mt-1 leading-relaxed">
                          {feed.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-gradient-to-r from-neural-cyan/5 to-transparent border border-neural-cyan/10 rounded-xl text-left">
                    <p className="text-[10px] font-mono text-neural-cyan uppercase tracking-wider">COLLABORATION LEVEL</p>
                    <p className="text-[11px] text-titanium/50 mt-0.5 leading-relaxed">
                      Cores are coordinating parallel task trees securely. Multi-agent consensus integrity is verified at 99.98%.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>

            <div className="text-[9px] font-mono text-titanium/30 text-center pt-4 border-t border-white/5">
              ALL TASKS OPERATED UNDER CRITICAL PRIVACY SANDBOXES
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
