import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ArrowRight, 
  Download, 
  CheckCircle, 
  Search, 
  Cpu, 
  Star, 
  ShieldCheck, 
  Grid,
  Code,
  Zap,
  Bookmark,
  Share2,
  BookmarkCheck
} from "lucide-react";
import { Skill } from "../types";

export default function SkillsStore() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([
    {
      id: "1",
      name: "Algorithmic Arbitrage Engine",
      description: "Autonomous flash loan arbitrage locator across DEX liquidity pools. Secure gas calculation pipelines natively compiled.",
      icon: "📈",
      category: "Automation",
      installed: false,
      downloads: "142 K",
      developer: "MiMo Core Developers"
    },
    {
      id: "2",
      name: "Rust-WASM Multi-thread Transpiler",
      description: "Direct code generation pipelines transforming standard functional modules into concurrent Rust compiled WebAssembly threads.",
      icon: "⚙️",
      category: "Development",
      installed: true,
      downloads: "84 K",
      developer: "Apex Core Foundation"
    },
    {
      id: "3",
      name: "Decentralized Auth Synthesizer",
      description: "Fast generation of bulletproof zero-knowledge proof authentication bindings. Integrates with standard ERC-4337 wrappers.",
      icon: "🔐",
      category: "Development",
      installed: false,
      downloads: "61 K",
      developer: "Cipher Cryptographic Lab"
    },
    {
      id: "4",
      name: "Autonomous Voice Synthesizer",
      description: "High fidelity voice asset generation matching precise emotional pitches, acoustics, and tone modulation in real-time.",
      icon: "🎙️",
      category: "Creative",
      installed: false,
      downloads: "192 K",
      developer: "Acoustic AI Lab"
    },
    {
      id: "5",
      name: "Predictive Telemetry Analyst",
      description: "Inspect multi-threaded network packets and memory leak paths. Auto-optimize compiler registry layout parameters.",
      icon: "📊",
      category: "Data Science",
      installed: true,
      downloads: "120 K",
      developer: "Scribe Analytics Foundation"
    },
    {
      id: "6",
      name: "Contextual Memory Distiller",
      description: "Parse and distill massive amounts of chat/code history into clean hierarchical JSON facts for persistent storage mapping.",
      icon: "🧠",
      category: "Utilities",
      installed: false,
      downloads: "210 K",
      developer: "MiMo Cognitive Foundation"
    }
  ]);

  const categories = ["All", "Utilities", "Data Science", "Automation", "Creative", "Development"];

  const handleInstall = (skillId: string) => {
    setInstallingId(skillId);

    // Simulate luxury installing sequence
    setTimeout(() => {
      setSkills(prev => prev.map(s => s.id === skillId ? { ...s, installed: true } : s));
      setInstallingId(null);
    }, 2200);
  };

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = activeCategory === "All" || skill.category === activeCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Header segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Star className="text-neural-cyan" size={20} />
            Cognitive Skills App Store
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            EXTEND MIMO KERNEL • COMPILED BINARY PACKS • MULTI-THREAD PIPELINES
          </p>
        </div>

        {/* Filter input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cognitive skill packs..."
            className="w-full bg-[#111111]/80 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-neural-cyan/40"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-titanium/40" size={13} />
        </div>
      </div>

      {/* Recommended pick header banner */}
      <div className="relative p-6 md:p-8 bg-gradient-to-r from-neural-cyan/15 to-transparent rounded-2xl border border-neural-cyan/20 overflow-hidden mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[350px] h-[350px] bg-neural-cyan/5 rounded-full filter blur-[70px] pointer-events-none" />
        
        <div className="space-y-2 max-w-xl z-10">
          <span className="text-[9px] font-mono bg-neural-cyan/20 text-neural-cyan px-2.5 py-0.5 rounded uppercase tracking-wider">
            RECOMMENDED FOR CURRENT WORKSPACE
          </span>
          <h3 className="text-lg md:text-xl font-semibold text-white">
            Algorithmic Arbitrage Engine v2.4.0
          </h3>
          <p className="text-xs text-titanium/60 leading-relaxed">
            Deploy autonomous flash loan modules safely across 12 DEX aggregators concurrently. Backtested against $140M historical telemetry points with zero slippage hazards.
          </p>
        </div>

        <div className="z-10 flex gap-3">
          <button 
            onClick={() => handleInstall("1")}
            disabled={installingId === "1" || skills[0]?.installed}
            className={`px-5 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              skills[0]?.installed 
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-neural-cyan hover:bg-white text-black shadow-lg shadow-neural-cyan/15 cursor-pointer"
            }`}
          >
            {installingId === "1" ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping" />
                Compiling...
              </span>
            ) : skills[0]?.installed ? (
              <span className="flex items-center gap-1"><CheckCircle size={13} /> Installed</span>
            ) : (
              <span className="flex items-center gap-1"><Download size={13} /> Install Skill</span>
            )}
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-sans transition-all duration-200 border whitespace-nowrap cursor-pointer ${
              activeCategory === cat 
                ? "bg-white/5 border-neural-cyan/35 text-neural-cyan" 
                : "bg-[#111111]/45 border-white/5 text-titanium/45 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of skill cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSkills.map(skill => (
          <div 
            key={skill.id}
            className="p-5 liquid-glass rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-3xl bg-white/3 w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center">
                  {skill.icon}
                </span>

                <span className="text-[9px] font-mono text-titanium/40 uppercase bg-white/5 px-2 py-0.5 rounded">
                  {skill.category}
                </span>
              </div>

              <h4 className="text-sm font-semibold text-white/95 mt-4 line-clamp-1">
                {skill.name}
              </h4>
              <p className="text-xs text-titanium/55 mt-2 leading-relaxed min-h-[50px] line-clamp-3">
                {skill.description}
              </p>

              <div className="mt-4 pt-3 border-t border-white/3 flex items-center justify-between text-[10px] font-mono text-titanium/40">
                <span>DEV: {skill.developer}</span>
                <span>{skill.downloads} downloads</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/3 flex items-center justify-between">
              <span className="text-[10px] text-titanium/30 font-mono">ID: SKILL_0{skill.id}</span>
              
              <button
                onClick={() => handleInstall(skill.id)}
                disabled={installingId === skill.id || skill.installed}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  skill.installed
                    ? "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                    : "bg-white/5 hover:bg-neural-cyan hover:text-black text-white cursor-pointer"
                }`}
              >
                {installingId === skill.id ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping mr-1" /> Installing
                  </span>
                ) : skill.installed ? (
                  <span className="flex items-center gap-1"><CheckCircle size={11} /> Installed</span>
                ) : (
                  <span className="flex items-center gap-1"><Download size={11} /> Install</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
