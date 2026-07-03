import React from "react";
import { motion } from "motion/react";
import { 
  MessageSquare, 
  Terminal, 
  Zap, 
  Database, 
  Sparkles, 
  ArrowRight, 
  FolderPlus,
  Play,
  Plus,
  Activity,
  Cpu,
  Layers,
  ShieldAlert
} from "lucide-react";
import { translations } from "../utils/translations";
import { OrbState } from "../types";
import Orb from "./Orb";

interface DashboardSectionProps {
  language: "en" | "fa";
  onNavigate: (view: any) => void;
  onNavigateToProject: (projectId: string) => void;
  onNavigateToChat: (chatId: string) => void;
  subjects: any[];
  projects: any[];
  orbState: OrbState;
}

export default function DashboardSection({ 
  language, 
  onNavigate, 
  onNavigateToProject,
  onNavigateToChat,
  subjects,
  projects,
  orbState
}: DashboardSectionProps) {
  const t = translations[language];

  // Filter recent personal chats
  const recentPersonalChats = subjects.filter(s => s.category === "personal").slice(0, 3);
  
  // Recent projects
  const recentProjects = projects.slice(0, 3);

  // Recent automations list (mocked based on templates/saved)
  const recentAutomations = [
    { title: "Inbox Zero Sweep", desc: "Scan email threads & compose responses", icon: Zap, iconColor: "text-red-400" },
    { title: "Meeting Synthesizer", desc: "Draft action items from transcripts", icon: Sparkles, iconColor: "text-purple-400" }
  ];

  // Recent memories (mocked based on MemorySystem nodes)
  const recentMemories = [
    { label: "Smart Contract Vulnerability", cat: "fact", details: "Identified staking overflow vulnerabilities prior to 0.8.20." },
    { label: "Low Latency C++ Ring Buffer", cat: "skill", details: "Atomic buffer optimized read/write pointer latency to < 1.8ns." },
    { label: "Solana Token Economics", cat: "fact", details: "Synthesized Liquid Staking curve curves." }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:px-8 select-none text-left relative overflow-hidden animate-fadeIn">
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-neural-cyan/4 rounded-full filter blur-[100px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-40 left-1/3 w-[300px] h-[300px] bg-electric-blue/3 rounded-full filter blur-[80px] pointer-events-none mix-blend-screen" />

      {/* 1. Futuristic Majestic Landing Hero with Massive Orb Centerpiece */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 md:p-8 bg-white/[0.01] border border-white/5 rounded-3xl mb-8 relative overflow-hidden backdrop-blur-xl">
        
        {/* Left/Center Area: Animated Orb Sphere */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-4 min-h-[220px]">
          {/* Circular Rings spinning around the Orb */}
          <div className="absolute w-[240px] h-[240px] rounded-full border border-dashed border-white/5 animate-spin" style={{ animationDuration: "100s" }} />
          <div className="absolute w-[270px] h-[270px] rounded-full border border-dotted border-neural-cyan/10 animate-spin" style={{ animationDuration: "140s", animationDirection: "reverse" }} />
          
          <div className="relative flex items-center justify-center bg-black/20 rounded-full p-4 border border-white/5 shadow-[0_0_50px_rgba(93,247,255,0.03)] mb-4">
            <Orb 
              state={orbState} 
              size={180} 
              onClick={() => onNavigate("Chat")}
            />
          </div>
        </div>

        {/* Right Area: Welcome text, descriptions & telemetry metrics */}
        <div className="lg:col-span-7 space-y-5 text-left z-10">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-titanium/80 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan animate-pulse" />
              {t.systemVersion}
            </span>
            <h2 className="text-2xl md:text-3xl font-display font-light text-white tracking-tight leading-none">
              {language === "fa" ? "به بستر شناختی MIMO خوش آمدید" : "Welcome to MIMO Cognitive OS"}
            </h2>
            <p className="text-xs md:text-sm text-titanium/60 leading-relaxed max-w-xl font-sans">
              {language === "fa" 
                ? "سیستم هم‌راستایی عامل‌ها، پایگاه داده‌های محلی، اتوماسیون‌های خط لوله و حافظه یکپارچه آماده بهره‌برداری است." 
                : "Your unified decentralized dashboard of autonomous conversational assistants, sandbox workspaces, automated pipeline tasks, and persistent neural memories."}
            </p>
          </div>

          {/* Core Telemetry Stats inside Hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
              <span className="text-[9px] font-mono text-titanium/40 uppercase">CPU LOAD</span>
              <span className="text-xs font-bold text-neural-cyan font-mono mt-1">2.4% IDLE</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
              <span className="text-[9px] font-mono text-titanium/40 uppercase">ACTIVE PLUGINS</span>
              <span className="text-xs font-bold text-white font-mono mt-1">7 Nodes</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
              <span className="text-[9px] font-mono text-titanium/40 uppercase">MEMORY SCHEMAS</span>
              <span className="text-xs font-bold text-purple-400 font-mono mt-1">142 Items</span>
            </div>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col">
              <span className="text-[9px] font-mono text-titanium/40 uppercase">SYNC STATUS</span>
              <span className="text-xs font-bold text-emerald-400 font-mono mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> SECURE
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Bento Grid of Command Center Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Box A: Recent Conversations (Personal) */}
        <div className="lg:col-span-6 p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={13} />
                {language === "fa" ? "گفتگوهای شخصی اخیر" : "Recent Personal Chats"}
              </h3>
              <button 
                onClick={() => onNavigate("Chat")}
                className="text-[10px] text-titanium/40 hover:text-white flex items-center gap-1 font-mono uppercase"
              >
                {language === "fa" ? "مشاهده همه" : "View All"} <ArrowRight size={10} />
              </button>
            </div>

            <div className="space-y-3">
              {recentPersonalChats.length === 0 ? (
                <div className="text-xs text-titanium/30 py-8 text-center">
                  No personal conversations yet. Start one in Assistant tab.
                </div>
              ) : (
                recentPersonalChats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => onNavigateToChat(chat.id)}
                    className="p-3 bg-white/[0.01] hover:bg-white/5 border border-white/3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="text-left max-w-[80%]">
                      <h4 className="text-xs font-semibold text-white/90 truncate">{chat.name}</h4>
                      <p className="text-[10px] text-titanium/45 font-mono mt-0.5 truncate">
                        {chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : "No messages yet"}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-titanium/30 shrink-0">{chat.date}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={() => onNavigate("Chat")}
            className="w-full mt-4 py-2 bg-neural-cyan/10 hover:bg-neural-cyan/20 border border-neural-cyan/25 rounded-xl text-xs font-semibold text-neural-cyan flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <Plus size={12} />
            {language === "fa" ? "شروع گفتگوی جدید" : "Start New Conversation"}
          </button>
        </div>

        {/* Box B: Recent Projects */}
        <div className="lg:col-span-6 p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider flex items-center gap-2">
                <Terminal size={13} />
                {language === "fa" ? "پروژه‌های اخیر" : "Recent Projects"}
              </h3>
              <button 
                onClick={() => onNavigate("Projects")}
                className="text-[10px] text-titanium/40 hover:text-white flex items-center gap-1 font-mono uppercase"
              >
                {language === "fa" ? "مشاهده همه" : "View All"} <ArrowRight size={10} />
              </button>
            </div>

            <div className="space-y-3">
              {recentProjects.map(proj => (
                <div 
                  key={proj.id}
                  onClick={() => onNavigateToProject(proj.id)}
                  className="p-3 bg-white/[0.01] hover:bg-white/5 border border-white/3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="text-left max-w-[70%]">
                    <h4 className="text-xs font-semibold text-white/90 truncate">{proj.name}</h4>
                    <span className="text-[9px] text-neural-cyan font-mono bg-neural-cyan/10 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                      {proj.documents.length} Files Linked
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-titanium/30 shrink-0">{proj.date}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => onNavigate("Projects")}
            className="w-full mt-4 py-2 bg-neural-cyan/10 hover:bg-neural-cyan/20 border border-neural-cyan/25 rounded-xl text-xs font-semibold text-neural-cyan flex items-center justify-center gap-1.5 transition-all cursor-pointer font-sans"
          >
            <FolderPlus size={12} />
            {language === "fa" ? "مدیریت پروژه‌ها" : "Open Projects Panel"}
          </button>
        </div>

        {/* Box C: Recent Automations */}
        <div className="lg:col-span-5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider flex items-center gap-2">
                <Zap size={13} />
                {language === "fa" ? "اتوماسیون‌های سریع" : "Quick Automations"}
              </h3>
              <button 
                onClick={() => onNavigate("Automations")}
                className="text-[10px] text-titanium/40 hover:text-white flex items-center gap-1 font-mono uppercase"
              >
                {language === "fa" ? "باز کردن مرکز" : "Open Center"} <ArrowRight size={10} />
              </button>
            </div>

            <div className="space-y-3">
              {recentAutomations.map((aut, idx) => {
                const IconComp = aut.icon;
                return (
                  <div 
                    key={idx}
                    className="p-3 bg-white/[0.01] border border-white/3 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 text-left max-w-[80%] min-w-0">
                      <span className={`w-8 h-8 rounded-lg bg-white/3 flex items-center justify-center shrink-0 ${aut.iconColor}`}>
                        <IconComp size={14} />
                      </span>
                      <div className="truncate">
                        <h4 className="text-xs font-semibold text-white/90 truncate">{aut.title}</h4>
                        <p className="text-[10px] text-titanium/50 truncate font-mono mt-0.5">{aut.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate("Automations")}
                      className="p-1.5 hover:bg-neural-cyan hover:text-black rounded-lg text-neural-cyan border border-neural-cyan/20 transition-all cursor-pointer"
                    >
                      <Play size={10} fill="currentColor" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-[9px] font-mono text-titanium/30 text-center pt-3 border-t border-white/5 mt-4">
            PRE-BUILT AUTOMATED ACTION SCRIPTS Ready
          </div>
        </div>

        {/* Box D: Recent Memories */}
        <div className="lg:col-span-7 p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col justify-between hover:border-white/10 transition-all">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-mono text-neural-cyan uppercase tracking-wider flex items-center gap-2">
                <Database size={13} />
                {language === "fa" ? "به‌روزرسانی‌های حافظه" : "Memory Insights Retained"}
              </h3>
              <button 
                onClick={() => onNavigate("Memory")}
                className="text-[10px] text-titanium/40 hover:text-white flex items-center gap-1 font-mono uppercase"
              >
                {language === "fa" ? "کاوش حافظه" : "Explore Memory"} <ArrowRight size={10} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentMemories.map((mem, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-white/[0.01] border border-white/3 rounded-xl text-left flex flex-col justify-between hover:bg-white/[0.03] transition-colors"
                >
                  <div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 uppercase tracking-wide">
                      {mem.cat}
                    </span>
                    <h4 className="text-xs font-semibold text-white mt-2 truncate">{mem.label}</h4>
                    <p className="text-[10px] text-titanium/50 font-mono line-clamp-2 mt-1 leading-relaxed">
                      {mem.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-mono text-titanium/30 text-center pt-3 border-t border-white/5 mt-4">
            MEMORIES SECURELY ENCRYPTED AND STORED LOCALLY
          </div>
        </div>

      </div>
    </div>
  );
}
