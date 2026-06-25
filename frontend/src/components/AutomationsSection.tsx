import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Play, 
  Settings2, 
  Save, 
  Send, 
  Trash2, 
  Inbox, 
  FolderMinus, 
  Calendar, 
  TrendingUp, 
  Search, 
  BookOpen, 
  Check, 
  AlertCircle 
} from "lucide-react";

interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  icon: any; // Lucide icon
  iconColor: string;
  prompt: string;
  category: "Files" | "Productivity" | "Organization" | "Research";
}

interface SavedAutomation {
  id: string;
  title: string;
  prompt: string;
  lastRun: string;
  status: "idle" | "running" | "success" | "error";
}

export default function AutomationsSection() {
  const [promptInput, setPromptInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  const [savedAutomations, setSavedAutomations] = useState<SavedAutomation[]>([
    { id: "sa-1", title: "Meeting Summarizer Routine", prompt: "Extract action items, summaries, and milestones from uploaded meeting transcript files.", lastRun: "2 hours ago", status: "success" },
    { id: "sa-2", title: "Weekly Planning Sync", prompt: "Analyze calendar deadlines, file updates, and chat milestones to build a prioritized task roadmap.", lastRun: "Yesterday", status: "idle" }
  ]);

  const templates: AutomationTemplate[] = [
    {
      id: "tmpl-inbox",
      title: "Inbox Zero",
      description: "Automatically filter, categorize, and archive unneeded emails while drafting responses to high-priority items.",
      icon: Inbox,
      iconColor: "text-red-400",
      prompt: "Execute Inbox Zero action. Analyze recent Gmail threads, archive spam, flag urgent issues, and prepare email response drafts for important clients.",
      category: "Productivity"
    },
    {
      id: "tmpl-cleanup",
      title: "Desktop & Downloads Cleanup",
      description: "Analyze, group, and archive random download files into designated subdirectories based on semantic types.",
      icon: FolderMinus,
      iconColor: "text-amber-400",
      prompt: "Scan downloads and desktop path catalogs. Group images by theme, package scripts by extension, and archive document spreadsheets into folder structures.",
      category: "Files"
    },
    {
      id: "tmpl-planner",
      title: "Weekly Planner",
      description: "Aggregate current file changes, calendar schedules, and personal goals to generate a beautifully structured weekly planner.",
      icon: Calendar,
      iconColor: "text-blue-400",
      prompt: "Analyze calendar appointments, active code workspace repositories, and memory facts. Draft a prioritized weekly roadmap with structured goals.",
      category: "Productivity"
    },
    {
      id: "tmpl-expense",
      title: "Expense Analysis",
      description: "Extract line-item expenses from recent CSV reports or financial files to compile categorized spending matrices.",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      prompt: "Parse recent financial statement tables and spreadsheets. Map expense items, flag outlier spending, and compile structured visual categories.",
      category: "Organization"
    },
    {
      id: "tmpl-research",
      title: "Research Assistant",
      description: "Crawl web archives, gather reference citations, and synthesize highly comprehensive briefs on arbitrary search fields.",
      icon: Search,
      iconColor: "text-cyan-400",
      prompt: "Deploy Research Agent. Search the deep web for high-fidelity sources, extract references, list conflicting viewpoints, and synthesize a brief.",
      category: "Research"
    },
    {
      id: "tmpl-notes",
      title: "Meeting Notes Transcriber",
      description: "Digest raw meeting transcripts to summarize key themes, note speaker targets, and output clear action roadmaps.",
      icon: BookOpen,
      iconColor: "text-purple-400",
      prompt: "Digest the raw meeting transcripts. Extract high-level speaker targets, compile semantic themes, and draft clear individual action roadmaps.",
      category: "Research"
    }
  ];

  const handleSelectTemplate = (tmpl: AutomationTemplate) => {
    setSelectedTemplate(tmpl.id);
    setPromptInput(tmpl.prompt);
  };

  const handleAction = (type: "run" | "save" | "customize") => {
    if (!promptInput.trim()) return;

    if (type === "run") {
      setIsRunning(true);
      setRunLog(["[SYSTEM] Initializing automation engine...", "[AGENT] Connecting API endpoints..."]);
      
      const logs = [
        "[AGENT] Mapping file explorer references...",
        "[AGENT] Fetching external Google Drive parameters...",
        "[SYSTEM] Compiling logic constraints...",
        "[AGENT] Successfully executed task sequence!",
        "[SUCCESS] Automation routine completed."
      ];

      logs.forEach((log, index) => {
        setTimeout(() => {
          setRunLog(prev => [...prev, log]);
          if (index === logs.length - 1) {
            setIsRunning(false);
          }
        }, (index + 1) * 800);
      });
    } else if (type === "save") {
      const newAutomation: SavedAutomation = {
        id: `sa-${Date.now()}`,
        title: promptInput.split(".")[0].slice(0, 28) + "...",
        prompt: promptInput,
        lastRun: "Never",
        status: "idle"
      };
      setSavedAutomations(prev => [newAutomation, ...prev]);
      alert("Automation saved successfully!");
    } else if (type === "customize") {
      alert("Customizing prompt structure inside prompt builder. Feel free to edit the text box!");
    }
  };

  const handleDeleteSaved = (id: string) => {
    setSavedAutomations(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
            <Zap className="text-neural-cyan animate-pulse" size={20} />
            Automations Center
          </h2>
          <p className="text-xs text-titanium/50 font-mono mt-0.5">
            CONVERSATIONAL AUTOMATION TRIGGERS • ZERO PROMPT TEMPLATES • COGNITIVE SCHEDULER
          </p>
        </div>
      </div>

      {/* 1. Prompt/Goal Input Form at Top */}
      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-xl mb-8">
        <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider mb-3">
          Request Automated Task or Agent Action
        </h3>
        
        <div className="flex flex-col gap-4">
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Type your automated action parameter, or select a pre-built template below (e.g. 'Synthesize weekly inbox summary and write spreadsheet report')..."
            className="w-full bg-[#121212]/80 border border-white/10 rounded-xl py-3 px-4 text-xs text-white placeholder-titanium/30 focus:outline-none focus:border-neural-cyan/35 min-h-[90px] leading-relaxed resize-y font-sans"
          />

          <div className="flex flex-wrap justify-between items-center gap-3">
            <span className="text-[10px] text-titanium/40 font-mono">
              {promptInput.length} CHARS • AUTOPILOT CORE SYNCED
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction("customize")}
                disabled={!promptInput.trim()}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-titanium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Settings2 size={13} />
                Customize
              </button>
              <button
                type="button"
                onClick={() => handleAction("save")}
                disabled={!promptInput.trim()}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-titanium flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Save size={13} />
                Save Automation
              </button>
              <button
                type="button"
                onClick={() => handleAction("run")}
                disabled={!promptInput.trim() || isRunning}
                className="px-4 py-1.5 bg-neural-cyan text-black hover:bg-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
              >
                <Play size={12} fill="currentColor" />
                {isRunning ? "Running..." : "Run Once"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Horizontal Carousel of Pre-built Templates */}
      <div className="mb-8">
        <h4 className="text-xs font-mono text-titanium/50 uppercase tracking-wider mb-4">
          Pre-built Automation Templates
        </h4>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {templates.map(tmpl => {
            const IconComp = tmpl.icon;
            const active = selectedTemplate === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={`flex-shrink-0 w-72 p-5 bg-white/[0.02] border rounded-2xl flex flex-col justify-between transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:border-white/10 hover:bg-white/[0.03] ${
                  active ? "border-neural-cyan/40 bg-neural-cyan/[0.02]" : "border-white/5"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`w-10 h-10 rounded-xl border border-white/5 bg-white/3 flex items-center justify-center ${tmpl.iconColor}`}>
                      <IconComp size={18} />
                    </span>
                    <span className="text-[8px] font-mono text-titanium/45 uppercase bg-white/5 px-2 py-0.5 rounded-md">
                      {tmpl.category}
                    </span>
                  </div>

                  <h5 className="text-sm font-semibold text-white/95 mt-4">
                    {tmpl.title}
                  </h5>
                  <p className="text-xs text-titanium/55 mt-2 leading-relaxed line-clamp-3 min-h-[50px]">
                    {tmpl.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-neural-cyan font-mono flex items-center gap-1">
                  <span>Click to Load Prompt</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Splitted Logs and Saved Automations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Run Console output */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-black/40 border border-white/5 rounded-2xl overflow-hidden min-h-[250px]">
          <div className="p-3 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
            <span className="text-[10px] font-mono text-titanium/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neural-cyan animate-pulse" />
              LIVE AUTOMATION CONSOLE LOG
            </span>
          </div>

          <div className="flex-1 p-4 font-mono text-[11px] text-titanium/70 leading-relaxed overflow-y-auto max-h-[280px]">
            {runLog.length === 0 ? (
              <div className="h-full flex items-center justify-center text-titanium/30 text-center py-10">
                Awaiting automation trigger... Logs will stream here.
              </div>
            ) : (
              <div className="space-y-1 text-left">
                {runLog.map((log, idx) => (
                  <div key={idx} className={log.includes("[SUCCESS]") ? "text-neural-cyan font-bold" : log.includes("[SYSTEM]") ? "text-purple-400" : ""}>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved Automations list */}
        <div className="lg:col-span-5 flex flex-col p-5 bg-white/[0.02] border border-white/5 rounded-2xl justify-between">
          <div>
            <h4 className="text-xs font-mono text-neural-cyan uppercase tracking-wider mb-1">
              Your Custom Automations
            </h4>
            <p className="text-[11px] text-titanium/40 font-sans">
              Locally saved automated sequences.
            </p>

            <div className="space-y-3 mt-4">
              {savedAutomations.map(sa => (
                <div key={sa.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-1 text-left max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white/95 truncate">{sa.title}</span>
                      <span className="text-[8px] font-mono text-titanium/40 uppercase bg-white/5 px-1.5 rounded">
                        {sa.lastRun}
                      </span>
                    </div>
                    <p className="text-[10px] text-titanium/50 truncate font-mono">
                      {sa.prompt}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setPromptInput(sa.prompt);
                        setSelectedTemplate(null);
                      }}
                      className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-titanium/75 hover:text-white transition-colors cursor-pointer"
                      title="Load"
                    >
                      <Settings2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(sa.id)}
                      className="p-1.5 bg-white/5 hover:bg-red-500/10 rounded-lg text-titanium/40 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-mono text-titanium/30 text-center pt-4 border-t border-white/5 mt-4">
            MIMO COMPUTES FLOW SEQUENCES SECURELY
          </div>
        </div>

      </div>
    </div>
  );
}
