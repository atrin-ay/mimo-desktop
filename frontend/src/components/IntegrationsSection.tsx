import { useState } from "react";
import { motion } from "motion/react";
import { 
  Search, 
  CheckCircle, 
  ExternalLink, 
  Sparkles,
  Database,
  Slack,
  Github,
  Mail,
  Folder,
  Calendar as CalendarIcon,
  MessageCircle,
  BookOpen,
  Link,
  Check
} from "lucide-react";

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  icon: any; // React Lucide Component
  iconColor: string;
  category: "Productivity" | "Communications" | "Developer Tools" | "File Storage";
  connected: boolean;
  mcpCompliant: boolean;
  author: string;
}

export default function IntegrationsSection() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    { 
      id: "1", 
      name: "Gmail Integration", 
      description: "Read, search, draft and send secure emails. Perfect for automating inbox actions and triggering contextual responses.", 
      icon: Mail, 
      iconColor: "text-red-400",
      category: "Communications", 
      connected: true, 
      mcpCompliant: true, 
      author: "Google Cloud Ecosystem" 
    },
    { 
      id: "2", 
      name: "Google Drive Client", 
      description: "Secure semantic access to folders, documents, and spreadsheets. Synthesizes knowledge directly into active workspace sessions.", 
      icon: Folder, 
      iconColor: "text-amber-400",
      category: "File Storage", 
      connected: true, 
      mcpCompliant: true, 
      author: "Google Cloud Ecosystem" 
    },
    { 
      id: "3", 
      name: "GitHub Repository Hook", 
      description: "Indexes repositories, reviews pull requests, reads commit history, and tracks workspace code files securely.", 
      icon: Github, 
      iconColor: "text-purple-300",
      category: "Developer Tools", 
      connected: false, 
      mcpCompliant: true, 
      author: "GitHub Core API" 
    },
    { 
      id: "4", 
      name: "Slack Gateway", 
      description: "Enables direct dispatching of summaries, alerts, logs, and collaborative agent comments directly into target channels.", 
      icon: Slack, 
      iconColor: "text-emerald-400",
      category: "Communications", 
      connected: false, 
      mcpCompliant: true, 
      author: "Slack Webhooks" 
    },
    { 
      id: "5", 
      name: "Notion Workspace Connector", 
      description: "Synchronizes knowledge pages, databases, and structured journals into long-term system memories.", 
      icon: BookOpen, 
      iconColor: "text-gray-300",
      category: "Productivity", 
      connected: true, 
      mcpCompliant: true, 
      author: "Notion API Platform" 
    },
    { 
      id: "6", 
      name: "Discord Bot Bridge", 
      description: "Routes automated workspace task execution notifications and telemetry triggers into custom guild channels.", 
      icon: MessageCircle, 
      iconColor: "text-indigo-400",
      category: "Communications", 
      connected: false, 
      mcpCompliant: true, 
      author: "Discord Developers" 
    },
    { 
      id: "7", 
      name: "Google Calendar Sync", 
      description: "Coordinates meetings, tracks deadlines, reads calendar slots and schedules events automatically using natural language.", 
      icon: CalendarIcon, 
      iconColor: "text-blue-400",
      category: "Productivity", 
      connected: true, 
      mcpCompliant: true, 
      author: "Google Calendar Platform" 
    }
  ]);

  const categories = ["All", "Productivity", "Communications", "Developer Tools", "File Storage"];

  const handleConnect = (intId: string) => {
    setConnectingId(intId);

    // Simulate luxury pairing flow
    setTimeout(() => {
      setIntegrations(prev => prev.map(item => item.id === intId ? { ...item, connected: !item.connected } : item));
      setConnectingId(null);
    }, 1500);
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
            <Link className="text-neural-cyan" size={20} />
            Integrations
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            SECURE THIRD-PARTY ECOSYSTEM • SEMANTIC OAUTH PAIRING • REAL-TIME API SYNC
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full bg-[#111111]/80 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-neural-cyan/40 placeholder-titanium/30"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-titanium/40" size={13} />
        </div>
      </div>

      {/* Featured Integration Banner */}
      <div className="relative p-6 bg-gradient-to-br from-neural-cyan/10 via-transparent to-transparent rounded-2xl border border-white/5 overflow-hidden mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="text-[9px] font-mono bg-neural-cyan/20 text-neural-cyan px-2.5 py-0.5 rounded uppercase tracking-wider">
            FEATURED INTEGRATION
          </span>
          <h3 className="text-lg font-semibold text-white">
            Google Workspace (Drive & Gmail)
          </h3>
          <p className="text-xs text-titanium/60 leading-relaxed">
            Unleash full semantic search and context indexing across your emails and stored drive documents. Allow agents to reference files natively, draft weekly summaries, and sync calendars flawlessly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 border border-emerald-500/20 rounded-xl font-mono flex items-center gap-1.5">
            <Check size={12} /> Multi-Linked
          </span>
        </div>
      </div>

      {/* Categories select bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
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
        {filtered.map(item => {
          const IconComponent = item.icon;
          return (
            <div 
              key={item.id}
              className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-white/10 hover:bg-white/[0.03] transition-all duration-300"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`w-12 h-12 rounded-xl border border-white/5 bg-white/3 flex items-center justify-center ${item.iconColor}`}>
                    <IconComponent size={24} />
                  </span>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[8px] font-mono text-neural-cyan bg-neural-cyan/10 px-1.5 py-0.5 rounded">
                      ACTIVE APIS
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
                  <span>PROVIDER: {item.author}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/3 flex items-center justify-between">
                <span className="text-[10px] text-titanium/30 font-mono">ID: INT_0{item.id}</span>
                
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
                    <span>Link Account</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
