import { useState } from "react";
import { motion } from "motion/react";
import { 
  Compass, 
  Search, 
  CheckCircle, 
  Layers, 
  ExternalLink, 
  Workflow, 
  Sparkles,
  Database,
  Slack,
  Github,
  GitBranch,
  BookOpen,
  Settings,
  Link,
  Cpu
} from "lucide-react";
import { Integration } from "../types";

export default function McpMarketplace() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: "1", name: "GitHub Repository Hook", description: "Enables MiMo agents to read code schemas, commit artifacts directly, and create pull request validations in isolated threads.", icon: "🐙", category: "Hosting", connected: true, mcpCompliant: true, author: "MiMo Core Developers" },
    { id: "2", name: "Slack Communications Gateway", description: "Enables direct automated channel dispatching and telemetry warnings compiled on local agent servers.", icon: "💬", category: "Messaging", connected: false, mcpCompliant: true, author: "MiMo Core Developers" },
    { id: "3", name: "Notion Knowledge Workspace", description: "Allows full semantic memory reading and automated documentation synthesis across team workspaces.", icon: "📓", category: "Productivity", connected: true, mcpCompliant: true, author: "Notion Foundation" },
    { id: "4", name: "Supabase Relational Core", description: "Secure real-time read and write access to Postgres database instances with automated secure schema generation.", icon: "⚡", category: "Databases", connected: false, mcpCompliant: true, author: "Supabase Community" },
    { id: "5", name: "Stripe Billing Infrastructure", description: "Allows cognitive triggers to compile invoice schemas and secure payment transaction pathways securely.", icon: "💳", category: "Analytics", connected: false, mcpCompliant: true, author: "Stripe Developers" },
    { id: "6", name: "Linear Engineering Sequence", description: "Create autonomous task sequences and sync completion progress directly with team backlog cycles.", icon: "📐", category: "Productivity", connected: false, mcpCompliant: true, author: "Linear Core Team" },
    { id: "7", name: "PostgreSQL Database Vector Adapter", description: "Direct vector search integration to fetch long-term semantic embeddings in real-time.", icon: "🐘", category: "Databases", connected: false, mcpCompliant: true, author: "Postgres Community" },
    { id: "8", name: "Redis Real-Time Cache Hub", description: "Superfast memory-mapped task cache with cluster failover orchestration.", icon: "🔴", category: "Databases", connected: false, mcpCompliant: true, author: "Redis Labs" }
  ]);

  const categories = ["All", "Databases", "Messaging", "Productivity", "Hosting", "Analytics"];

  const handleConnect = (intId: string) => {
    setConnectingId(intId);

    // Simulate luxury pairing flow
    setTimeout(() => {
      setIntegrations(prev => prev.map(item => item.id === intId ? { ...item, connected: !item.connected } : item));
      setConnectingId(null);
    }, 1800);
  };

  const filtered = integrations.filter(item => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Compass className="text-neural-cyan animate-spin" size={20} style={{ animationDuration: "35s" }} />
            Model Context Protocol (MCP) Marketplace
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            STANDARDIZED INTEGRATION SCHEMAS • SECURE OAUTH PAIRING • REAL-TIME DATA WRITING
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full bg-[#111111]/80 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-neural-cyan/40"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-titanium/40" size={13} />
        </div>
      </div>

      {/* Featured Integration Banner */}
      <div className="relative p-6 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl border border-white/5 overflow-hidden mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="text-[9px] font-mono bg-purple-500/20 text-purple-400 px-2.5 py-0.5 rounded uppercase tracking-wider">
            FEATURED INTEGRATION (MCP VERIFIED)
          </span>
          <h3 className="text-lg font-semibold text-white">
            GitHub Repository Hook
          </h3>
          <p className="text-xs text-titanium/60 leading-relaxed">
            Read files, index repository trees, review pull requests with multi-agent consensus, and commit functional code directly from inside isolated sandboxed virtual runtimes.
          </p>
        </div>

        <button 
          onClick={() => handleConnect("1")}
          disabled={connectingId === "1"}
          className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            integrations[0]?.connected 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" 
              : "bg-purple-500 text-white hover:bg-white hover:text-black shadow-lg shadow-purple-500/15"
          }`}
        >
          {connectingId === "1" ? "Pairing..." : integrations[0]?.connected ? "Connected" : "Connect GitHub"}
        </button>
      </div>

      {/* Categories select bar */}
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

      {/* Main Grid list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div 
            key={item.id}
            className="p-5 liquid-glass rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-colors"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-3xl bg-white/3 w-12 h-12 rounded-xl border border-white/5 flex items-center justify-center">
                  {item.icon}
                </span>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-[8px] font-mono text-neural-cyan bg-neural-cyan/10 px-1.5 py-0.5 rounded">
                    MCP COMPLIANT
                  </span>
                  <span className="text-[8px] font-mono text-titanium/40 uppercase">
                    {item.category}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-white/95 mt-4 line-clamp-1">
                {item.name}
              </h4>
              <p className="text-xs text-titanium/55 mt-2 leading-relaxed min-h-[50px] line-clamp-3">
                {item.description}
              </p>

              <div className="mt-4 pt-3 border-t border-white/3 flex items-center justify-between text-[10px] font-mono text-titanium/40">
                <span>AUTHOR: {item.author}</span>
                <span className="flex items-center gap-1">
                  <Link size={10} /> Active Connection
                </span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/3 flex items-center justify-between">
              <span className="text-[10px] text-titanium/30 font-mono">ID: MCP_0{item.id}</span>
              
              <button
                onClick={() => handleConnect(item.id)}
                disabled={connectingId === item.id}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  item.connected
                    ? "bg-emerald-500/10 border border-emerald-500/15 text-emerald-400"
                    : "bg-white/5 hover:bg-neural-cyan hover:text-black text-white cursor-pointer"
                }`}
              >
                {connectingId === item.id ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping mr-1" /> Linking
                  </span>
                ) : item.connected ? (
                  <span className="flex items-center gap-1"><CheckCircle size={11} /> Linked</span>
                ) : (
                  <span>Link Connection</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
