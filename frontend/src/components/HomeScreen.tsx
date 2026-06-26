import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  ArrowRight, 
  Clock, 
  Cpu, 
  Layers, 
  Activity,
  Terminal,
  ChevronRight,
  MessageSquare,
  Plus,
  RefreshCw,
  User
} from "lucide-react";
import { OrbState, ActiveView, Goal, InteractionMode, Message } from "../types";
import { translations } from "../utils/translations";
import Orb from "./Orb";

interface HomeScreenProps {
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  onNavigate: (view: ActiveView) => void;
  onTriggerAction: (prompt: string) => void;
  activeGoals: Goal[];
  language: "en" | "fa";
  setLanguage: (lang: "en" | "fa") => void;
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;
  messages: Message[];
}

export default function HomeScreen({ 
  orbState, 
  setOrbState, 
  onNavigate, 
  onTriggerAction,
  activeGoals,
  language,
  setLanguage,
  interactionMode,
  setInteractionMode,
  messages
}: HomeScreenProps) {
  const [prompt, setPrompt] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = translations[language];

  // If there are user or agent messages, chat has active dialogue
  const chatStarted = messages.length > 0;

  useEffect(() => {
    if (chatStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatStarted]);

  const suggestions = [
    {
      title: t.suggestDeepLearningTitle,
      desc: t.suggestDeepLearningDesc,
      tag: t.suggestDeepLearningTag,
      prompt: "Synthesize a neural network architecture with self-optimizing layers and zero-latency inference pathways."
    },
    {
      title: t.suggestSecOpsTitle,
      desc: t.suggestSecOpsDesc,
      tag: t.suggestSecOpsTag,
      prompt: "Perform an advanced cryptographic audit on our standard ERC-20 staking contract to locate security leaks."
    },
    {
      title: t.suggestAgenticTitle,
      desc: t.suggestAgenticDesc,
      tag: t.suggestAgenticTag,
      prompt: "Distill a multi-agent workflow to automate our dev-to-deployment testing loops using Docker."
    },
    {
      title: t.suggestCoreDevTitle,
      desc: t.suggestCoreDevDesc,
      tag: t.suggestCoreDevTag,
      prompt: "Generate low-latency memory-mapped file bindings in C++ with custom ring buffers."
    }
  ];

  const recentSessions = [
    { name: t.recentProjectChronos, date: language === "fa" ? "۶ دقیقه پیش" : "6 mins ago", status: language === "fa" ? "فعال" : "Active" },
    { name: t.recentSecRollup, date: language === "fa" ? "۲ ساعت پیش" : "2 hours ago", status: language === "fa" ? "کامل شده" : "Completed" },
    { name: t.recentAssetOrchestrator, date: language === "fa" ? "دیروز" : "Yesterday", status: language === "fa" ? "ذخیره شده" : "Saved" }
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    onTriggerAction(prompt);
    setPrompt("");
  };

  const toggleVoiceListen = () => {
    if (isListening) {
      setOrbState(OrbState.Idle);
      setIsListening(false);
    } else {
      setOrbState(OrbState.Listening);
      setIsListening(true);
      setPrompt(language === "fa" ? "در حال شنود پارامترهای ورودی صوتی..." : "Listening to acoustic input parameters...");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Sleek, glowing CSS animated circle representing our AI Character
  const AnimatedCircleAvatar = () => (
    <div className="relative w-6 h-6 rounded-full flex items-center justify-center bg-[#5DF7FF]/10 border border-[#5DF7FF]/35 shadow-[0_0_12px_rgba(93,247,255,0.4)] overflow-hidden shrink-0">
      <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-r from-neural-cyan to-electric-blue animate-ping opacity-60 absolute" />
      <div className="w-2 h-2 rounded-full bg-neural-cyan shadow-[0_0_8px_rgba(93,247,255,1)] relative z-10" />
    </div>
  );

  // Status mapping for the small orb loading indicator
  const getOrbStatusText = () => {
    if (orbState === OrbState.Thinking) return language === "fa" ? "در حال تفکر عصبی..." : "Neural Thinking...";
    if (orbState === OrbState.Researching) return language === "fa" ? "در حال کاوش عمیق وب..." : "Deep Researching...";
    if (orbState === OrbState.Executing) return language === "fa" ? "در حال سنتز فایل‌ها..." : "Synthesizing Assets...";
    if (orbState === OrbState.Listening) return language === "fa" ? "در حال شنود صوتی..." : "Acoustic Listening...";
    return language === "fa" ? "بستر شناختی آماده" : "Substrate Active";
  };

  return (
    <div className="relative min-h-[90vh] flex flex-col justify-between px-4 py-6 md:px-12 select-none overflow-hidden">
      {/* Absolute Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-neural-cyan/4 rounded-full filter blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-electric-blue/4 rounded-full filter blur-[100px] pointer-events-none mix-blend-screen" />

      {chatStarted ? (
        /* --- ACTIVE CHAT STATE (Transformative Cloud-like Layout) --- */
        <div className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-between z-10 mt-2">
          
          {/* Header of current chat thread with small Orb loading symbol */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between mb-4 backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <div className="relative flex items-center justify-center bg-black/40 rounded-full w-14 h-14 border border-white/10 shadow-[0_0_15px_rgba(93,247,255,0.05)] overflow-hidden shrink-0">
                <Orb 
                  state={orbState} 
                  size={65} 
                  onClick={() => {}}
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-mono tracking-widest text-neural-cyan uppercase">MIMO COGNITIVE CORE</span>
                <span className="text-sm font-semibold text-white/90 font-sans mt-0.5">{getOrbStatusText()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate(ActiveView.Workspace)}
                className="text-xs text-titanium/60 hover:text-white px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all font-sans cursor-pointer flex items-center gap-1.5"
              >
                <Terminal size={12} />
                <span>{t.viewWorkspaceLink}</span>
              </button>
            </div>
          </div>

          {/* Scrolling Cloud-like Message Stream */}
          <div className="flex-1 min-h-[40vh] max-h-[50vh] overflow-y-auto px-1 py-4 space-y-5 scrollbar-thin select-text">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isSystem = msg.sender === "system";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center my-2.5">
                    <div className="px-3.5 py-1.5 bg-white/3 border border-white/5 rounded-full text-[10px] font-mono text-titanium/50 tracking-wider backdrop-blur-md flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan animate-pulse" />
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className={`flex gap-3 ${isUser ? "ml-auto flex-row-reverse text-right w-fit max-w-[65%]" : "text-left w-full max-w-[80%]"}`}
                >
                  {/* AI profile avatar is our animated/pulsing circle instead of standard Bot profile */}
                  {isUser ? (
                    <div className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center bg-white/5 shrink-0 text-xs text-titanium/40 mt-1">
                      <User size={12} />
                    </div>
                  ) : (
                    <div className="mt-1">
                      <AnimatedCircleAvatar />
                    </div>
                  )}

                  <div className="flex-1 flex flex-col">
                    {/* Sender Metadata Bubble */}
                    <div className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <span className="text-[9px] font-mono text-neural-cyan bg-neural-cyan/15 px-2 py-0.5 rounded-md uppercase border border-neural-cyan/10">
                          {msg.agentName || "Agent Elite"}
                        </span>
                      )}
                      <span className="text-[8px] font-mono text-titanium/40">{msg.timestamp}</span>
                    </div>

                    {/* Cloud Speech Bubble */}
                    <div
                      className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed shadow-xl border transition-all ${
                        isUser
                          ? "bg-neural-cyan/[0.08] border-neural-cyan/25 text-white rounded-tr-none shadow-[0_4px_15px_rgba(93,247,255,0.04)] w-fit max-w-full break-words"
                          : "bg-white/[0.03] border-white/10 text-white/90 rounded-tl-none shadow-[0_4px_15px_rgba(255,255,255,0.01)] backdrop-blur-md whitespace-pre-line"
                      }`}
                    >
                      {msg.text}
                      
                      {!isUser && msg.tokensPerSec && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-titanium/45">
                          <span className="flex items-center gap-1">
                            <RefreshCw size={9} className="animate-spin text-neural-cyan/50" />
                            COG_SPEED: {msg.tokensPerSec} tok/s
                          </span>
                          <span className="text-emerald-400 font-semibold">{t.cognitiveEngineReady}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {/* Thinking simulated loader when orb is busy */}
            {(orbState === OrbState.Thinking || orbState === OrbState.Researching || orbState === OrbState.Executing) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-start w-full"
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[9px] font-mono text-neural-cyan bg-neural-cyan/10 px-2 py-0.5 rounded uppercase">
                    {getOrbStatusText()}
                  </span>
                </div>
                <div className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl rounded-tl-none max-w-[200px] flex items-center gap-3 shadow-inner">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-neural-cyan/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

        </div>
      ) : (
        /* --- MAJESTIC LANDING STATE (New Chat / Empty State) --- */
        <div className="flex-1 w-full flex flex-col justify-between z-10">
          
          {/* Header Hero Section */}
          <div className="w-full max-w-4xl text-center mx-auto mt-2">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/3 border border-white/5 rounded-full text-xs text-titanium/80 tracking-wider backdrop-blur-md mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-neural-cyan animate-pulse" />
              {t.systemVersion}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.1, ease: "easeOut" }}
              className="text-4xl md:text-6xl font-display font-light tracking-tight mb-3 text-luxury"
              id="home-title-heading"
            >
              {t.whatAreWeBuilding}<span className="font-semibold text-accent-gradient font-heading tracking-tighter">{t.whatAreWeBuildingHighlight}</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="text-sm md:text-base text-titanium/60 max-w-xl mx-auto font-sans"
            >
              {t.substrateDesc}
            </motion.p>
          </div>

          {/* Central Orbit Area with Massive AI Orb */}
          <div className="relative w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 my-8 mx-auto z-20">
            
            {/* Floating Session Objects (Left) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden md:flex flex-col gap-4 w-64 text-left"
            >
              <div className="text-[10px] font-mono tracking-widest text-titanium/40 uppercase mb-1">
                {t.activeModules}
              </div>
              
              {recentSessions.map((session, idx) => (
                <div
                  key={idx}
                  className="group relative px-4 py-3.5 liquid-glass hover:bg-white/[0.05] rounded-xl border border-white/5 hover:border-neural-cyan/20 transition-all duration-300 cursor-pointer"
                  onClick={() => onNavigate(ActiveView.Workspace)}
                >
                  <div className="absolute right-3 top-3 w-1.5 h-1.5 rounded-full" 
                    style={{
                      backgroundColor: session.status === "Active" || session.status === "فعال" ? "#5DF7FF" : session.status === "Completed" || session.status === "کامل شده" ? "#22C55E" : "#B9BCC2"
                    }}
                  />
                  <div className="text-xs font-medium text-white/90 group-hover:text-neural-cyan transition-colors truncate">
                    {session.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-titanium/40">
                    <Clock size={10} />
                    {session.date}
                    <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded uppercase">
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}

              <button 
                onClick={() => onNavigate(ActiveView.Workspace)}
                className="flex items-center justify-between text-xs text-neural-cyan hover:text-white transition-colors px-1 mt-1 group"
              >
                <span>{t.restoreLabel}</span>
                <ChevronRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* The Animated AI Orb (Center) */}
            <div className="relative flex items-center justify-center">
              {/* Active Goals orbiting around the Orb */}
              <AnimatePresence>
                {activeGoals.slice(0, 2).map((goal, index) => {
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        y: [0, -10, 0],
                      }}
                      transition={{
                        opacity: { duration: 0.6, delay: 0.6 + index * 0.2 },
                        y: { repeat: Infinity, duration: 6, ease: "easeInOut", delay: index * 3 }
                      }}
                      className={`absolute z-30 hidden lg:flex flex-col p-3 liquid-glass rounded-xl border border-neural-cyan/10 shadow-lg text-left max-w-[190px] pointer-events-auto cursor-pointer ${
                        index === 0 
                          ? "-left-44 top-4" 
                          : "-right-44 bottom-10"
                      }`}
                      onClick={() => onNavigate(ActiveView.Workspace)}
                    >
                      <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-wider text-neural-cyan uppercase">
                        <Activity size={10} className="animate-pulse" />
                        {language === "fa" ? "هدف خودمختار" : "Autonomous Goal"}
                      </div>
                      <div className="text-[11px] font-semibold text-white/90 mt-1 line-clamp-1">
                        {goal.title}
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                        <span className="text-[9px] font-mono text-titanium/50">CONFIDENCE</span>
                        <span className="text-[10px] font-mono text-white font-semibold">{(goal.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-neural-cyan h-full rounded-full" style={{ width: `${goal.progress * 100}%` }} />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Interactive State Circular Rings behind the Orb */}
              <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-white/5 animate-spin" style={{ animationDuration: "120s" }} />
              <div className="absolute w-[400px] h-[400px] rounded-full border border-dotted border-neural-cyan/3 animate-spin" style={{ animationDuration: "180s", animationDirection: "reverse" }} />

              <Orb 
                state={orbState} 
                size={330} 
                onClick={() => {}}
              />
            </div>

            {/* Quick System Metrics (Right) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="hidden md:flex flex-col gap-4 w-64 text-right"
            >
              <div className="text-[10px] font-mono tracking-widest text-titanium/40 uppercase mb-1">
                {t.osTelemetry}
              </div>

              <div className="p-4 liquid-glass rounded-xl border border-white/5 text-left flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-titanium/50 font-mono">{t.telemetryCores}</span>
                  <span className="text-white font-semibold font-mono">{t.telemetryCoresValue}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-titanium/50 font-mono">{t.telemetryNodes}</span>
                  <span className="text-white font-semibold font-mono">{t.telemetryNodesValue}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-titanium/50 font-mono">{t.telemetrySpeed}</span>
                  <span className="text-neural-cyan font-semibold font-mono">{t.telemetrySpeedValue}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-titanium/50 font-mono">{t.telemetrySandbox}</span>
                  <span className="text-emerald-400 font-semibold font-mono flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {t.telemetrySandboxValue}
                  </span>
                </div>
              </div>

              <div 
                className="p-3.5 bg-gradient-to-br from-neural-cyan/10 to-transparent border border-neural-cyan/15 rounded-xl text-left cursor-pointer hover:border-neural-cyan/30 transition-colors"
                onClick={() => onNavigate(ActiveView.Memory)}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-neural-cyan uppercase tracking-wider">
                  <Cpu size={11} />
                  {t.neuroLinkTitle}
                </div>
                <div className="text-[11px] text-white/80 mt-1 line-clamp-2">
                  {t.neuroLinkDesc}
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      )}

      {/* --- BOTTOM CONTEXT INPUT & SUGGESTIONS AREA (Always Sticky) --- */}
      <div className="w-full max-w-3xl mx-auto z-30 mt-4 mb-4">
        
        {/* INTERACTIVE MODE SELECTOR */}
        <div className="flex items-center gap-2 mb-3.5 px-1 overflow-x-auto scrollbar-none">
          {[
            { mode: InteractionMode.Direct, label: t.modeDirect, desc: t.modeDirectDesc, color: "text-neural-cyan hover:bg-neural-cyan/5", activeColor: "bg-neural-cyan/10 border-neural-cyan/40 text-neural-cyan shadow-[0_0_15px_rgba(93,247,255,0.15)]" },
            { mode: InteractionMode.Plan, label: t.modePlan, desc: t.modePlanDesc, color: "text-purple-400 hover:bg-purple-400/5", activeColor: "bg-purple-400/10 border-purple-400/40 text-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.15)]" },
            { mode: InteractionMode.Agent, label: t.modeAgent, desc: t.modeAgentDesc, color: "text-blue-400 hover:bg-blue-400/5", activeColor: "bg-blue-400/10 border-blue-400/40 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]" }
          ].map((item) => {
            const isActive = interactionMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => setInteractionMode(item.mode)}
                className={`flex-1 min-w-[125px] p-2.5 rounded-xl text-left border transition-all duration-300 backdrop-blur-md flex flex-col gap-0.5 cursor-pointer ${
                  isActive 
                    ? item.activeColor 
                    : "bg-white/[0.02] border-white/5 text-titanium/50 hover:border-white/10 hover:bg-white/[0.04]"
                }`}
              >
                <span className="text-[11px] font-bold tracking-wide uppercase select-none">{item.label}</span>
                <span className="text-[9px] text-titanium/40 line-clamp-1 select-none">{item.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Input Textarea Bar */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative bg-[#0F0F0F]/65 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 focus-within:border-neural-cyan/40 focus-within:shadow-[0_0_50px_rgba(93,247,255,0.06)] transition-all duration-300"
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-titanium/60 shrink-0">
              <Terminal size={18} />
            </div>

            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (orbState === OrbState.Idle) {
                  setOrbState(OrbState.Listening);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              className="flex-1 bg-transparent border-none text-white placeholder-titanium/45 focus:outline-none focus:ring-0 text-sm md:text-base font-sans"
              id="home-main-terminal-input"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleVoiceListen}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 border ${
                  isListening 
                    ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" 
                    : "bg-white/5 border-white/5 hover:bg-white/10 text-titanium/80"
                }`}
                title="Acoustic Voice Channel (AI OS)"
              >
                <Mic size={18} />
              </button>

              <button
                type="submit"
                disabled={!prompt.trim()}
                className={`flex items-center gap-1.5 px-4 h-10 rounded-xl font-medium text-xs transition-all duration-300 ${
                  prompt.trim()
                    ? "bg-neural-cyan text-black hover:bg-white font-semibold cursor-pointer shadow-[0_0_15px_rgba(93,247,255,0.35)]"
                    : "bg-white/5 border border-white/5 text-titanium/40 cursor-not-allowed"
                }`}
              >
                <span>{t.synthesizeBtn}</span>
                <Send size={13} className={language === "fa" ? "rotate-180" : ""} />
              </button>
            </div>
          </form>
        </motion.div>

        {/* Suggestion Cards Grid (Only visible when chat has not started to reduce visual clutter) */}
        {!chatStarted && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {suggestions.map((sug, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.08 }}
                onClick={() => {
                  setPrompt(sug.prompt);
                  setOrbState(OrbState.Listening);
                  if (inputRef.current) inputRef.current.focus();
                }}
                className="p-3.5 bg-white/[0.015] hover:bg-white/[0.05] border border-white/5 hover:border-white/10 rounded-xl cursor-pointer text-left transition-all duration-300 group hover:-translate-y-0.5"
              >
                <div className="text-[9px] font-mono tracking-widest text-neural-cyan/70 uppercase select-none">
                  {sug.tag}
                </div>
                <div className="text-[12px] font-semibold text-white/95 mt-1.5 line-clamp-1 group-hover:text-neural-cyan transition-colors">
                  {sug.title}
                </div>
                <div className="text-[10px] text-titanium/45 mt-1 line-clamp-2 leading-relaxed">
                  {sug.desc}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

